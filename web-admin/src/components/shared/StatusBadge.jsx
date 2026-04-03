const statusConfig = {
    PUBLISHED: { label: 'Đã xuất bản', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-300', border: 'border-emerald-500/25', dot: 'bg-emerald-500 dark:bg-emerald-400' },
    APPROVED: { label: 'Đã duyệt', bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-300', border: 'border-blue-500/25', dot: 'bg-blue-500 dark:bg-blue-400' },
    PENDING: { label: 'Chờ duyệt', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-300', border: 'border-amber-500/25', dot: 'bg-amber-500 dark:bg-amber-400' },
    DRAFT: { label: 'Nháp', bg: 'bg-gray-500/10', text: 'text-gray-500 dark:text-gray-300', border: 'border-gray-500/25', dot: 'bg-gray-500 dark:bg-gray-400' },
    REJECTED: { label: 'Từ chối', bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-300', border: 'border-red-500/25', dot: 'bg-red-500 dark:bg-red-400' },
    MILD: { label: 'Nhẹ', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-300', border: 'border-emerald-500/25', dot: 'bg-emerald-500 dark:bg-emerald-400' },
    MODERATE: { label: 'Trung bình', bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-300', border: 'border-blue-500/25', dot: 'bg-blue-500 dark:bg-blue-400' },
    SEVERE: { label: 'Cao', bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-300', border: 'border-orange-500/25', dot: 'bg-orange-500 dark:bg-orange-400' },
    LOW: { label: 'Nhẹ', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-300', border: 'border-emerald-500/25', dot: 'bg-emerald-500 dark:bg-emerald-400' },
    MEDIUM: { label: 'Trung bình', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-300', border: 'border-amber-500/25', dot: 'bg-amber-500 dark:bg-amber-400' },
    HIGH: { label: 'Nặng', bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-300', border: 'border-orange-500/25', dot: 'bg-orange-500 dark:bg-orange-400' },
    CRITICAL: { label: 'Nguy hiểm', bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-300', border: 'border-red-500/25', dot: 'bg-red-500 dark:bg-red-400' },
    BASIC: { label: 'Cơ bản', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-300', border: 'border-emerald-500/25', dot: 'bg-emerald-500 dark:bg-emerald-400' },
    INTERMEDIATE: { label: 'Trung cấp', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-300', border: 'border-amber-500/25', dot: 'bg-amber-500 dark:bg-amber-400' },
    ADVANCED: { label: 'Nâng cao', bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-300', border: 'border-orange-500/25', dot: 'bg-orange-500 dark:bg-orange-400' },
    EXPERT: { label: 'Chuyên gia', bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-300', border: 'border-red-500/25', dot: 'bg-red-500 dark:bg-red-400' },
    ACTIVE: { label: 'Hoạt động', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-300', border: 'border-emerald-500/25', dot: 'bg-emerald-500 dark:bg-emerald-400' },
    INACTIVE: { label: 'Ngừng', bg: 'bg-gray-500/10', text: 'text-gray-500 dark:text-gray-300', border: 'border-gray-500/25', dot: 'bg-gray-500 dark:bg-gray-400' },
    LOCKED: { label: 'Đã khóa', bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-300', border: 'border-red-500/25', dot: 'bg-red-500 dark:bg-red-400' },
    ENROLLED: { label: 'Đã ghi danh', bg: 'bg-slate-500/10', text: 'text-slate-600 dark:text-slate-300', border: 'border-slate-500/25', dot: 'bg-slate-500 dark:bg-slate-400' },
    IN_PROGRESS: { label: 'Đang huấn luyện', bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-300', border: 'border-blue-500/25', dot: 'bg-blue-500 dark:bg-blue-400' },
    COMPLETED: { label: 'Hoàn thành', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-300', border: 'border-emerald-500/25', dot: 'bg-emerald-500 dark:bg-emerald-400' },
    SUSPENDED: { label: 'Tạm dừng', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-300', border: 'border-amber-500/25', dot: 'bg-amber-500 dark:bg-amber-400' },
    WITHDRAWN: { label: 'Đã rút', bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-300', border: 'border-red-500/25', dot: 'bg-red-500 dark:bg-red-400' },
    NOT_STARTED: { label: 'Chưa bắt đầu', bg: 'bg-slate-500/10', text: 'text-slate-600 dark:text-slate-300', border: 'border-slate-500/25', dot: 'bg-slate-500 dark:bg-slate-400' },
    SKIPPED: { label: 'Bỏ qua', bg: 'bg-zinc-500/10', text: 'text-zinc-600 dark:text-zinc-300', border: 'border-zinc-500/25', dot: 'bg-zinc-500 dark:bg-zinc-400' },
    NEW: { label: 'Mới', bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-300', border: 'border-blue-500/25', dot: 'bg-blue-500 dark:bg-blue-400' },
    REVIEWED: { label: 'Đã xem', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-300', border: 'border-emerald-500/25', dot: 'bg-emerald-500 dark:bg-emerald-400' },
    IMPLEMENTING: { label: 'Đang xử lý', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-300', border: 'border-amber-500/25', dot: 'bg-amber-500 dark:bg-amber-400' },
};

const StatusBadge = ({ status }) => {
    const config = statusConfig[status] || {
        label: status || '-',
        bg: 'bg-gray-500/10',
        text: 'text-gray-500 dark:text-gray-300',
        border: 'border-gray-500/25',
        dot: 'bg-gray-500 dark:bg-gray-400',
    };

    return (
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border whitespace-nowrap ${config.bg} ${config.text} ${config.border}`}>
            <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${config.dot}`} />
            {config.label}
        </span>
    );
};

export default StatusBadge;
