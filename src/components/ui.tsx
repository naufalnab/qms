import Link from 'next/link';
import {
  getDetailedSlaStatus,
  priorityLabels,
  statusLabels,
  type Company,
  type Submission
} from '@/lib/qms';

export function PageHeading({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="heading-action">{action}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status: Submission['status'] }) {
  return <span className={`badge status-${status}`}>{statusLabels[status]}</span>;
}

export function SlaBadge({ doc }: { doc: Submission }) {
  const detail = getDetailedSlaStatus(doc);
  return (
    <span className={`badge sla-${detail.status}`} title={`SLA: ${detail.badgeLabel}`}>
      {detail.badgeLabel}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Submission['priority'] }) {
  return (
    <span className={`priority priority-${priority}`}>
      <i /> {priorityLabels[priority]}
    </span>
  );
}

export function CompanyBadge({ company }: { company?: Company }) {
  if (!company) return null;
  const isMega = company.includes('Mega');
  return (
    <span className={`company-badge ${isMega ? 'company-mega' : 'company-baramuda'}`}>
      <span className="company-dot" />
      {company}
    </span>
  );
}

export function DocumentCard({ doc }: { doc: Submission }) {
  return (
    <Link className="document-card" href={`/documents/${doc.id}`}>
      <div className="card-topline">
        <span className="doc-number">{doc.docNo}</span>
        <SlaBadge doc={doc} />
      </div>
      <h3>{doc.title}</h3>
      <div className="card-detail">
        <CompanyBadge company={doc.company} />
        <span>·</span>
        <span>{doc.department}</span>
        <span>·</span>
        <span>Rev {doc.revision}</span>
      </div>
      <div className="card-bottom">
        <StatusBadge status={doc.status} />
        <span className="due-label">
          Deadline {new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(new Date(`${doc.due}T12:00:00+07:00`))}
        </span>
      </div>
    </Link>
  );
}

export function EmptyState({
  title,
  detail,
  action
}: {
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">✓</div>
      <b>{title}</b>
      <span>{detail}</span>
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}
