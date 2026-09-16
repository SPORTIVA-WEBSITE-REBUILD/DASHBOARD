import { Link } from 'react-router-dom';
import ResourceList from '../components/ResourceList.jsx';
import { StatusBadge } from '../components/ui.jsx';

export default function Services() {
  return (
    <ResourceList
      resource="services"
      title="Services"
      singular="Service"
      emptyMessage="Services are the firm's practice areas, shown on the home page and the Services page."
      columns={[
        { key: 'title', label: 'Service', render: (s) => <Link to={`/services/${s._id}`}>{s.title}</Link> },
        { key: 'summary', label: 'Summary', render: (s) => <span className="muted">{s.summary || '—'}</span> },
        { key: 'order', label: 'Order', width: '80px' },
        { key: 'status', label: 'Status', width: '110px', render: (s) => <StatusBadge status={s.status} /> },
      ]}
    />
  );
}
