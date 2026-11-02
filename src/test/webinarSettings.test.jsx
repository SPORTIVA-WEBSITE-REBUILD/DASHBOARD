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

describe('WebinarSettings: email connection check', () => {
  it('runs the check and shows the plain-language checklist, never the password', async () => {
    api.post.mockResolvedValue({
      success: true,
      data: {
        tcp: [{ port: 465, reachable: true, ms: 120 }, { port: 587, reachable: false, code: 'ETIMEDOUT', ms: 15000 }],
        verify: { ok: true, code: null },
        config: {
          namesPresent: { SMTP_HOST: true, SMTP_PORT: true, SMTP_SECURE: true, SMTP_USER: true, SMTP_PASS: true, MAIL_FROM_NAME: true, MAIL_FROM_ADDRESS: true, MAIL_REPLY_TO: true, EMAIL_DRY_RUN: false },
          required: ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'], missingRequired: [],
          secureRaw: 'true', secureRule: 'SMTP_SECURE="true" → true',
          host: 'smtp.zoho.com', port: 465, secure: true, user: 'contact@pcnsportivalp.com', fromAddress: 'contact@pcnsportivalp.com',
        },
      },
    });
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Check email connection' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Check email connection' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/admin/webinar/smtp-check'));
    expect(await screen.findByText(/Port 465 reachable:/)).toBeInTheDocument();
    expect(screen.getByText(/Yes \(120ms\)/)).toBeInTheDocument();
    expect(screen.getByText(/Port 587 reachable:/).closest('li')).toHaveTextContent('No (ETIMEDOUT, 15000ms)');
    expect(screen.getByText(/smtp\.zoho\.com:465/)).toBeInTheDocument();
    expect(screen.getByText(/working/i)).toBeInTheDocument();
    expect(document.body.innerHTML).not.toMatch(/correct-horse|hunter2/i); // no password text anywhere
  });

  it('the Copy results button writes a plain-text summary to the clipboard', async () => {
    api.post.mockResolvedValue({
      success: true,
      data: {
        tcp: [{ port: 465, reachable: false, code: 'ETIMEDOUT', ms: 15000 }, { port: 587, reachable: false, code: 'ETIMEDOUT', ms: 15000 }],
        verify: { ok: false, code: 'ETIMEDOUT' },
        config: {
          namesPresent: { SMTP_HOST: true, SMTP_PORT: true, SMTP_SECURE: true, SMTP_USER: true, SMTP_PASS: true, MAIL_FROM_NAME: true, MAIL_FROM_ADDRESS: true, MAIL_REPLY_TO: true, EMAIL_DRY_RUN: false },
          required: ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'], missingRequired: [],
          secureRaw: 'true', secureRule: 'SMTP_SECURE="true" → true',
          host: 'smtp.zoho.com', port: 465, secure: true, user: 'contact@pcnsportivalp.com', fromAddress: 'contact@pcnsportivalp.com',
        },
      },
    });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Check email connection' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Check email connection' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Copy results' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const copied = writeText.mock.calls[0][0];
    expect(copied).toContain('Port 465 reachable: no');
    expect(copied).toContain('network block');
    expect(copied).not.toMatch(/correct-horse|hunter2/i);
  });
});
