const statusConfig = {
    PUBLISHED: { label: 'Đã xuất bản', bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/25', dot: 'bg-emerald-500' },
    APPROVED: { label: 'Đã duyệt', bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/25', dot: 'bg-blue-500' },
    PENDING: { label: 'Chờ duyệt', bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/25', dot: 'bg-amber-500' },
    DRAFT: { label: 'Nháp', bg: 'bg-gray-500/10', text: 'text-gray-500', border: 'border-gray-500/25', dot: 'bg-gray-500' },
    REJECTED: { label: 'Từ chối', bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-500/25', dot: 'bg-red-500' },
    MILD: { label: 'Nhẹ', bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/25', dot: 'bg-emerald-500' },
    MODERATE: { label: 'Trung bình', bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/25', dot: 'bg-blue-500' },
    SEVERE: { label: 'Cao', bg: 'bg-orange-500/10', text: 'text-orange-600', border: 'border-orange-500/25', dot: 'bg-orange-500' },
    LOW: { label: 'Nhẹ', bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/25', dot: 'bg-emerald-500' },
    MEDIUM: { label: 'Trung bình', bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/25', dot: 'bg-amber-500' },
    HIGH: { label: 'Nặng', bg: 'bg-orange-500/10', text: 'text-orange-600', border: 'border-orange-500/25', dot: 'bg-orange-500' },
    CRITICAL: { label: 'Nguy hiểm', bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-500/25', dot: 'bg-red-500' },
    BASIC: { label: 'Cơ bản', bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/25', dot: 'bg-emerald-500' },
    INTERMEDIATE: { label: 'Trung cấp', bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/25', dot: 'bg-amber-500' },
    ADVANCED: { label: 'Nâng cao', bg: 'bg-orange-500/10', text: 'text-orange-600', border: 'border-orange-500/25', dot: 'bg-orange-500' },
    EXPERT: { label: 'Chuyên gia', bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-500/25', dot: 'bg-red-500' },
    ACTIVE: { label: 'Hoạt động', bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/25', dot: 'bg-emerald-500' },
    INACTIVE: { label: 'Ngừng', bg: 'bg-gray-500/10', text: 'text-gray-500', border: 'border-gray-500/25', dot: 'bg-gray-500' },
    LOCKED: { label: 'Đã khóa', bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-500/25', dot: 'bg-red-500' },
    NEW: { label: 'Mới', bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/25', dot: 'bg-blue-500' },
    REVIEWED: { label: 'Đã xem', bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/25', dot: 'bg-emerald-500' },
    IMPLEMENTING: { label: 'Đang xử lý', bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/25', dot: 'bg-amber-500' },
};

const StatusBadge = ({ status }) => {
    const config = statusConfig[status] || {
        label: status || '-',
        bg: 'bg-gray-500/10',
        text: 'text-gray-500',
        border: 'border-gray-500/25',
        dot: 'bg-gray-500',
    };

    return (
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border whitespace-nowrap ${config.bg} ${config.text} ${config.border}`}>
            <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${config.dot}`} />
            {config.label}
        </span>
    );
};

export default StatusBadge;
