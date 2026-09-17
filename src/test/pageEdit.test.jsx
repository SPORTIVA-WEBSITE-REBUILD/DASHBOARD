import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../components/ui.jsx';
import PageEdit from '../pages/PageEdit.jsx';
import { api } from '../lib/api.js';

vi.mock('../lib/api.js', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), del: vi.fn() },
  qs: () => '',
}));

const BLUEPRINTS = [{
  slug: 'about',
  title: 'About',
  sections: [
    {
      key: 'hero',
      label: 'Page banner',
      fields: { heading: 'Banner title' },
    },
    {
      key: 'intro',
      label: 'Introduction',
      fields: {
        heading: 'Heading',
        video: 'Video link',
        items: { label: 'Tabs', singular: 'Tab', max: 2, fields: { title: 'Tab name', text: { label: 'Tab text', type: 'textarea' } } },
      },
    },
    {
      key: 'form',
      label: 'Contact form',
      fields: {
        cta: { label: 'Submit button', labelOnly: true, default: { label: 'Send Message' } },
        labels: {
          label: 'Form text',
          keys: {
            name: { label: 'Name placeholder', default: 'Your Name' },
            email: { label: 'Email placeholder', default: 'Your Email' },
          },
        },
      },
    },
  ],
}];

function mockPage(page) {
  api.get.mockImplementation((path) => Promise.resolve({
    success: true,
    data: path === '/pages/blueprints' ? BLUEPRINTS : page,
  }));
}

function renderEditor() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/pages/p1']}>
          <Routes><Route path="/pages/:id" element={<PageEdit />} /></Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

const card = (title) => screen.getByRole('heading', { name: title }).closest('.card');

beforeEach(() => {
  vi.clearAllMocks();
  api.patch.mockResolvedValue({ success: true, data: {} });
});

describe('page editor built from blueprints', () => {
  it('shows every blueprint section, even ones the stored page lacks', async () => {
    mockPage({ _id: 'p1', slug: 'about', title: 'About', status: 'published', sections: [{ key: 'intro', heading: 'Who we are' }] });
    renderEditor();

    expect(await screen.findByRole('heading', { name: 'Page banner' })).toBeInTheDocument();
    expect(screen.getByLabelText('Banner title')).toHaveValue('');
    expect(screen.getByLabelText('Heading')).toHaveValue('Who we are');
    // Opening a page must not count as a change.
    expect(screen.getByRole('button', { name: /Save changes/ })).toBeDisabled();
  });

  it('shows only the fields a section uses, with its own labels', async () => {
    mockPage({ _id: 'p1', slug: 'about', title: 'About', sections: [] });
    renderEditor();

    const banner = await screen.findByRole('heading', { name: 'Page banner' });
    const bannerCard = within(banner.closest('.card'));
    expect(bannerCard.queryByLabelText('Subheading')).not.toBeInTheDocument();
    expect(bannerCard.queryByText('Image')).not.toBeInTheDocument();

    // A label-only button has no link input.
    const form = within(card('Contact form'));
    expect(form.getByLabelText('Submit button label')).toBeInTheDocument();
    expect(form.queryByLabelText('Submit button link')).not.toBeInTheDocument();
  });

  it('adds, reorders and removes items, up to the maximum', async () => {
    mockPage({ _id: 'p1', slug: 'about', title: 'About', sections: [] });
    renderEditor();
    await screen.findByRole('heading', { name: 'Introduction' });

    const intro = within(card('Introduction'));
    fireEvent.click(intro.getByRole('button', { name: 'Add tab' }));
    fireEvent.click(intro.getByRole('button', { name: 'Add tab' }));
    expect(intro.getByRole('button', { name: 'Add tab' })).toBeDisabled();

    const names = () => intro.getAllByLabelText('Tab name');
    fireEvent.change(names()[0], { target: { value: 'Mission' } });
    fireEvent.change(names()[1], { target: { value: 'Vision' } });

    fireEvent.click(intro.getByRole('button', { name: 'Move tab 2 up' }));
    expect(names().map((n) => n.value)).toEqual(['Vision', 'Mission']);

    fireEvent.click(intro.getAllByRole('button', { name: 'Remove' })[0]);
    expect(names().map((n) => n.value)).toEqual(['Mission']);
  });

  it('saves a newly filled section with its items and status', async () => {
    mockPage({ _id: 'p1', slug: 'about', title: 'About', status: 'draft', sections: [] });
    renderEditor();
    await screen.findByRole('heading', { name: 'Introduction' });

    fireEvent.change(screen.getByLabelText('Banner title'), { target: { value: 'About us' } });
    const intro = within(card('Introduction'));
    fireEvent.change(intro.getByLabelText('Video link'), { target: { value: 'https://vimeo.com/1' } });
    fireEvent.click(intro.getByRole('button', { name: 'Add tab' }));
    fireEvent.change(intro.getByLabelText('Tab name'), { target: { value: 'Mission' } });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'published' } });

    fireEvent.click(screen.getByRole('button', { name: /Save changes/ }));

    await waitFor(() => expect(api.patch).toHaveBeenCalled());
    const [path, payload] = api.patch.mock.calls[0];
    expect(path).toBe('/pages/p1');
    expect(payload.status).toBe('published');
    expect(payload.sections.find((s) => s.key === 'hero').heading).toBe('About us');
    const saved = payload.sections.find((s) => s.key === 'intro');
    expect(saved.video).toBe('https://vimeo.com/1');
    expect(saved.items).toEqual([{ title: 'Mission', text: '', icon: '', value: '', href: '', image: undefined }]);
  });

  it('shows template wording as placeholders and saves only the text typed over it', async () => {
    mockPage({ _id: 'p1', slug: 'about', title: 'About', sections: [{ key: 'form', labels: { email: 'Old email text' } }] });
    renderEditor();
    await screen.findByRole('heading', { name: 'Contact form' });

    const form = within(card('Contact form'));
    expect(form.getByLabelText('Submit button label')).toHaveAttribute('placeholder', 'Send Message');
    const name = form.getByLabelText('Name placeholder');
    expect(name).toHaveValue('');
    expect(name).toHaveAttribute('placeholder', 'Your Name');
    expect(form.getByLabelText('Email placeholder')).toHaveValue('Old email text');

    fireEvent.change(name, { target: { value: 'Full name' } });
    // Clearing a label hands it back to the template default.
    fireEvent.change(form.getByLabelText('Email placeholder'), { target: { value: '  ' } });
    fireEvent.click(screen.getByRole('button', { name: /Save changes/ }));

    await waitFor(() => expect(api.patch).toHaveBeenCalled());
    const saved = api.patch.mock.calls[0][1].sections.find((s) => s.key === 'form');
    expect(saved.labels).toEqual({ name: 'Full name' });
  });

  it('lists sections the website no longer uses separately, and lets them be removed', async () => {
    mockPage({ _id: 'p1', slug: 'about', title: 'About', sections: [{ key: 'legacy', heading: 'Old' }] });
    renderEditor();

    expect(await screen.findByRole('heading', { name: 'Unused sections' })).toBeInTheDocument();
    fireEvent.click(within(card('legacy')).getByRole('button', { name: 'Remove section' }));
    expect(screen.queryByRole('heading', { name: 'legacy' })).not.toBeInTheDocument();
  });

  it('lets a page without a blueprint add its own sections', async () => {
    mockPage({ _id: 'p1', slug: 'terms', title: 'Terms', sections: [] });
    renderEditor();

    fireEvent.change(await screen.findByLabelText('New section key'), { target: { value: 'body' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add section' }));
    expect(screen.getByRole('heading', { name: 'body' })).toBeInTheDocument();
  });
});
