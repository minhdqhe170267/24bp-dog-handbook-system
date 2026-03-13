import { useState, useEffect } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import FilterSelect from '../../components/shared/FilterSelect';
import DetailModal, { DetailView } from '../../components/shared/DetailModal';
import { Eye, MessageSquare } from 'lucide-react';
import api from '../../services/api';

const statusOptions = [
    { value: 'all', label: 'Tất cả' },
    { value: 'PENDING', label: 'Chờ xử lý' },
    { value: 'SUBMITTED', label: 'Đã gửi' },
    { value: 'UNDER_REVIEW', label: 'Đang xem xét' },
    { value: 'ACCEPTED', label: 'Đã chấp nhận' },
    { value: 'REJECTED', label: 'Từ chối' },
];

const detailFields = [
    { key: 'title', label: 'Tiêu đề' },
    { key: 'contentType', label: 'Loại nội dung' },
    { key: 'status', label: 'Trạng thái' },
    { key: 'submitterName', label: 'Người gửi', render: (d) => d.submitterName || d.trainerName || '-' },
    { key: 'description', label: 'Nội dung đề xuất', type: 'textarea' },
    { key: 'adminResponse', label: 'Phản hồi admin', type: 'textarea' },
];

const SuggestionsPage = () => {
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

    const formatDate = (d) => {
        if (!d) return '-';
        try { const dt = new Date(d); return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`; } catch { return d; }
    };

    const columns = [
        { key: 'title', header: 'Tiêu đề', render: (r) => <span className="font-medium">{r.title || '-'}</span> },
        { key: 'contentType', header: 'Loại nội dung', render: (r) => r.contentType || '-' },
        { key: 'status', header: 'Trạng thái', render: (r) => <StatusBadge status={r.status} /> },
        { key: 'submitterName', header: 'Người gửi', render: (r) => r.submitterName || r.trainerName || '-' },
        { key: 'createdAt', header: 'Ngày gửi', render: (r) => formatDate(r.createdAt) },
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

    return (
        <div className="animate-fade-in">
            <PageHeader title="Đề xuất nội dung" description="Quản lý các đề xuất nội dung từ huấn luyện viên"
                breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Đề xuất nội dung' }]} />
            <div className="flex items-center gap-3 mb-4 flex-wrap">
                <FilterSelect value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(0); }} options={statusOptions} placeholder="Tất cả" />
            </div>
            {loading ? <div className="h-64 bg-card rounded-xl border border-border/60 animate-pulse" /> : (
                <DataTable columns={columns} data={items} page={page} pageSize={pageSize} totalItems={totalItems}
                    onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(0); }} emptyMessage="Chưa có đề xuất nào" />
            )}
            <DetailModal open={!!detailItem} onClose={() => setDetailItem(null)} title="Chi tiết đề xuất" size="lg">
                <DetailView fields={detailFields} data={detailItem} />
            </DetailModal>
        </div>
    );
};

export default SuggestionsPage;
