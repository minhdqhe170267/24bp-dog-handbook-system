import DetailModal from './DetailModal';
import { Loader2 } from 'lucide-react';

const decisionLabels = {
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  REVISION_REQUESTED: 'Yêu cầu chỉnh sửa',
  PENDING: 'Chờ xử lý',
};

const formatDecisionLabel = (decision) => decisionLabels[decision] || decision || '-';

const getDateTimeParts = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { time: value, date: '' };
  const twoDigits = (num) => String(num).padStart(2, '0');
  return {
    time: `${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}:${twoDigits(date.getSeconds())}`,
    date: `${twoDigits(date.getDate())}/${twoDigits(date.getMonth() + 1)}/${date.getFullYear()}`,
  };
};

const formatDateTimeInline = (value) => {
  const parts = getDateTimeParts(value);
  if (!parts) return '—';
  return `${parts.time}${parts.date ? ` ${parts.date}` : ''}`;
};

const ApprovalHistoryModal = ({
  open,
  onClose,
  loading = false,
  records = [],
  entityTitle = '',
  entityTypeLabel = '',
}) => (
  <DetailModal open={open} onClose={onClose} title="Lịch sử duyệt" size="lg">
    <div className="space-y-3">
      <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
        <p className="text-sm font-medium text-foreground">{entityTitle || '-'}</p>
        <p className="text-xs text-muted-foreground">{entityTypeLabel || '-'}</p>
      </div>
      {loading ? (
        <div className="h-24 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : records.length === 0 ? (
        <div className="h-24 rounded-lg border border-dashed border-border/70 bg-muted/10 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Chưa có lịch sử duyệt</p>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map((record) => (
            <div key={record.approvalId} className="rounded-lg border border-border/60 bg-background p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{formatDecisionLabel(record.decision)}</p>
                <p className="text-xs text-muted-foreground">{formatDateTimeInline(record.reviewedAt)}</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Reviewer: {record.reviewerName || '-'}</p>
              <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">{record.comments || 'Không có nhận xét'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  </DetailModal>
);

export default ApprovalHistoryModal;
