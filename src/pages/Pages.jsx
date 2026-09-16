import { Link } from 'react-router-dom';
import ResourceList from '../components/ResourceList.jsx';
import { StatusBadge, formatDate } from '../components/ui.jsx';

export default function Pages() {
  return (
    <ResourceList
      resource="pages"
      title="Pages"
      singular="Page"
      emptyMessage="Pages hold the fixed content of the site — the home page, About, Contact and the privacy policy."
      columns={[
        { key: 'title', label: 'Page', render: (p) => <Link to={`/pages/${p._id}`}>{p.title}</Link> },
        { key: 'slug', label: 'URL', render: (p) => <span className="muted">/{p.slug === 'home' ? '' : p.slug}</span> },
        { key: 'status', label: 'Status', width: '110px', render: (p) => <StatusBadge status={p.status} /> },
        { key: 'updatedAt', label: 'Updated', width: '120px', render: (p) => <span className="muted">{formatDate(p.updatedAt)}</span> },
      ]}
    />
  );
}
