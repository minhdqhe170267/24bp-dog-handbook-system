import { useState, useEffect } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import DetailModal, { DetailView } from '../../components/shared/DetailModal';
import { CheckCircle, XCircle, Eye } from 'lucide-react';
import api from '../../services/api';

const detailFields = [
    { key: 'title', label: 'Tiêu đề', render: (d) => d.title || d.contentTitle || '-' },
    { key: 'contentType', label: 'Loại nội dung' },
    { key: 'status', label: 'Trạng thái' },
    { key: 'authorName', label: 'Tác giả' },
    { key: 'body', label: 'Nội dung', type: 'textarea' },
];

const ApprovalPage = () => {
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
            const res = await api.get(`/contents/pending-reviews?${params.toString()}`);
            const data = res.data || res;
            setItems(data.content || []);
            setTotalItems(data.totalElements || 0);
        } catch (err) { console.error('Fetch pending reviews error:', err); setItems([]); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, [page, pageSize]);

    const handleReview = async (contentId, action) => {
        const comment = window.prompt(action === 'APPROVED' ? 'Ghi chú phê duyệt (không bắt buộc):' : 'Lý do từ chối:');
        if (comment === null) return;
        try { await api.post(`/contents/${contentId}/review`, { action, comment: comment || '' }); fetchData(); }
        catch (err) { console.error('Review error:', err); alert('Có lỗi xảy ra khi duyệt nội dung'); }
    };

    const formatDate = (d) => {
        if (!d) return '-';
        try { const dt = new Date(d); return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`; } catch { return d; }
    };

    const columns = [
        { key: 'title', header: 'Tiêu đề', render: (r) => <span className="font-medium">{r.title || r.contentTitle || '-'}</span> },
        { key: 'contentType', header: 'Loại', render: (r) => r.contentType || '-' },
        { key: 'status', header: 'Trạng thái', render: (r) => <StatusBadge status={r.status} /> },
        { key: 'authorName', header: 'Tác giả', render: (r) => r.authorName || '-' },
        { key: 'updatedAt', header: 'Ngày gửi', render: (r) => formatDate(r.updatedAt || r.createdAt) },
        {
            key: 'actions', header: 'Thao tác', render: (r) => (
                <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Xem" onClick={() => setDetailItem(r)}><Eye className="h-4 w-4 text-muted-foreground" /></button>
                    <button className="p-1.5 rounded-md hover:bg-green-100 transition-colors" title="Duyệt" onClick={() => handleReview(r.contentId || r.id, 'APPROVED')}>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </button>
                    <button className="p-1.5 rounded-md hover:bg-red-100 transition-colors" title="Từ chối" onClick={() => handleReview(r.contentId || r.id, 'REJECTED')}>
                        <XCircle className="h-4 w-4 text-red-500" />
                    </button>
                </div>
            )
        },
    ];

    return (
        <div className="animate-fade-in">
            <PageHeader title="Duyệt nội dung" description="Phê duyệt các nội dung chờ xét duyệt"
                breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Duyệt nội dung' }]} />
            {loading ? <div className="h-64 bg-card rounded-xl border border-border/60 animate-pulse" /> : (
                <DataTable columns={columns} data={items} page={page} pageSize={pageSize} totalItems={totalItems}
                    onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(0); }} emptyMessage="Không có nội dung nào chờ duyệt" />
            )}
            <DetailModal open={!!detailItem} onClose={() => setDetailItem(null)} title="Chi tiết nội dung" size="lg">
                <DetailView fields={detailFields} data={detailItem} />
            </DetailModal>
        </div>
    );
};

export default ApprovalPage;
