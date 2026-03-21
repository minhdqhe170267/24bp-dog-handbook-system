import { useState, useEffect } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import FilterSelect from '../../components/shared/FilterSelect';
import DetailModal, { DetailView } from '../../components/shared/DetailModal';
import { Eye, MessageSquare, Search } from 'lucide-react';
import api from '../../services/api';

const suggestionStatusConfig = {
    PENDING: { label: 'Chờ xử lý', badge: 'bg-amber-500/10 text-amber-700 border-amber-500/30', dot: 'bg-amber-500' },
    SUBMITTED: { label: 'Đã gửi', badge: 'bg-sky-500/10 text-sky-700 border-sky-500/30', dot: 'bg-sky-500' },
    UNDER_REVIEW: { label: 'Đang xem xét', badge: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/30', dot: 'bg-indigo-500' },
    ACCEPTED: { label: 'Đã chấp nhận', badge: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30', dot: 'bg-emerald-500' },
    REJECTED: { label: 'Từ chối', badge: 'bg-rose-500/10 text-rose-700 border-rose-500/30', dot: 'bg-rose-500' },
};

const getSuggestionStatusLabel = (status) => suggestionStatusConfig[status]?.label || status || '—';

const renderSuggestionStatusBadge = (status) => {
    const config = suggestionStatusConfig[status] || { label: status || '—', badge: 'bg-muted text-muted-foreground border-border', dot: 'bg-muted-foreground' };
    return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border whitespace-nowrap ${config.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
            {config.label}
        </span>
    );
};

const statusOptions = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'PENDING', label: getSuggestionStatusLabel('PENDING') },
    { value: 'SUBMITTED', label: getSuggestionStatusLabel('SUBMITTED') },
    { value: 'UNDER_REVIEW', label: getSuggestionStatusLabel('UNDER_REVIEW') },
    { value: 'ACCEPTED', label: getSuggestionStatusLabel('ACCEPTED') },
    { value: 'REJECTED', label: getSuggestionStatusLabel('REJECTED') },
];

const detailFields = [
    { key: 'title', label: 'Tiêu đề' },
    { key: 'contentType', label: 'Loại nội dung' },
    { key: 'status', label: 'Trạng thái', render: (d) => getSuggestionStatusLabel(d.status) },
    { key: 'submitterName', label: 'Người gửi', render: (d) => d.submitterName || d.trainerName || '-' },
    { key: 'description', label: 'Nội dung đề xuất', type: 'textarea' },
    { key: 'adminResponse', label: 'Phản hồi admin', type: 'textarea' },
];

const SuggestionsPage = () => {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [items, setItems] = useState([]);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(true);
    const [detailItem, setDetailItem] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', String(page));
            params.append('size', String(pageSize));
            if (statusFilter !== 'all') params.append('status', statusFilter);
            const res = await api.get(`/suggestions?${params.toString()}`);
            const data = res.data || res;
            setItems(data.content || []);
            setTotalItems(data.totalElements || 0);
        } catch (err) { console.error('Fetch suggestions error:', err); setItems([]); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, [page, pageSize, statusFilter]);

    const handleRespond = async (id) => {
        const adminResponse = window.prompt('Phản hồi của admin:');
        if (!adminResponse) return;
        const status = window.confirm('Chấp nhận đề xuất này?') ? 'ACCEPTED' : 'REJECTED';
        try { await api.put(`/suggestions/${id}/respond`, { adminResponse, status }); fetchData(); }
        catch (err) { console.error('Respond error:', err); alert('Có lỗi xảy ra'); }
    };

    const getDateTimeParts = (value) => {
        if (!value) return null;
        const dt = new Date(value);
        if (Number.isNaN(dt.getTime())) return { time: value, date: '' };
        const twoDigits = (num) => String(num).padStart(2, '0');
        return {
            time: `${twoDigits(dt.getHours())}:${twoDigits(dt.getMinutes())}:${twoDigits(dt.getSeconds())}`,
            date: `${twoDigits(dt.getDate())}/${twoDigits(dt.getMonth() + 1)}/${dt.getFullYear()}`,
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
        { key: 'title', header: 'Tiêu đề', render: (r) => <span className="font-medium">{r.title || '-'}</span> },
        { key: 'contentType', header: 'Loại nội dung', render: (r) => r.contentType || '-' },
        { key: 'status', header: 'Trạng thái', render: (r) => renderSuggestionStatusBadge(r.status) },
        { key: 'submitterName', header: 'Người gửi', render: (r) => r.submitterName || r.trainerName || '-' },
        { key: 'createdAt', header: 'Ngày gửi', render: (r) => renderDateTimeCell(r.createdAt) },
        {
            key: 'actions', header: 'Thao tác', render: (r) => (
                <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Xem" onClick={() => setDetailItem(r)}><Eye className="h-4 w-4" /></button>
                    {(r.status === 'PENDING' || r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW') && (
                        <button className="p-1.5 rounded-md hover:bg-accent/10 transition-colors" title="Phản hồi" onClick={() => handleRespond(r.suggestionId || r.id)}>
                            <MessageSquare className="h-4 w-4 text-accent" />
                        </button>
                    )}
                </div>
            )
        },
    ];

    const normalizedSearch = search.trim().toLowerCase();
    const filteredItems = items.filter((item) => {
        if (!normalizedSearch) return true;
        return (item.title || '').toLowerCase().includes(normalizedSearch);
    });
    const hasClientFilter = Boolean(normalizedSearch);

    return (
        <div className="animate-fade-in">
            <PageHeader title="Nội dung đề xuất" description="Quản lý các đề xuất nội dung từ huấn luyện viên"
                breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Nội dung đề xuất' }]} />
            <div className="flex items-center gap-3 mb-4 flex-wrap">
                <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={search}
                        onChange={(event) => { setSearch(event.target.value); setPage(0); }}
                        placeholder="Tìm theo tên nội dung..."
                        className="h-9 w-full pl-9 pr-3 border border-border rounded-lg text-sm bg-background outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                    />
                </div>
                <FilterSelect value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(0); }} options={statusOptions} placeholder="Tất cả trạng thái" />
            </div>
            {loading ? <div className="h-64 bg-card rounded-xl border border-border/60 animate-pulse" /> : (
                <DataTable columns={columns} data={filteredItems} page={page} pageSize={pageSize} totalItems={hasClientFilter ? filteredItems.length : totalItems}
                    onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(0); }} emptyMessage="Chưa có đề xuất nào" />
            )}
            <DetailModal open={!!detailItem} onClose={() => setDetailItem(null)} title="Chi tiết đề xuất" size="lg">
                <DetailView fields={detailFields} data={detailItem} />
            </DetailModal>
        </div>
    );
};

export default SuggestionsPage;
