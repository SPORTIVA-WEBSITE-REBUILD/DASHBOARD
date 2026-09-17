import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Shell, { PageHeader } from '../layout/Shell.jsx';

vi.mock('../lib/auth.jsx', () => ({
  useAuth: () => ({ admin: { name: 'Ada', role: 'super_admin' }, can: () => true, isSuperAdmin: true, logout: vi.fn() }),
}));

function renderShell() {
  return render(
    <MemoryRouter initialEntries={['/pages']}>
      <Routes>
        <Route element={<Shell />}>
          <Route path="pages" element={<PageHeader title="Pages" />} />
          <Route path="cases" element={<PageHeader title="Cases" />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

const sidebar = () => document.getElementById('dashboard-sidebar');
const openMenu = () => fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));

describe('mobile sidebar', () => {
  it('opens from the header menu button', () => {
    renderShell();
    openMenu();
    expect(sidebar()).toHaveClass('open');
  });

  it('closes from the header button, the close button, the backdrop and Escape', () => {
    const { container } = renderShell();

    openMenu();
    fireEvent.click(screen.getAllByRole('button', { name: 'Close menu' }).find((b) => b.classList.contains('menu-toggle')));
    expect(sidebar()).not.toHaveClass('open');

    openMenu();
    fireEvent.click(container.querySelector('.sidebar__close'));
    expect(sidebar()).not.toHaveClass('open');

    openMenu();
    fireEvent.click(container.querySelector('.sidebar-backdrop'));
    expect(sidebar()).not.toHaveClass('open');
    expect(container.querySelector('.sidebar-backdrop')).toBeNull();

    openMenu();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(sidebar()).not.toHaveClass('open');
  });

  it('closes when a menu link is followed', () => {
    renderShell();
    openMenu();
    fireEvent.click(screen.getByRole('link', { name: 'Case Record' }));
    expect(screen.getByRole('heading', { name: 'Cases' })).toBeInTheDocument();
    expect(sidebar()).not.toHaveClass('open');
  });
});
