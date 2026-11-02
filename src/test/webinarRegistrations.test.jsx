import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../components/ui.jsx';
import WebinarRegistrations from '../pages/WebinarRegistrations.jsx';
import { api } from '../lib/api.js';

let lastQsArgs;
vi.mock('../lib/api.js', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), del: vi.fn(), download: vi.fn() },
  qs: (args) => { lastQsArgs = args; return ''; },
}));

const LIST = {
  success: true,
  data: [
    {
      _id: 'r1', name: 'Jane Doe', email: 'jane@example.test', createdAt: '2026-10-01T00:00:00Z',
      emailStatus: 'SENT', role: 'Lawyer', nationality: 'Nigeria', phone: '+2348012345678',
    },
    {
      _id: 'r2', name: 'Failed Fella', email: 'fail@example.test', createdAt: '2026-10-02T00:00:00Z',
      emailStatus: 'FAILED', emailError: '535 Auth failed', role: 'Other', roleOther: 'Event organiser', nationality: 'Kenya',
    },
  ],
  meta: { page: 1, limit: 20, total: 2, pages: 1, counts: { total: 2, sent: 1, failed: 1, pending: 0 } },
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider><WebinarRegistrations /></ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue(LIST);
});

describe('WebinarRegistrations', () => {
  it('shows the counts and the table rows, including the stored error for a failed send', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());
    expect(screen.getByText('Failed Fella')).toBeInTheDocument();
    expect(screen.getByText('535 Auth failed')).toBeInTheDocument();
    // counts row
    expect(screen.getAllByText('2').length).toBeGreaterThan(0); // total
  });

  it('Export CSV calls api.download with the right path and filename', async () => {
    api.download.mockResolvedValue(true);
    renderPage();
    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(api.download).toHaveBeenCalledWith('/admin/webinar/registrations.csv', 'webinar-registrations.csv');
  });

  it('resending one registration calls the per-row resend endpoint', async () => {
    api.post.mockResolvedValue({ success: true, data: {} });
    renderPage();
    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole('button', { name: 'Resend' })[0]);
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/admin/webinar/registrations/r1/resend'));
  });

  it('"Resend failed" shows a confirm dialog with the failed count before sending', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/Resend failed \(1\)/)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Resend failed \(1\)/));
    expect(await screen.findByText(/Resend to everyone with a failed email/i)).toBeInTheDocument();
    expect(screen.getByText(/1 registration\(s\) currently marked Failed/)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled(); // not sent until confirmed
  });

  it('"Resend failed" only actually sends after the dialog is confirmed', async () => {
    api.post.mockResolvedValue({ success: true, data: { sent: 1, attempted: 1 } });
    renderPage();
    await waitFor(() => expect(screen.getByText(/Resend failed \(1\)/)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Resend failed \(1\)/));
    fireEvent.click(await screen.findByRole('button', { name: 'Send' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/admin/webinar/resend-failed'));
  });

  it('a reminder button dry-runs first for the recipient count, then only sends for real after confirming', async () => {
    api.post.mockResolvedValueOnce({ success: true, data: { dryRun: true, recipientCount: 3 } });
    renderPage();
    await waitFor(() => expect(screen.getByText('Send reminder: day before')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Send reminder: day before'));
    expect(await screen.findByText(/Send the day-before reminder/i)).toBeInTheDocument();
    expect(screen.getByText(/email 3 registration/)).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/admin/webinar/send-reminder', { type: 'day', dryRun: true });

    api.post.mockResolvedValueOnce({ success: true, data: { dryRun: false, recipientCount: 3, sent: 3 } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/admin/webinar/send-reminder', { type: 'day', dryRun: false }));
  });

  it('filters by status', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Failed' }));
    await waitFor(() => expect(api.get).toHaveBeenLastCalledWith(expect.stringContaining('/admin/webinar/registrations')));
  });

  it('shows Role, Nationality and Phone columns, with the "Other" role expanded', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());
    const row = screen.getByText('Jane Doe').closest('tr');
    expect(within(row).getByText('Lawyer')).toBeInTheDocument();
    expect(within(row).getByText('Nigeria')).toBeInTheDocument();
    expect(within(row).getByText('+2348012345678')).toBeInTheDocument();
    expect(screen.getByText('Other (Event organiser)')).toBeInTheDocument();
    expect(screen.getByText('Kenya')).toBeInTheDocument();
  });

  it('filters by role and includes it in the registrations query', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Filter by role'), { target: { value: 'Lawyer' } });
    await waitFor(() => expect(lastQsArgs).toMatchObject({ role: 'Lawyer' }));
  });

  it('filters by nationality and includes it in the registrations query', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Filter by nationality'), { target: { value: 'Kenya' } });
    await waitFor(() => expect(lastQsArgs).toMatchObject({ nationality: 'Kenya' }));
  });
});
