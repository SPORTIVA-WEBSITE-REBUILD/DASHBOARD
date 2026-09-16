import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import Shell from './layout/Shell.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import { Spinner } from './components/ui.jsx';

// The editor-bearing screens are the heavy ones, so every screen past the
// dashboard is split out and fetched when first visited.
const Pages = lazy(() => import('./pages/Pages.jsx'));
const PageEdit = lazy(() => import('./pages/PageEdit.jsx'));
const Cases = lazy(() => import('./pages/Cases.jsx'));
const CaseEdit = lazy(() => import('./pages/CaseEdit.jsx'));
const Articles = lazy(() => import('./pages/Articles.jsx'));
const ArticleEdit = lazy(() => import('./pages/ArticleEdit.jsx'));
const Services = lazy(() => import('./pages/Services.jsx'));
const ServiceEdit = lazy(() => import('./pages/ServiceEdit.jsx'));
const Gallery = lazy(() => import('./pages/Gallery.jsx'));
const GalleryEdit = lazy(() => import('./pages/GalleryEdit.jsx'));
const Vacancies = lazy(() => import('./pages/Vacancies.jsx'));
const VacancyEdit = lazy(() => import('./pages/VacancyEdit.jsx'));
const Lawyers = lazy(() => import('./pages/Lawyers.jsx'));
const LawyerEdit = lazy(() => import('./pages/LawyerEdit.jsx'));
const Categories = lazy(() => import('./pages/Categories.jsx'));
const Media = lazy(() => import('./pages/Media.jsx'));
const Enquiries = lazy(() => import('./pages/Enquiries.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const Navigation = lazy(() => import('./pages/Navigation.jsx'));
const Administrators = lazy(() => import('./pages/Administrators.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));

function RequireAuth({ children }) {
  const { admin, loading } = useAuth();
  const location = useLocation();

  // Wait for the session check before deciding: redirecting first would bounce
  // an administrator to the login screen on every page refresh.
  if (loading) {
    return <div className="state"><Spinner /> Loading…</div>;
  }
  if (!admin) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

/** Guards a route the API also guards; this only avoids a pointless 403 screen. */
function RequireSuperAdmin({ children }) {
  const { isSuperAdmin } = useAuth();
  if (!isSuperAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<RequireAuth><Shell /></RequireAuth>}>
        <Route
          element={(
            <Suspense fallback={<div className="state"><Spinner /> Loading…</div>}>
              <Outlet />
            </Suspense>
          )}
        >
          <Route index element={<Dashboard />} />

          <Route path="pages" element={<Pages />} />
          <Route path="pages/:id" element={<PageEdit />} />

          <Route path="cases" element={<Cases />} />
          <Route path="cases/:id" element={<CaseEdit />} />

          <Route path="articles" element={<Articles />} />
          <Route path="articles/:id" element={<ArticleEdit />} />

          <Route path="services" element={<Services />} />
          <Route path="services/:id" element={<ServiceEdit />} />

          <Route path="gallery" element={<Gallery />} />
          <Route path="gallery/:id" element={<GalleryEdit />} />

          <Route path="vacancies" element={<Vacancies />} />
          <Route path="vacancies/:id" element={<VacancyEdit />} />

          <Route path="lawyers" element={<Lawyers />} />
          <Route path="lawyers/:id" element={<LawyerEdit />} />

          <Route path="categories" element={<Categories />} />
          <Route path="media" element={<Media />} />
          <Route path="enquiries" element={<Enquiries />} />
          <Route path="enquiries/:id" element={<Enquiries />} />
          <Route path="settings" element={<Settings />} />
          <Route path="navigation" element={<Navigation />} />
          <Route path="profile" element={<Profile />} />

          <Route
            path="administrators"
            element={<RequireSuperAdmin><Administrators /></RequireSuperAdmin>}
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
