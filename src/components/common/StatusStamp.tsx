import type { Status } from '../../engine/types';

const STYLES: Record<Status, string> = {
  pending: 'border-mustard text-mustard-dark bg-mustard-soft',
  active: 'border-teal text-teal-dark bg-teal-soft',
  removed: 'border-brick text-brick-dark bg-brick-soft -rotate-2',
};

const LABELS: Record<Status, string> = {
  pending: 'PENDING',
  active: 'ACTIVE',
  removed: 'REMOVED',
};

export function StatusStamp({ status, className = '' }: { status: Status; className?: string }) {
  return <span className={`stamp ${STYLES[status]} ${className}`}>{LABELS[status]}</span>;
}
