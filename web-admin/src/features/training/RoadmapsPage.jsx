import { useState, useEffect } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import FilterSelect from '../../components/shared/FilterSelect';
import DetailModal, { DetailView } from '../../components/shared/DetailModal';
import { FilePenLine, Eye, Trash2 } from 'lucide-react';
import api from '../../services/api';

const statusOptions = [
    { value: 'all', label: 'Tất cả' },
    { value: 'DRAFT', label: 'Nháp' },
    { value: 'PUBLISHED', label: 'Đã xuất bản' },
];

const detailFields = [
    { key: 'roadmapName', label: 'Tên lộ trình' },
    { key: 'breedName', label: 'Giống chó' },
    { key: 'targetRole', label: 'Vai trò mục tiêu' },
    { key: 'totalDurationWeeks', label: 'Tổng thời gian (tuần)' },
    { key: 'phaseName', label: 'Tên giai đoạn' },
    { key: 'phaseOrder', label: 'Thứ tự giai đoạn' },
    { key: 'phaseDurationWeeks', label: 'Thời gian giai đoạn (tuần)' },
    { key: 'phaseObjectives', label: 'Mục tiêu giai đoạn', type: 'textarea' },
    { key: 'assessmentCriteria', label: 'Tiêu chí đánh giá', type: 'textarea' },
    { key: 'description', label: 'Mô tả', type: 'textarea' },
    { key: 'status', label: 'Trạng thái' },
    { key: 'createdByName', label: 'Người tạo' },
];

const RoadmapsPage = () => {
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [statusFilter, setStatusFilter] = useState('all');
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
            const res = await api.get(`/roadmaps?${params.toString()}`);
            const data = res.data || res;
            let list = data.content || [];
            if (statusFilter !== 'all') list = list.filter(r => r.status === statusFilter);
            setItems(list);
            setTotalItems(data.totalElements || list.length);
        } catch (err) { console.error('Fetch roadmaps error:', err); setItems([]); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, [page, pageSize, statusFilter]);

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa lộ trình này?')) return;
        try { await api.delete(`/roadmaps/${id}`); fetchData(); } catch (err) { console.error('Delete error:', err); }
    };

    const columns = [
        { key: 'roadmapName', header: 'Tên lộ trình', render: (r) => <span className="font-medium">{r.roadmapName || '-'}</span> },
        { key: 'breedName', header: 'Giống chó', render: (r) => r.breedName || '-' },
        { key: 'targetRole', header: 'Vai trò mục tiêu', render: (r) => r.targetRole || '-' },
        { key: 'totalDurationWeeks', header: 'Thời gian', render: (r) => r.totalDurationWeeks ? `${r.totalDurationWeeks} tuần` : '-' },
        { key: 'phaseName', header: 'Giai đoạn', render: (r) => r.phaseName || '-' },
        { key: 'status', header: 'Trạng thái', render: (r) => <StatusBadge status={r.status} /> },
        {
            key: 'actions', header: 'Thao tác', render: (r) => (
                <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Xem chi tiết" onClick={() => setDetailItem(r)}><Eye className="h-4 w-4 text-muted-foreground" /></button>
                    <button className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Xóa" onClick={() => handleDelete(r.roadmapId)}><Trash2 className="h-4 w-4 text-destructive" /></button>
                </div>
            )
        },
    ];

    return (
        <div className="animate-fade-in">
            <PageHeader title="Lộ trình huấn luyện" description="Quản lý các lộ trình huấn luyện chó nghiệp vụ"
                breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Huấn luyện' }, { label: 'Lộ trình' }]}
                actions={<button className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors cursor-pointer"><FilePenLine className="h-4 w-4" />Thêm lộ trình</button>} />
            <div className="flex items-center gap-3 mb-4 flex-wrap">
                <FilterSelect value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(0); }} options={statusOptions} placeholder="Tất cả" />
            </div>
            {loading ? <div className="h-64 bg-card rounded-xl border border-border/60 animate-pulse" /> : (
                <DataTable columns={columns} data={items} page={page} pageSize={pageSize} totalItems={totalItems}
                    onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(0); }} emptyMessage="Chưa có lộ trình nào" />
            )}
            <DetailModal open={!!detailItem} onClose={() => setDetailItem(null)} title="Chi tiết lộ trình" size="lg">
                <DetailView fields={detailFields} data={detailItem} />
                {detailItem?.exercises?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                        <h3 className="text-sm font-semibold text-foreground mb-2">Danh sách bài tập</h3>
                        <div className="space-y-1.5">
                            {detailItem.exercises.map((ex, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm px-3 py-1.5 bg-muted/30 rounded-lg">
                                    <span className="text-muted-foreground">{ex.exerciseOrder}.</span>
                                    <span>{ex.exerciseName}</span>
                                    {ex.isMandatory && <span className="text-xs px-1.5 py-0.5 bg-accent/10 text-accent rounded">Bắt buộc</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </DetailModal>
        </div>
    );
};

export default RoadmapsPage;
