import { Link } from 'react-router-dom';
import ResourceList from '../components/ResourceList.jsx';
import { StatusBadge, formatDate } from '../components/ui.jsx';

export default function Cases() {
  return (
    <ResourceList
      resource="cases"
      title="Case Record"
      singular="Case"
      emptyMessage="The case record is the firm's public archive of outcomes. Add the first matter to begin."
      columns={[
        {
          key: 'title',
          label: 'Matter',
          render: (c) => (
            <>
              <Link to={`/cases/${c._id}`}>{c.title}</Link>
              {!c.anonymised && (
                <div className="badge badge--spam" style={{ marginTop: 4 }}>Parties named</div>
              )}
            </>
          ),
        },
        { key: 'forum', label: 'Forum', width: '120px' },
        { key: 'year', label: 'Year', width: '80px' },
        { key: 'partyRepresented', label: 'Represented', width: '130px' },
        { key: 'outcome', label: 'Outcome', width: '110px' },
        { key: 'status', label: 'Status', width: '110px', render: (c) => <StatusBadge status={c.status} /> },
        { key: 'updatedAt', label: 'Updated', width: '120px', render: (c) => <span className="muted">{formatDate(c.updatedAt)}</span> },
      ]}
    />
  );
}
