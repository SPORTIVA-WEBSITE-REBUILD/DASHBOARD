import { Link } from 'react-router-dom';
import ResourceList from '../components/ResourceList.jsx';
import { StatusBadge, formatDate } from '../components/ui.jsx';

const TYPE_LABELS = {
  full_time: 'Full time', part_time: 'Part time', contract: 'Contract',
  internship: 'Internship', pupillage: 'Pupillage', nysc: 'NYSC',
};

function closingLabel(v) {
  if (!v.closingDate) return <span className="muted">No closing date</span>;
  const closed = new Date(v.closingDate).getTime() < Date.now();
  return (
    <>
      <span className="muted">{formatDate(v.closingDate)}</span>
      {closed && <div className="badge badge--spam" style={{ marginTop: 4 }}>Closed</div>}
    </>
  );
}

export default function Vacancies() {
  return (
    <ResourceList
      resource="vacancies"
      title="Careers"
      singular="Vacancy"
      newLabel="New vacancy"
      emptyMessage="Vacancies appear on the public Careers page. A role past its closing date drops off the list automatically."
      columns={[
        { key: 'title', label: 'Role', render: (v) => <Link to={`/vacancies/${v._id}`}>{v.title}</Link> },
        { key: 'department', label: 'Team', width: '140px', render: (v) => v.department || <span className="muted">—</span> },
        { key: 'location', label: 'Location', width: '150px' },
        { key: 'employmentType', label: 'Type', width: '110px', render: (v) => TYPE_LABELS[v.employmentType] || v.employmentType },
        { key: 'closingDate', label: 'Closes', width: '130px', render: closingLabel },
        { key: 'status', label: 'Status', width: '110px', render: (v) => <StatusBadge status={v.status} /> },
      ]}
    />
  );
}
