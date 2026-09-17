import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';

const NAV = [
  { section: 'Content' },
  { to: '/', label: 'Dashboard', end: true, permission: null },
  { to: '/pages', label: 'Pages', permission: 'pages:read' },
  { to: '/cases', label: 'Case Record', permission: 'cases:read' },
  { to: '/articles', label: 'Insights', permission: 'articles:read' },
  { to: '/services', label: 'Services', permission: 'services:read' },
  { to: '/lawyers', label: 'Team', permission: 'lawyers:read' },
  { to: '/gallery', label: 'Gallery', permission: 'gallery:read' },
  { to: '/testimonials', label: 'Testimonials', permission: 'testimonials:read' },
  { to: '/vacancies', label: 'Careers', permission: 'vacancies:read' },
  { to: '/categories', label: 'Categories', permission: 'categories:read' },

  { section: 'Site' },
  { to: '/media', label: 'Media', permission: 'media:read' },
  { to: '/enquiries', label: 'Enquiries', permission: 'enquiries:read' },
  { to: '/comments', label: 'Comments', permission: 'comments:read' },
  { to: '/subscribers', label: 'Subscribers', permission: 'subscribers:read' },
  { to: '/settings', label: 'Site Settings', permission: 'settings:read' },
  { to: '/navigation', label: 'Navigation', permission: 'navigation:read' },

  { section: 'Account' },
  { to: '/administrators', label: 'Administrators', superAdmin: true },
  { to: '/profile', label: 'My Profile', permission: null },
];

export default function Shell() {
  const { admin, can, isSuperAdmin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const visible = NAV.filter((item) => {
    if (item.section) return true;
    if (item.superAdmin) return isSuperAdmin;
    if (!item.permission) return true;
    return can(item.permission);
  // Drop a section heading whose items were all filtered out by permissions.
  }).filter((item, i, arr) => !item.section || arr[i + 1]?.section === undefined);

  return (
    <div className="app">
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar__brand">
          PCN Sportiva
          <small>Content management</small>
        </div>

        <ul className="sidebar__nav">
          {visible.map((item, i) => (
            item.section
              ? <li className="sidebar__section" key={`s-${item.section}-${i}`}>{item.section}</li>
              : (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) => (isActive ? 'active' : undefined)}
                  >
                    {item.label}
                  </NavLink>
                </li>
              )
          ))}
        </ul>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            {admin?.name}
            <small>{admin?.role.replace('_', ' ')}</small>
          </div>
          <button
            type="button"
            className="btn btn--sm mt-1"
            onClick={async () => { await logout(); navigate('/login'); }}
          >
            Sign out
          </button>
        </div>
      </aside>

      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} />}

      <div className="main">
        <Outlet context={{ openMenu: () => setOpen(true) }} />
      </div>
    </div>
  );
}

/** Every screen's header, so titles and action placement stay consistent. */
export function PageHeader({ title, actions }) {
  return (
    <div className="topbar">
      <button type="button" className="menu-toggle" aria-label="Open menu" onClick={() => {
        document.querySelector('.sidebar')?.classList.add('open');
      }}>☰</button>
      <h1>{title}</h1>
      {actions && <div className="topbar__actions">{actions}</div>}
    </div>
  );
}
