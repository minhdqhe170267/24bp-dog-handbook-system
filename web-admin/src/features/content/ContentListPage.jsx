import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import FilterSelect from '../../components/shared/FilterSelect';
import ApprovalHistoryModal from '../../components/shared/ApprovalHistoryModal';
import { Eye, Search, History } from 'lucide-react';
import api from '../../services/api';
import { approvalService, APPROVAL_ENTITY_TYPES } from '../../services/approvalService';
import { getContentTypeLabel } from '../../utils/enumLabels';

const typeOptions = [
    { value: 'all', label: 'Tất cả loại' },
    { value: 'BREED_INFO', label: 'Giống chó' },
    { value: 'TRAINING_GUIDE', label: 'Huấn luyện' },
    { value: 'HEALTH_INFO', label: 'Sức khỏe' },
    { value: 'NUTRITION_GUIDE', label: 'Dinh dưỡng' },
    { value: 'FIRST_AID', label: 'Sơ cứu' },
];

const statusOptions = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'DRAFT', label: 'Nháp' },
    { value: 'PENDING', label: 'Chờ duyệt' },
    { value: 'APPROVED', label: 'Đã duyệt' },
    { value: 'PUBLISHED', label: 'Đã xuất bản' },
    { value: 'REJECTED', label: 'Từ chối' },
];

const ContentListPage = () => {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [contents, setContents] = useState([]);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(true);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyRecords, setHistoryRecords] = useState([]);
    const [historyTarget, setHistoryTarget] = useState({ title: '', typeLabel: '' });

    const fetchContents = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', String(page));
            params.append('size', String(pageSize));
            if (search) params.append('search', search);
            if (typeFilter !== 'all') params.append('type', typeFilter);
            if (statusFilter !== 'all') params.append('status', statusFilter);

            const res = await api.get(`/contents?${params.toString()}`);
            const data = res.data || res;
            setContents(data.content || []);
            setTotalItems(data.totalElements || 0);
        } catch (err) {
            console.error('Fetch contents error:', err);
            setContents([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContents();
    }, [page, pageSize, search, typeFilter, statusFilter]);

    const getContentId = (row) => row.contentId || row.id;
    const openView = (row) => {
        const id = getContentId(row);
        if (!id) return;
        navigate(`/content/${id}`);
    };

    const openHistory = async (row) => {
        const id = getContentId(row);
        if (!id) return;

        setHistoryTarget({
            title: row.title || row.contentTitle || '-',
            typeLabel: 'Bài viết',
        });
        setHistoryOpen(true);
        setHistoryLoading(true);
        setHistoryRecords([]);

        try {
            const res = await approvalService.getHistory(APPROVAL_ENTITY_TYPES.CONTENT, id);
            const payload = res?.data || res || [];
            setHistoryRecords(Array.isArray(payload) ? payload : payload.content || []);
        } catch (err) {
            console.error('Fetch content approval history error:', err);
            setHistoryRecords([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    const getDateTimeParts = (value) => {
        if (!value) return null;
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return { time: value, date: '' };
        const twoDigits = (num) => String(num).padStart(2, '0');
        return {
            time: `${twoDigits(d.getHours())}:${twoDigits(d.getMinutes())}:${twoDigits(d.getSeconds())}`,
            date: `${twoDigits(d.getDate())}/${twoDigits(d.getMonth() + 1)}/${d.getFullYear()}`,
        };
    };

    const renderDateTimeCell = (value) => {
        const parts = getDateTimeParts(value);
        if (!parts) return '—';
        return (
            <div className="leading-tight">
                <div className="text-sm font-medium text-foreground">{parts.time}</div>
                <div className="text-xs text-muted-foreground">{parts.date}</div>
            </div>
        );
    };

    const columns = [
        { key: 'title', header: 'Tiêu đề', render: (r) => <span className="font-medium">{r.title || r.contentTitle || '-'}</span> },
        { key: 'contentType', header: 'Loại', render: (r) => getContentTypeLabel(r.contentType || r.content_type) },
        { key: 'status', header: 'Trạng thái', render: (r) => <StatusBadge status={r.status} /> },
        { key: 'author', header: 'Tác giả', render: (r) => r.authorName || r.author?.fullName || r.author?.full_name || '-' },
        { key: 'updatedAt', header: 'Cập nhật', render: (r) => renderDateTimeCell(r.updatedAt || r.updated_at) },
        {
            key: 'actions', header: 'Thao tác', render: (r) => (
                <div className="flex items-center gap-1">
                    <button
                        className="p-1.5 rounded-md hover:bg-muted transition-colors"
                        title="Xem"
                        onClick={() => openView(r)}
                    >
                        <Eye className="h-4 w-4" />
                    </button>
                    <button
                        className="p-1.5 rounded-md hover:bg-muted transition-colors"
                        title="Lịch sử duyệt"
                        onClick={() => openHistory(r)}
                    >
                        <History className="h-4 w-4 text-muted-foreground" />
                    </button>
                </div>
            )
        },
    ];

    return (
        <div className="animate-fade-in">
            <PageHeader
                title="Quản lý Nội dung"
                description="Quản lý tất cả nội dung trong hệ thống"
                breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Nội dung' }]}
            />

            <div className="flex items-center gap-3 mb-4 flex-wrap">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Tìm theo tiêu đề..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                        className="h-9 pl-9 pr-3 border border-border rounded-lg text-sm bg-background outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors w-56"
                    />
                </div>

                {/* Type filter */}
                <FilterSelect
                    value={typeFilter}
                    onChange={(v) => { setTypeFilter(v); setPage(0); }}
                    options={typeOptions}
                    placeholder="Tất cả loại"
                />

                {/* Status filter */}
                <FilterSelect
                    value={statusFilter}
                    onChange={(v) => { setStatusFilter(v); setPage(0); }}
                    options={statusOptions}
                    placeholder="Tất cả trạng thái"
                />
            </div>

            {loading ? (
                <div className="h-64 bg-card rounded-xl border border-border/60 animate-pulse" />
            ) : (
                <DataTable
                    columns={columns}
                    data={contents}
                    page={page}
                    pageSize={pageSize}
                    totalItems={totalItems}
                    onPageChange={setPage}
                    onPageSizeChange={(s) => { setPageSize(s); setPage(0); }}
                    emptyMessage="Chưa có nội dung nào"
                />
            )}

            <ApprovalHistoryModal
                open={historyOpen}
                onClose={() => setHistoryOpen(false)}
                loading={historyLoading}
                records={historyRecords}
                entityTitle={historyTarget.title}
                entityTypeLabel={historyTarget.typeLabel}
            />
        </div>
    );
};

export default ContentListPage;
