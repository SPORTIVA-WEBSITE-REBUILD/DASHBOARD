import { Link } from 'react-router-dom';
import ResourceList from '../components/ResourceList.jsx';
import { StatusBadge, formatDate } from '../components/ui.jsx';

export default function Articles() {
  return (
    <ResourceList
      resource="articles"
      title="Insights"
      singular="Article"
      newLabel="New article"
      emptyMessage="Publish commentary and analysis here. Articles appear on the public Insights page."
      columns={[
        { key: 'title', label: 'Title', render: (a) => <Link to={`/articles/${a._id}`}>{a.title}</Link> },
        { key: 'author', label: 'Author', width: '160px', render: (a) => a.author?.name || <span className="muted">—</span> },
        { key: 'category', label: 'Category', width: '140px', render: (a) => a.category?.name || <span className="muted">—</span> },
        { key: 'status', label: 'Status', width: '110px', render: (a) => <StatusBadge status={a.status} /> },
        { key: 'publishedAt', label: 'Published', width: '120px', render: (a) => <span className="muted">{formatDate(a.publishedAt)}</span> },
      ]}
    />
  );
}
