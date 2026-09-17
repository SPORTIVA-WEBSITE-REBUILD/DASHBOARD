import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../components/ui.jsx';
import Comments from '../pages/Comments.jsx';
import Subscribers from '../pages/Subscribers.jsx';
import { api } from '../lib/api.js';

vi.mock('../lib/api.js', async () => {
  const actual = await vi.importActual('../lib/api.js');
  return {
    qs: actual.qs,
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), del: vi.fn(), download: vi.fn() },
  };
});

let permissions = new Set();
vi.mock('../lib/auth.jsx', () => ({ useAuth: () => ({ can: (p) => permissions.has(p) }) }));

function renderScreen(Screen) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter><Screen /></MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

const meta = { page: 1, pages: 1, total: 1, limit: 20 };

beforeEach(() => {
  vi.clearAllMocks();
  permissions = new Set(['comments:read', 'comments:update', 'comments:delete', 'subscribers:read', 'subscribers:update', 'subscribers:delete']);
  api.patch.mockResolvedValue({ success: true, data: {} });
});

describe('comment moderation', () => {
  const pending = {
    _id: 'c1', name: 'Ada', email: 'ada@example.com', message: 'Helpful piece.', status: 'pending',
    createdAt: '2026-09-01T00:00:00Z', article: { _id: 'a1', title: 'Transfer windows', slug: 'transfer-windows' },
  };

  it('opens on the comments awaiting approval', async () => {
    api.get.mockResolvedValue({ success: true, data: [pending], meta });
    renderScreen(Comments);
    expect(await screen.findByText('Helpful piece.')).toBeInTheDocument();
    expect(api.get.mock.calls[0][0]).toContain('status=pending');
  });

  it('approves a comment', async () => {
    api.get.mockResolvedValue({ success: true, data: [pending], meta });
    renderScreen(Comments);
    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/comments/c1/status', { status: 'approved' }));
  });

  it('asks before deleting, and warns that replies go too', async () => {
    api.get.mockResolvedValue({ success: true, data: [pending], meta });
    api.del.mockResolvedValue({ success: true, data: null });
    renderScreen(Comments);
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(screen.getByText(/any replies to it/)).toBeInTheDocument();
    expect(api.del).not.toHaveBeenCalled();
  });

  it('hides moderation buttons from someone who may only read', async () => {
    permissions = new Set(['comments:read']);
    api.get.mockResolvedValue({ success: true, data: [pending], meta });
    renderScreen(Comments);
    await screen.findByText('Helpful piece.');
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });
});

describe('newsletter subscribers', () => {
  const subscriber = { _id: 's1', email: 'fan@example.com', status: 'subscribed', createdAt: '2026-09-01T00:00:00Z' };

  it('exports the filtered list as CSV', async () => {
    api.get.mockResolvedValue({ success: true, data: [subscriber], meta });
    api.download.mockResolvedValue(true);
    renderScreen(Subscribers);
    await screen.findByText('fan@example.com');

    fireEvent.change(screen.getByLabelText('Filter by status'), { target: { value: 'subscribed' } });
    fireEvent.click(screen.getByRole('button', { name: /Export CSV/ }));
    await waitFor(() => expect(api.download).toHaveBeenCalledWith('/subscribers/export?status=subscribed', 'subscribers.csv'));
  });

  it('unsubscribes without deleting the record', async () => {
    api.get.mockResolvedValue({ success: true, data: [subscriber], meta });
    renderScreen(Subscribers);
    fireEvent.click(await screen.findByRole('button', { name: 'Unsubscribe' }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/subscribers/s1/status', { status: 'unsubscribed' }));
    expect(api.del).not.toHaveBeenCalled();
  });
});
