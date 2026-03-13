import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import FilterSelect from '../../components/shared/FilterSelect';
import { FilePenLine, Eye, Pencil, Trash2, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

const typeOptions = [
    { value: 'all', label: 'Tất cả loại' },
    { value: 'BREED_INFO', label: 'Giống chó' },
    { value: 'TRAINING_GUIDE', label: 'Huấn luyện' },
    { value: 'HEALTH_INFO', label: 'Sức khỏe' },
    { value: 'NUTRITION_GUIDE', label: 'Dinh dưỡng' },
    { value: 'FIRST_AID', label: 'Sơ cứu' },
];

const statusOptions = [
    { value: 'all', label: 'Tất cả' },
    { value: 'DRAFT', label: 'Nháp' },
    { value: 'PENDING', label: 'Chờ duyệt' },
    { value: 'APPROVED', label: 'Đã duyệt' },
    { value: 'PUBLISHED', label: 'Đã xuất bản' },
    { value: 'REJECTED', label: 'Từ chối' },
];

const ContentListPage = () => {
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [contents, setContents] = useState([]);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(true);
    const [deleteId, setDeleteId] = useState(null);
    const { user } = useAuth();
    const canEdit = user?.role === 'ADMIN' || user?.role === 'CONTENT_EDITOR';
    const canDelete = user?.role === 'ADMIN' || user?.role === 'CONTENT_EDITOR';

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

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa nội dung này?')) return;
        try {
            await api.delete(`/contents/${id}`);
            fetchContents();
        } catch (err) {
            console.error('Delete error:', err);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        } catch {
            return dateStr;
        }
    };

    const columns = [
        { key: 'title', header: 'Tiêu đề', render: (r) => <span className="font-medium">{r.title || r.contentTitle || '-'}</span> },
        { key: 'contentType', header: 'Loại', render: (r) => r.contentType || r.content_type || '-' },
        { key: 'status', header: 'Trạng thái', render: (r) => <StatusBadge status={r.status} /> },
        { key: 'author', header: 'Tác giả', render: (r) => r.authorName || r.author?.fullName || r.author?.full_name || '-' },
        { key: 'updatedAt', header: 'Cập nhật', render: (r) => formatDate(r.updatedAt || r.updated_at) },
        {
            key: 'actions', header: 'Thao tác', render: (r) => (
                <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Xem">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                    </button>
                    {canEdit && (
                        <button className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Sửa">
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                        </button>
                    )}
                    {canDelete && (
                        <button className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Xóa" onClick={() => handleDelete(r.contentId || r.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </button>
                    )}
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
                actions={canEdit ? (
                    <Link
                        to="/content/create"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors no-underline"
                    >
                        <FilePenLine className="h-4 w-4" />
                        Tạo nội dung mới
                    </Link>
                ) : null}
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
                    placeholder="Tất cả"
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
        </div>
    );
};

export default ContentListPage;
