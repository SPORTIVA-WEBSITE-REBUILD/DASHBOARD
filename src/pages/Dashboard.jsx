import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { PageHeader } from '../layout/Shell.jsx';
import { ErrorState, StatusBadge, formatDate } from '../components/ui.jsx';
import { useAuth } from '../lib/auth.jsx';

function Stat({ value, label, to }) {
  const body = (
    <div className="stat">
      <div className="stat__value">{value ?? '—'}</div>
      <div className="stat__label">{label}</div>
    </div>
  );
  return to ? <Link to={to} style={{ color: 'inherit' }}>{body}</Link> : body;
}

export default function Dashboard() {
  const { admin } = useAuth();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['stats'],
    // One aggregated call rather than a query per card.
    queryFn: () => api.get('/stats').then((r) => r.data),
  });

  const c = data?.counts || {};

  return (
    <>
      <PageHeader title={`Welcome back, ${admin?.name?.split(' ')[0] || ''}`} />
      <div className="content">
        {isError && <ErrorState error={error} onRetry={refetch} />}

        <div className="grid grid--stats mb-2">
          <Stat value={isLoading ? '…' : c.cases} label="Published cases" to="/cases" />
          <Stat value={isLoading ? '…' : c.casesDraft} label="Draft cases" to="/cases" />
          <Stat value={isLoading ? '…' : c.articles} label="Published articles" to="/articles" />
          <Stat value={isLoading ? '…' : c.articlesDraft} label="Draft articles" to="/articles" />
          <Stat value={isLoading ? '…' : c.services} label="Services" to="/services" />
          <Stat value={isLoading ? '…' : c.lawyers} label="Team members" to="/lawyers" />
          <Stat value={isLoading ? '…' : c.media} label="Media files" to="/media" />
          <Stat value={isLoading ? '…' : c.galleryPublished} label="Gallery images" to="/gallery" />
          <Stat value={isLoading ? '…' : c.vacanciesOpen} label="Open roles" to="/vacancies" />
          <Stat value={isLoading ? '…' : c.enquiriesNew} label="New enquiries" to="/enquiries" />
          <Stat value={isLoading ? '…' : c.commentsPending} label="Comments awaiting approval" to="/comments" />
          <Stat value={isLoading ? '…' : c.testimonials} label="Testimonials" to="/testimonials" />
          <Stat value={isLoading ? '…' : c.subscribers} label="Newsletter subscribers" to="/subscribers" />
        </div>

        <div className="grid grid--2">
          <div className="card">
            <div className="card__header">
              <h2>Recent enquiries</h2>
              <Link className="btn btn--sm spacer" to="/enquiries">View all</Link>
            </div>
            {data?.recentEnquiries?.length ? (
              <div className="table-wrap">
                <table className="data">
                  <tbody>
                    {data.recentEnquiries.map((e) => (
                      <tr key={e._id}>
                        <td>
                          <Link to={`/enquiries/${e._id}`}>{e.name}</Link>
                          <div className="muted">{e.subject || e.email}</div>
                        </td>
                        <td><StatusBadge status={e.status} /></td>
                        <td className="muted">{formatDate(e.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="muted">No enquiries yet.</p>}
          </div>

          <div className="card">
            <div className="card__header">
              <h2>Recently edited articles</h2>
              <Link className="btn btn--sm spacer" to="/articles">View all</Link>
            </div>
            {data?.recentArticles?.length ? (
              <div className="table-wrap">
                <table className="data">
                  <tbody>
                    {data.recentArticles.map((a) => (
                      <tr key={a._id}>
                        <td><Link to={`/articles/${a._id}`}>{a.title}</Link></td>
                        <td><StatusBadge status={a.status} /></td>
                        <td className="muted">{formatDate(a.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="muted">No articles yet.</p>}
          </div>
        </div>
      </div>
    </>
  );
}
