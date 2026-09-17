import { Link } from 'react-router-dom';
import ResourceList from '../components/ResourceList.jsx';
import { StatusBadge } from '../components/ui.jsx';
import { thumb } from '../lib/upload.js';

export default function Testimonials() {
  return (
    <ResourceList
      resource="testimonials"
      title="Testimonials"
      singular="Testimonial"
      newLabel="Add testimonial"
      emptyMessage="Published testimonials appear in the testimonial carousel on the home and about pages."
      columns={[
        {
          key: 'photo',
          label: '',
          width: '60px',
          render: (t) => (t.photo?.secureUrl
            ? <img src={thumb(t.photo, 80, 80)} alt="" width="40" height="40" style={{ objectFit: 'cover', borderRadius: '50%', display: 'block' }} />
            : <span className="muted">—</span>),
        },
        {
          key: 'name',
          label: 'Name',
          render: (t) => (
            <>
              <Link to={`/testimonials/${t._id}`}>{t.name}</Link>
              {t.position && <div className="muted">{t.position}</div>}
            </>
          ),
        },
        { key: 'quote', label: 'Quote', render: (t) => <span className="muted">{t.quote.length > 110 ? `${t.quote.slice(0, 110)}…` : t.quote}</span> },
        { key: 'order', label: 'Order', width: '80px' },
        { key: 'status', label: 'Status', width: '110px', render: (t) => <StatusBadge status={t.status} /> },
      ]}
    />
  );
}
