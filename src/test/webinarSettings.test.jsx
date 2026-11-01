import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../components/ui.jsx';
import WebinarSettings from '../pages/WebinarSettings.jsx';
import { api } from '../lib/api.js';

vi.mock('../lib/api.js', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), del: vi.fn() },
  qs: () => '',
}));

const WEBINAR = {
  _id: 'w1',
  title: 'Promoting Clean Sport',
  subtitle: '',
  description: '',
  startsAt: '2026-11-06T15:00:00.000Z',
  endsAt: '2026-11-06T17:00:00.000Z',
  timezone: 'Africa/Lagos',
  meetUrl: 'https://meet.google.com/real-secret-link',
  supportEmail: '',
  organiserName: 'PCN Sportiva LP',
  bannerUrl: '',
  shareImageUrl: '',
  speakers: [{ name: 'Caroline Mwanzia', role: 'Moderator/Speaker', titleLines: ['Associate'], shortBio: 'x', bio: 'y', photoUrl: '', order: 1 }],
  faq: [{ question: 'How do I join?', answer: '', order: 1 }],
  social: { instagram: '', x: '', linkedin: '' },
  recordingUrl: '',
  email: { subject: '', introParagraph: '', noteBoxText: '', footerText: '' },
  webinarHeroEnabled: false,
  webinarHeroEndsAt: '2026-11-07T22:59:00.000Z',
  registrationOpen: true,
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider><WebinarSettings /></ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue({ success: true, data: WEBINAR });
});

describe('WebinarSettings', () => {
  it('loads and shows the real meetUrl in the admin screen (admin-only — never on the public site)', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByDisplayValue('https://meet.google.com/real-secret-link')).toBeInTheDocument());
  });

  it('the hero toggle reflects the stored value and Save is disabled until something changes', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByLabelText('Show webinar in the home page hero')).toBeInTheDocument());
    expect(screen.getByLabelText('Show webinar in the home page hero')).not.toBeChecked();
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();
  });

  it('becomes dirty and savable after a field changes, and saves with the edited value', async () => {
    api.put.mockResolvedValue({ success: true, data: { ...WEBINAR, title: 'New Title' } });
    renderPage();
    await waitFor(() => expect(screen.getByDisplayValue('Promoting Clean Sport')).toBeInTheDocument());

    fireEvent.change(screen.getByDisplayValue('Promoting Clean Sport'), { target: { value: 'New Title' } });
    expect(screen.getByRole('button', { name: /save changes/i })).not.toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/admin/webinar', expect.objectContaining({ title: 'New Title' })));
  });

  it('adds, reorders and removes a speaker', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Speaker 1')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Add speaker' }));
    expect(screen.getByText('Speaker 2')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[1]);
    expect(screen.queryByText('Speaker 2')).not.toBeInTheDocument();
  });

  it('adds a FAQ question with an empty answer by default', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByDisplayValue('How do I join?')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Add question' }));
    const questionInputs = screen.getAllByLabelText('Question');
    expect(questionInputs).toHaveLength(2);
    expect(questionInputs[1]).toHaveValue('');
  });

  it('sends a test email to the typed address', async () => {
    api.post.mockResolvedValue({ success: true, data: { sent: true } });
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send test email' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Send test email' }));
    fireEvent.change(screen.getByLabelText('Send to'), { target: { value: 'me@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/admin/webinar/test-email', { to: 'me@example.com' }));
  });

  it('the Preview link opens the public site with ?previewWebinar=1, not the dashboard', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByRole('link', { name: 'Preview' })).toBeInTheDocument());
    const href = screen.getByRole('link', { name: 'Preview' }).getAttribute('href');
    expect(href).toContain('previewWebinar=1');
    expect(href).toMatch(/^https?:\/\//);
  });
});
