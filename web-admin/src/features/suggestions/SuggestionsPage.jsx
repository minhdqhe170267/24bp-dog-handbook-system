import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import FilterSelect from '../../components/shared/FilterSelect';
import { Eye, MessageSquare, Search } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { Button, FormTextarea, Modal } from '../../components/ui/FormComponents';
import { sortByNewest } from '../../utils/sortByNewest';
import { fetchAllPages, paginateRows } from '../../utils/clientPagination';

const suggestionStatusConfig = {
    PENDING: { label: 'Chờ xử lý', badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30', dot: 'bg-amber-500 dark:bg-amber-400' },
    SUBMITTED: { label: 'Đã gửi', badge: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30', dot: 'bg-sky-500 dark:bg-sky-400' },
    UNDER_REVIEW: { label: 'Đang xem xét', badge: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30', dot: 'bg-indigo-500 dark:bg-indigo-400' },
    ACCEPTED: { label: 'Đã chấp nhận', badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30', dot: 'bg-emerald-500 dark:bg-emerald-400' },
    REJECTED: { label: 'Từ chối', badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30', dot: 'bg-rose-500 dark:bg-rose-400' },
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

const SuggestionsPage = () => {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [items, setItems] = useState([]);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(true);
    const [responseTarget, setResponseTarget] = useState(null);
    const [responseText, setResponseText] = useState('');
    const [responding, setResponding] = useState(false);
    const toast = useToast();

    const fetchData = async (nextPage = page, nextPageSize = pageSize) => {
        setLoading(true);
        try {
            const allRows = await fetchAllPages((pageIndex, batchSize) => {
                const params = new URLSearchParams();
                params.append('page', String(pageIndex));
                params.append('size', String(batchSize));
                if (statusFilter !== 'all') params.append('status', statusFilter);
                return api.get(`/suggestions?${params.toString()}`);
            });

            const normalizedSearch = search.trim().toLowerCase();
            const filteredRows = allRows.filter((item) => (
                !normalizedSearch || (item.title || '').toLowerCase().includes(normalizedSearch)
            ));
            const sortedRows = sortByNewest(filteredRows, {
                timeKeys: ['updatedAt', 'updated_at', 'createdAt', 'created_at'],
                idKeys: ['suggestionId', 'id'],
            });
            const { pageRows, totalItems: safeTotal, effectivePage } = paginateRows(sortedRows, nextPage, nextPageSize);
            setItems(pageRows);
            setTotalItems(safeTotal);
            if (effectivePage !== nextPage) setPage(effectivePage);
        } catch (err) { console.error('Fetch suggestions error:', err); setItems([]); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(page, pageSize); }, [page, pageSize, search, statusFilter]);

    const openRespondModal = (row) => {
        setResponseTarget(row);
        setResponseText('');
    };

    const closeRespondModal = () => {
        setResponseTarget(null);
        setResponseText('');
    };

    const handleRespond = async (status) => {
        const id = responseTarget?.suggestionId || responseTarget?.id;
        const adminResponse = responseText.trim();
        if (!id) return;
        if (!adminResponse) {
            toast.warning('Vui lòng nhập phản hồi trước khi gửi');
            return;
        }

        setResponding(true);
        try {
            await api.put(`/suggestions/${id}/respond`, { adminResponse, status });
            toast.success(status === 'ACCEPTED' ? 'Đã chấp nhận đề xuất' : 'Đã từ chối đề xuất');
            closeRespondModal();
            setPage(0);
            fetchData(0, pageSize);
        } catch (err) {
            console.error('Respond error:', err);
            toast.error(err, { title: 'Không thể phản hồi đề xuất' });
        } finally {
            setResponding(false);
        }
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
                    <button className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Xem" onClick={() => navigate(`/details/SUGGESTION/${r.suggestionId || r.id}`)}><Eye className="h-4 w-4" /></button>
                    {(r.status === 'PENDING' || r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW') && (
                        <button className="p-1.5 rounded-md hover:bg-accent/10 transition-colors" title="Phản hồi" onClick={() => openRespondModal(r)}>
                            <MessageSquare className="h-4 w-4 text-accent" />
                        </button>
                    )}
                </div>
            )
        },
    ];

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
                <DataTable columns={columns} data={items} page={page} pageSize={pageSize} totalItems={totalItems}
                    onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(0); }} emptyMessage="Chưa có đề xuất nào" />
            )}

            <Modal
                open={!!responseTarget}
                onClose={closeRespondModal}
                title="Phản hồi đề xuất nội dung"
                width={620}
                footer={(
                    <>
                        <Button variant="outline" onClick={closeRespondModal} disabled={responding}>Hủy</Button>
                        <Button variant="destructive" onClick={() => handleRespond('REJECTED')} loading={responding}>Từ chối</Button>
                        <Button onClick={() => handleRespond('ACCEPTED')} loading={responding}>Chấp nhận</Button>
                    </>
                )}
            >
                <div className="space-y-3">
                    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                        <p className="text-sm font-medium text-foreground">{responseTarget?.title || '-'}</p>
                        <p className="text-xs text-muted-foreground">Người gửi: {responseTarget?.submitterName || responseTarget?.trainerName || '-'}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                            Phản hồi của quản trị viên <span className="text-destructive">*</span>
                        </label>
                        <FormTextarea
                            rows={4}
                            value={responseText}
                            onChange={(event) => setResponseText(event.target.value)}
                            placeholder="Nhập nội dung phản hồi..."
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SuggestionsPage;
