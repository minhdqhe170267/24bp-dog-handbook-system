import { useState, useEffect } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import FilterSelect from '../../components/shared/FilterSelect';
import DetailModal, { DetailView, EditForm } from '../../components/shared/DetailModal';
import { FilePenLine, Eye, Pencil, Trash2, Search } from 'lucide-react';
import api from '../../services/api';

const difficultyOptions = [
    { value: 'all', label: 'Tất cả độ khó' },
    { value: 'BASIC', label: 'Cơ bản' },
    { value: 'INTERMEDIATE', label: 'Trung bình' },
    { value: 'ADVANCED', label: 'Nâng cao' },
];
const statusOptions = [
    { value: 'all', label: 'Tất cả' },
    { value: 'DRAFT', label: 'Nháp' },
    { value: 'PUBLISHED', label: 'Đã xuất bản' },
];

const detailFields = [
    { key: 'exerciseName', label: 'Tên bài tập' },
    { key: 'difficultyLevel', label: 'Độ khó' },
    { key: 'durationMinutes', label: 'Thời gian (phút)' },
    { key: 'methodName', label: 'Phương pháp' },
    { key: 'requiredEquipment', label: 'Thiết bị cần thiết' },
    { key: 'description', label: 'Mô tả', type: 'textarea' },
    { key: 'instructions', label: 'Hướng dẫn', type: 'textarea' },
    { key: 'safetyPrecautions', label: 'Lưu ý an toàn', type: 'textarea' },
    { key: 'status', label: 'Trạng thái' },
    { key: 'createdByName', label: 'Người tạo' },
];

const editFields = [
    { key: 'exerciseName', label: 'Tên bài tập', required: true },
    { key: 'difficultyLevel', label: 'Độ khó', type: 'select', required: true, options: [{ value: 'BASIC', label: 'Cơ bản' }, { value: 'INTERMEDIATE', label: 'Trung bình' }, { value: 'ADVANCED', label: 'Nâng cao' }] },
    { key: 'durationMinutes', label: 'Thời gian (phút)', type: 'number' },
    { key: 'description', label: 'Mô tả', type: 'textarea' },
    { key: 'instructions', label: 'Hướng dẫn', type: 'textarea' },
    { key: 'requiredEquipment', label: 'Thiết bị cần thiết' },
    { key: 'safetyPrecautions', label: 'Lưu ý an toàn', type: 'textarea' },
    { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'DRAFT', label: 'Nháp' }, { value: 'PUBLISHED', label: 'Xuất bản' }] },
];

const ExercisesPage = () => {
    const [search, setSearch] = useState('');
    const [difficultyFilter, setDifficultyFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [items, setItems] = useState([]);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(true);
    const [detailItem, setDetailItem] = useState(null);
    const [editItem, setEditItem] = useState(null);
    const [saving, setSaving] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', String(page));
            params.append('size', String(pageSize));
            if (search) params.append('search', search);
            if (difficultyFilter !== 'all') params.append('difficulty', difficultyFilter);
            const res = await api.get(`/exercises?${params.toString()}`);
            const data = res.data || res;
            let list = data.content || [];
            if (statusFilter !== 'all') list = list.filter(e => e.status === statusFilter);
            setItems(list);
            setTotalItems(data.totalElements || list.length);
        } catch (err) { console.error('Fetch exercises error:', err); setItems([]); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, [page, pageSize, search, difficultyFilter, statusFilter]);

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa bài tập này?')) return;
        try { await api.delete(`/exercises/${id}`); fetchData(); } catch (err) { console.error('Delete error:', err); }
    };

    const handleEdit = async (formData) => {
        setSaving(true);
        try { await api.put(`/exercises/${editItem.exerciseId}`, formData); setEditItem(null); fetchData(); }
        catch (err) { console.error('Update error:', err); alert('Có lỗi xảy ra khi cập nhật'); }
        finally { setSaving(false); }
    };

    const formatDate = (d) => {
        if (!d) return '-';
        try { const dt = new Date(d); return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`; } catch { return d; }
    };

    const columns = [
        { key: 'exerciseName', header: 'Tên bài tập', render: (r) => <span className="font-medium">{r.exerciseName || '-'}</span> },
        { key: 'difficultyLevel', header: 'Độ khó', render: (r) => <StatusBadge status={r.difficultyLevel} /> },
        { key: 'durationMinutes', header: 'Thời gian', render: (r) => r.durationMinutes ? `${r.durationMinutes} phút` : '-' },
        { key: 'status', header: 'Trạng thái', render: (r) => <StatusBadge status={r.status} /> },
        { key: 'updatedAt', header: 'Cập nhật', render: (r) => formatDate(r.updatedAt) },
        {
            key: 'actions', header: 'Thao tác', render: (r) => (
                <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Xem" onClick={() => setDetailItem(r)}><Eye className="h-4 w-4 text-muted-foreground" /></button>
                    <button className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Sửa" onClick={() => setEditItem(r)}><Pencil className="h-4 w-4 text-muted-foreground" /></button>
                    <button className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Xóa" onClick={() => handleDelete(r.exerciseId)}><Trash2 className="h-4 w-4 text-destructive" /></button>
                </div>
            )
        },
    ];

    return (
        <div className="animate-fade-in">
            <PageHeader title="Bài tập huấn luyện" description="Quản lý các bài tập cho chó nghiệp vụ"
                breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Huấn luyện' }, { label: 'Bài tập' }]}
                actions={<button className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors cursor-pointer"><FilePenLine className="h-4 w-4" />Thêm bài tập</button>} />
            <div className="flex items-center gap-3 mb-4 flex-wrap">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input type="text" placeholder="Tìm theo tên bài tập..." value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                        className="h-9 pl-9 pr-3 border border-border rounded-lg text-sm bg-background outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors w-64" />
                </div>
                <FilterSelect value={difficultyFilter} onChange={(v) => { setDifficultyFilter(v); setPage(0); }} options={difficultyOptions} placeholder="Tất cả độ khó" />
                <FilterSelect value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(0); }} options={statusOptions} placeholder="Tất cả" />
            </div>
            {loading ? <div className="h-64 bg-card rounded-xl border border-border/60 animate-pulse" /> : (
                <DataTable columns={columns} data={items} page={page} pageSize={pageSize} totalItems={totalItems}
                    onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(0); }} emptyMessage="Chưa có bài tập nào" />
            )}
            <DetailModal open={!!detailItem} onClose={() => setDetailItem(null)} title="Chi tiết bài tập" size="lg">
                <DetailView fields={detailFields} data={detailItem} />
            </DetailModal>
            <DetailModal open={!!editItem} onClose={() => setEditItem(null)} title="Sửa bài tập" size="lg">
                <EditForm fields={editFields} data={editItem} onSubmit={handleEdit} onCancel={() => setEditItem(null)} loading={saving} />
            </DetailModal>
        </div>
    );
};

export default ExercisesPage;
