import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Globe,
    History,
    Pencil,
    Plus,
    Search,
    Send,
    Trash2,
    Undo2,
    Eye,
} from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import FilterSelect from '../../components/shared/FilterSelect';
import ApprovalHistoryModal from '../../components/shared/ApprovalHistoryModal';
import { Button, ConfirmDialog } from '../../components/ui/FormComponents';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/Toast';
import api from '../../services/api';
import { approvalService, APPROVAL_ENTITY_TYPES } from '../../services/approvalService';
import trainingSpecialtyService from '../../services/trainingSpecialtyService';
import { sortByNewest } from '../../utils/sortByNewest';
import { fetchAllPages, paginateRows } from '../../utils/clientPagination';

const statusOptions = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'DRAFT', label: 'Nháp' },
    { value: 'PENDING', label: 'Chờ duyệt' },
    { value: 'APPROVED', label: 'Đã duyệt' },
    { value: 'PUBLISHED', label: 'Đã xuất bản' },
    { value: 'REJECTED', label: 'Từ chối' },
];

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

const RoadmapsPage = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const { user } = useAuth();
    const canEdit = user?.role === 'ADMIN' || user?.role === 'CONTENT_EDITOR';
    const canDelete = user?.role === 'ADMIN' || user?.role === 'CONTENT_EDITOR';
    const canPublish = user?.role === 'ADMIN' || user?.role === 'CONTENT_EDITOR';

    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [specialtyFilter, setSpecialtyFilter] = useState('');
    const [items, setItems] = useState([]);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(true);
    const [specialties, setSpecialties] = useState([]);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyRecords, setHistoryRecords] = useState([]);
    const [historyTarget, setHistoryTarget] = useState({ title: '', typeLabel: '' });
    const [deleteId, setDeleteId] = useState(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        let active = true;

        const loadSpecialties = async () => {
            try {
                const rows = await fetchAllPages((pageIndex, batchSize) =>
                    trainingSpecialtyService.getAll(pageIndex, batchSize, '')
                );
                if (active) {
                    setSpecialties(Array.isArray(rows) ? rows : []);
                }
            } catch (error) {
                toast.error(error, { title: 'Không tải được danh mục chuyên ngành' });
            }
        };

        loadSpecialties();
        return () => {
            active = false;
        };
    }, [toast]);

    const specialtyOptions = useMemo(
        () => [
            { value: '', label: 'Tất cả chuyên ngành' },
            ...specialties.map((specialty) => ({
                value: String(specialty.specialtyId),
                label: `${specialty.specialtyCode} - ${specialty.specialtyName}`,
            })),
        ],
        [specialties]
    );

    const fetchData = async (nextPage = page, nextPageSize = pageSize) => {
        setLoading(true);
        try {
            const allRows = await fetchAllPages((pageIndex, batchSize) => {
                const params = new URLSearchParams();
                params.append('page', String(pageIndex));
                params.append('size', String(batchSize));
                if (specialtyFilter) {
                    params.append('specialtyId', specialtyFilter);
                }
                return api.get(`/roadmaps?${params.toString()}`);
            });

            const normalizedSearch = search.trim().toLowerCase();
            const filteredRows = allRows.filter((item) => {
                const matchName =
                    !normalizedSearch ||
                    String(item?.roadmapName || '').toLowerCase().includes(normalizedSearch) ||
                    String(item?.specialtyName || '').toLowerCase().includes(normalizedSearch);
                const matchStatus = statusFilter === 'all' || item.status === statusFilter;
                return matchName && matchStatus;
            });
            const sortedRows = sortByNewest(filteredRows, { idKeys: ['roadmapId', 'id'] });
            const { pageRows, totalItems: nextTotalItems, effectivePage } = paginateRows(
                sortedRows,
                nextPage,
                nextPageSize
            );

            setItems(pageRows);
            setTotalItems(nextTotalItems);
            if (effectivePage !== nextPage) {
                setPage(effectivePage);
            }
        } catch (error) {
            toast.error(error, { title: 'Không tải được danh sách lộ trình' });
            setItems([]);
            setTotalItems(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(page, pageSize);
    }, [page, pageSize, search, statusFilter, specialtyFilter]); // eslint-disable-line react-hooks/exhaustive-deps

    const getRoadmapId = (row) => row.roadmapId || row.id;
    const getStatus = (row) => String(row.status || '').toUpperCase();
    const canShowEdit = (row) => canEdit && !['PENDING', 'APPROVED', 'PUBLISHED'].includes(getStatus(row));

    const handleDelete = async () => {
        if (!deleteId) return;
        setDeleting(true);
        try {
            await api.delete(`/roadmaps/${deleteId}`);
            toast.success('Đã xóa lộ trình');
            setDeleteId(null);
            await fetchData(0, pageSize);
            setPage(0);
        } catch (error) {
            toast.error(error, { title: 'Không thể xóa lộ trình' });
        } finally {
            setDeleting(false);
        }
    };

    const handleSubmitForReview = async (row) => {
        const id = getRoadmapId(row);
        if (!id) return;
        try {
            await approvalService.submit(APPROVAL_ENTITY_TYPES.TRAINING_ROADMAP, id);
            await fetchData(page, pageSize);
        } catch (error) {
            toast.error(error, { title: 'Không thể gửi duyệt lộ trình' });
        }
    };

    const handlePublish = async (row) => {
        const id = getRoadmapId(row);
        if (!id) return;
        try {
            await approvalService.publish(APPROVAL_ENTITY_TYPES.TRAINING_ROADMAP, id);
            await fetchData(page, pageSize);
        } catch (error) {
            toast.error(error, { title: 'Không thể xuất bản lộ trình' });
        }
    };

    const handleUnpublish = async (row) => {
        const id = getRoadmapId(row);
        if (!id) return;
        try {
            await approvalService.unpublish(APPROVAL_ENTITY_TYPES.TRAINING_ROADMAP, id);
            await fetchData(page, pageSize);
        } catch (error) {
            toast.error(error, { title: 'Không thể gỡ xuất bản lộ trình' });
        }
    };

    const openHistory = async (row) => {
        const id = getRoadmapId(row);
        if (!id) return;

        setHistoryTarget({ title: row?.roadmapName || '-', typeLabel: 'Lộ trình huấn luyện' });
        setHistoryOpen(true);
        setHistoryLoading(true);
        setHistoryRecords([]);
        try {
            const response = await approvalService.getHistory(APPROVAL_ENTITY_TYPES.TRAINING_ROADMAP, id);
            const payload = response?.data ?? response ?? [];
            setHistoryRecords(Array.isArray(payload) ? payload : payload.content || []);
        } catch (error) {
            toast.error(error, { title: 'Không tải được lịch sử duyệt' });
            setHistoryRecords([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    const columns = [
        {
            key: 'roadmapName',
            header: 'Tên lộ trình',
            headerClassName: 'whitespace-nowrap',
            render: (row) => <span className="font-medium">{row.roadmapName || '-'}</span>,
        },
        {
            key: 'specialtyName',
            header: 'Chuyên ngành',
            className: 'w-36',
            headerClassName: 'whitespace-nowrap',
            render: (row) => <span className="whitespace-nowrap">{row.specialtyName || '—'}</span>,
        },
        {
            key: 'breedName',
            header: 'Giống chó',
            className: 'w-36',
            headerClassName: 'whitespace-nowrap',
            render: (row) => <span className="whitespace-nowrap">{row.breedName || 'Tất cả giống'}</span>,
        },
        {
            key: 'totalPhases',
            header: 'Giai đoạn',
            className: 'w-20 text-center',
            headerClassName: 'whitespace-nowrap text-center',
            render: (row) => row.totalPhases ?? 0,
        },
        {
            key: 'totalDurationWeeks',
            header: 'Thời gian',
            className: 'w-24',
            headerClassName: 'whitespace-nowrap',
            render: (row) => <span className="whitespace-nowrap">{row.totalDurationWeeks ? `${row.totalDurationWeeks} tuần` : '—'}</span>,
        },
        {
            key: 'status',
            header: 'Trạng thái',
            className: 'w-28',
            headerClassName: 'whitespace-nowrap',
            render: (row) => <StatusBadge status={row.status} />,
        },
        {
            key: 'updatedAt',
            header: 'Cập nhật',
            className: 'w-32',
            headerClassName: 'whitespace-nowrap',
            render: (row) => renderDateTimeCell(row.updatedAt || row.createdAt),
        },
        {
            key: 'actions',
            header: 'Thao tác',
            className: 'w-auto',
            headerClassName: 'whitespace-nowrap',
            render: (row) => (
                <div className="flex items-center gap-0">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/details/TRAINING_ROADMAP/${getRoadmapId(row)}`)}
                        title="Xem chi tiết"
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openHistory(row)} title="Lịch sử duyệt">
                        <History className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    {canShowEdit(row) ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/training/roadmaps/${getRoadmapId(row)}/edit`)}
                            title="Sửa"
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                    ) : null}
                    {canDelete && getStatus(row) === 'DRAFT' ? (
                        <Button variant="ghost" size="sm" onClick={() => setDeleteId(getRoadmapId(row))} title="Xóa">
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    ) : null}
                    {canEdit && ['DRAFT', 'REJECTED'].includes(getStatus(row)) ? (
                        <Button variant="ghost" size="sm" onClick={() => handleSubmitForReview(row)} title="Gửi duyệt">
                            <Send className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                        </Button>
                    ) : null}
                    {canPublish && getStatus(row) === 'APPROVED' ? (
                        <Button variant="ghost" size="sm" onClick={() => handlePublish(row)} title="Xuất bản">
                            <Globe className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                        </Button>
                    ) : null}
                    {canPublish && getStatus(row) === 'PUBLISHED' ? (
                        <Button variant="ghost" size="sm" onClick={() => handleUnpublish(row)} title="Gỡ xuất bản">
                            <Undo2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    ) : null}
                </div>
            ),
        },
    ];

    return (
        <div className="animate-fade-in">
            <PageHeader
                title="Lộ trình huấn luyện"
                description="Quản lý lộ trình theo chuyên ngành, gồm nhiều giai đoạn và bài tập"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: 'Huấn luyện' },
                    { label: 'Lộ trình' },
                ]}
                actions={
                    canEdit ? (
                        <Button
                            onClick={() => navigate('/training/roadmaps/create')}
                            className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-none"
                        >
                            <Plus className="h-4 w-4" />
                            Tạo lộ trình
                        </Button>
                    ) : null
                }
            />

            <div className="flex items-center gap-3 mb-4 flex-wrap">
                <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(0);
                        }}
                        placeholder="Tìm theo tên lộ trình hoặc chuyên ngành..."
                        className="h-9 w-full pl-9 pr-3 border border-border rounded-lg text-sm bg-background outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                    />
                </div>
                <FilterSelect
                    value={specialtyFilter}
                    onChange={(value) => {
                        setSpecialtyFilter(value);
                        setPage(0);
                    }}
                    options={specialtyOptions}
                />
                <FilterSelect
                    value={statusFilter}
                    onChange={(value) => {
                        setStatusFilter(value);
                        setPage(0);
                    }}
                    options={statusOptions}
                />
            </div>

            <DataTable
                columns={columns}
                data={items}
                loading={loading}
                page={page}
                pageSize={pageSize}
                totalItems={totalItems}
                onPageChange={setPage}
                onPageSizeChange={(nextSize) => {
                    setPage(0);
                    setPageSize(nextSize);
                }}
                emptyMessage="Chưa có lộ trình nào"
            />

            <ApprovalHistoryModal
                open={historyOpen}
                onClose={() => setHistoryOpen(false)}
                loading={historyLoading}
                records={historyRecords}
                entityTitle={historyTarget.title}
                entityTypeLabel={historyTarget.typeLabel}
            />

            <ConfirmDialog
                open={Boolean(deleteId)}
                onClose={() => setDeleteId(null)}
                title="Xóa lộ trình"
                description="Bạn có chắc chắn muốn xóa lộ trình này?"
                onConfirm={handleDelete}
                confirmLabel="Xóa"
                loading={deleting}
            />
        </div>
    );
};

export default RoadmapsPage;
