import { Link } from 'react-router-dom';
import ResourceList from '../components/ResourceList.jsx';
import { StatusBadge, formatDate } from '../components/ui.jsx';
import { thumb } from '../lib/upload.js';

export default function Gallery() {
  return (
    <ResourceList
      resource="gallery"
      title="Gallery"
      singular="Image"
      newLabel="Add image"
      emptyMessage="Gallery images appear in the gallery section on the home page."
      columns={[
        {
          key: 'image',
          label: '',
          width: '90px',
          // A gallery listing of text rows would be close to useless.
          render: (g) => (g.image?.secureUrl
            ? <img src={thumb(g.image, 140, 100)} alt={g.image.alt || ''} width="70" height="50" style={{ objectFit: 'cover', borderRadius: 3, display: 'block' }} />
            : <span className="muted">—</span>),
        },
        { key: 'title', label: 'Title', render: (g) => <Link to={`/gallery/${g._id}`}>{g.title}</Link> },
        { key: 'description', label: 'Description', render: (g) => <span className="muted">{g.description || '—'}</span> },
        { key: 'location', label: 'Location', width: '140px', render: (g) => g.location || <span className="muted">—</span> },
        { key: 'takenAt', label: 'Taken', width: '120px', render: (g) => <span className="muted">{g.takenAt ? formatDate(g.takenAt) : '—'}</span> },
        { key: 'order', label: 'Order', width: '80px' },
        { key: 'status', label: 'Status', width: '110px', render: (g) => <StatusBadge status={g.status} /> },
      ]}
    />
  );
}
