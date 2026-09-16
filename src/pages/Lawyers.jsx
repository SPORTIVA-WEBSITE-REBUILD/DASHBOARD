import { Link } from 'react-router-dom';
import ResourceList from '../components/ResourceList.jsx';
import { StatusBadge } from '../components/ui.jsx';
import { thumb } from '../lib/upload.js';

export default function Lawyers() {
  return (
    <ResourceList
      resource="lawyers"
      title="Team"
      singular="Team member"
      newLabel="New team member"
      emptyMessage="Team profiles appear on the About page and can be credited as article authors."
      columns={[
        {
          key: 'name',
          label: 'Name',
          render: (l) => (
            <span style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
              {l.photo
                ? <img src={thumb(l.photo, 64, 64)} alt="" width="32" height="32" style={{ borderRadius: '50%', objectFit: 'cover' }} />
                : <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#eceff1', display: 'inline-block' }} />}
              <Link to={`/lawyers/${l._id}`}>{l.name}</Link>
            </span>
          ),
        },
        { key: 'role', label: 'Role' },
        { key: 'order', label: 'Order', width: '80px' },
        { key: 'status', label: 'Status', width: '110px', render: (l) => <StatusBadge status={l.status} /> },
      ]}
    />
  );
}
