import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import FilterSelect from '../../components/shared/FilterSelect';
import DetailModal from '../../components/shared/DetailModal';
import { CheckCircle, XCircle, Eye, Loader2, Search, History } from 'lucide-react';
import api from '../../services/api';
import { approvalService, APPROVAL_ENTITY_TYPES } from '../../services/approvalService';
import { useToast } from '../../components/ui/Toast';
import { Button, FormTextarea, Modal } from '../../components/ui/FormComponents';
import { sortByNewest } from '../../utils/sortByNewest';
import { fetchAllPages, paginateRows } from '../../utils/clientPagination';

const entityTypeLabels = {
    CONTENT: 'Bài viết',
    DOG_BREED: 'Giống chó',
    DOG_PROFILE: 'Hồ sơ chó',
    NUTRITION_STANDARD: 'Dinh dưỡng',
    TRAINING_EXERCISE: 'Bài tập',
    TRAINING_ROADMAP: 'Lộ trình',
    TRAINING_METHOD: 'Phương pháp',
    DEVELOPMENT_STAGE: 'Giai đoạn phát triển',
    DISEASE: 'Bệnh',
    MEDICATION: 'Thuốc',
    FIRST_AID_GUIDE: 'Sơ cứu',
};

const entityDetailEndpoints = {
    CONTENT: '/contents',
    DOG_BREED: '/breeds',
    DOG_PROFILE: '/dogs',
    NUTRITION_STANDARD: '/nutrition-standards',
    TRAINING_EXERCISE: '/exercises',
    TRAINING_ROADMAP: '/roadmaps',
    TRAINING_METHOD: '/training-methods',
    DEVELOPMENT_STAGE: '/development-stages',
    DISEASE: '/diseases',
    MEDICATION: '/medications',
    FIRST_AID_GUIDE: '/first-aid-guides',
};

const entityTitleKeys = {
    CONTENT: 'title',
    DOG_BREED: 'breedName',
    DOG_PROFILE: 'dogName',
    NUTRITION_STANDARD: 'rationName',
    TRAINING_EXERCISE: 'exerciseName',
    TRAINING_ROADMAP: 'roadmapName',
    TRAINING_METHOD: 'methodName',
    DEVELOPMENT_STAGE: 'stageName',
    DISEASE: 'diseaseName',
    MEDICATION: 'medicationName',
    FIRST_AID_GUIDE: 'guideTitle',
};

const decisionLabels = {
    APPROVED: 'Đã duyệt',
    REJECTED: 'Từ chối',
    REVISION_REQUESTED: 'Yêu cầu chỉnh sửa',
    PENDING: 'Chờ xử lý',
};

const entityTypeOptions = [
    { value: 'ALL', label: 'Tất cả loại' },
    ...Object.values(APPROVAL_ENTITY_TYPES).map((entityType) => ({
        value: entityType,
        label: entityTypeLabels[entityType] || entityType,
    })),
];

const ApprovalPage = () => {
    const navigate = useNavigate();
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [entityTypeFilter, setEntityTypeFilter] = useState('ALL');
    const [search, setSearch] = useState('');
    const [items, setItems] = useState([]);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(true);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyRecords, setHistoryRecords] = useState([]);
    const [historyTarget, setHistoryTarget] = useState(null);
    const [reviewTarget, setReviewTarget] = useState(null);
    const [reviewAction, setReviewAction] = useState('APPROVED');
    const [reviewComment, setReviewComment] = useState('');
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const toast = useToast();

    const getEntityType = (row) => row?.entityType || 'CONTENT';
    const getEntityId = (row) => row?.entityId || row?.id;
    const getEntityTitle = (row) => row?.title || row?.entityTitle || '-';
    const getEntityTypeLabel = (value) => entityTypeLabels[value] || value || '-';
    const getEntityDetailEndpoint = (entityType) => entityDetailEndpoints[entityType] || null;

    const resolveEntityTitleFromDetail = (entityType, detail, fallbackTitle) => {
        if (!detail || typeof detail !== 'object') return fallbackTitle || '-';
        const titleKey = entityTitleKeys[entityType];
        if (titleKey && detail[titleKey]) return detail[titleKey];
        if (detail.title) return detail.title;
        if (detail.entityTitle) return detail.entityTitle;
        return fallbackTitle || '-';
    };

    const resolveEntityAuthorFromDetail = (detail, row) =>
        detail?.authorName ||
        detail?.createdByName ||
        detail?.createdBy?.fullName ||
        detail?.author?.fullName ||
        row?.authorName ||
        '-';

    const resolveEntityUpdatedAt = (detail, row) =>
        detail?.updatedAt ||
        detail?.updated_at ||
        detail?.createdAt ||
        detail?.created_at ||
        row?.updatedAt ||
        row?.createdAt ||
        null;

    const resolveEntitySubmittedAt = (detail, row) =>
        detail?.submittedAt ||
        detail?.submitted_at ||
        row?.submittedAt ||
        row?.submitted_at ||
        resolveEntityUpdatedAt(detail, row);

    const fetchData = async (nextPage = page, nextPageSize = pageSize) => {
        setLoading(true);
        try {
            const rawItems = await fetchAllPages((pageIndex, batchSize) =>
                approvalService.getPending(entityTypeFilter, pageIndex, batchSize)
            );
            const normalizedRows = rawItems.map((row, index) => ({
                ...row,
                id: `${getEntityType(row)}-${getEntityId(row) || index}`,
            }));

            const enrichedRows = await Promise.all(
                normalizedRows.map(async (row) => {
                    const entityType = getEntityType(row);
                    const entityId = getEntityId(row);
                    const detailEndpoint = getEntityDetailEndpoint(entityType);
                    if (!entityId || !detailEndpoint) return row;
                    try {
                        const detailRes = await api.get(`${detailEndpoint}/${entityId}`);
                        const detail = detailRes?.data || detailRes || {};
                        return {
                            ...row,
                            title: resolveEntityTitleFromDetail(entityType, detail, getEntityTitle(row)),
                            authorName: resolveEntityAuthorFromDetail(detail, row),
                            updatedAt: resolveEntityUpdatedAt(detail, row),
                            createdAt: detail?.createdAt || detail?.created_at || row?.createdAt || row?.created_at || null,
                            submittedAt: resolveEntitySubmittedAt(detail, row),
                        };
                    } catch (error) {
                        return row;
                    }
                }),
            );

            const sortedRows = sortByNewest(enrichedRows, {
                timeKeys: ['submittedAt', 'submitted_at', 'updatedAt', 'updated_at', 'createdAt', 'created_at'],
                idKeys: ['entityId', 'id'],
            });
            const normalizedSearch = search.trim().toLowerCase();
            const filteredRows = sortedRows.filter((item) => {
                const title = getEntityTitle(item);
                return !normalizedSearch || title.toLowerCase().includes(normalizedSearch);
            });
            const { pageRows, totalItems: safeTotal, effectivePage } = paginateRows(filteredRows, nextPage, nextPageSize);
            setItems(pageRows);
            setTotalItems(safeTotal);
            if (effectivePage !== nextPage) setPage(effectivePage);
        } catch (err) { console.error('Fetch pending reviews error:', err); setItems([]); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(page, pageSize); }, [entityTypeFilter, page, pageSize, search]);

    const openDetail = (row) => {
        const entityType = getEntityType(row);
        const entityId = getEntityId(row);
        if (!entityId) return;
        const query = new URLSearchParams({
            returnTo: '/approval',
            returnLabel: 'Duyệt nội dung',
        });
        navigate(`/details/${entityType}/${entityId}?${query.toString()}`);
    };

    const closeHistory = () => {
        setHistoryOpen(false);
        setHistoryLoading(false);
        setHistoryRecords([]);
        setHistoryTarget(null);
    };

    const openHistory = async (row) => {
        const entityType = getEntityType(row);
        const entityId = getEntityId(row);
        if (!entityId) return;

        setHistoryTarget({
            entityType: getEntityTypeLabel(entityType),
            entityTitle: getEntityTitle(row),
        });
        setHistoryOpen(true);
        setHistoryLoading(true);
        setHistoryRecords([]);

        try {
            const res = await approvalService.getHistory(entityType, entityId);
            const payload = res?.data || res || [];
            const records = Array.isArray(payload) ? payload : payload.content || [];
            setHistoryRecords(records);
        } catch (err) {
            console.error('Fetch approval history error:', err);
            setHistoryRecords([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    const openReviewModal = (row, action) => {
        setReviewTarget(row);
        setReviewAction(action);
        setReviewComment('');
    };

    const closeReviewModal = () => {
        if (reviewSubmitting) return;
        setReviewTarget(null);
        setReviewAction('APPROVED');
        setReviewComment('');
    };

    const handleReview = async () => {
        const entityId = getEntityId(reviewTarget);
        if (!entityId) return;
        const comment = reviewComment.trim();
        if (reviewAction !== 'APPROVED' && !comment) {
            toast.warning('Vui lòng nhập lý do cho quyết định này');
            return;
        }

        const entityType = getEntityType(reviewTarget);
        setReviewSubmitting(true);
        try {
            await approvalService.review(entityType, entityId, reviewAction, comment);
            toast.success(reviewAction === 'APPROVED' ? 'Đã duyệt nội dung' : 'Đã từ chối nội dung');
            closeReviewModal();
            setPage(0);
            await fetchData(0, pageSize);
        } catch (err) {
            console.error('Review error:', err);
            toast.error(err, { title: 'Có lỗi xảy ra khi duyệt nội dung' });
        } finally {
            setReviewSubmitting(false);
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

    const formatDateTimeInline = (value) => {
        const parts = getDateTimeParts(value);
        if (!parts) return '—';
        return `${parts.time}${parts.date ? ` ${parts.date}` : ''}`;
    };

    const formatDecisionLabel = (decision) => decisionLabels[decision] || decision || '-';

    const columns = [
        { key: 'title', header: 'Tiêu đề', render: (r) => <span className="font-medium">{getEntityTitle(r)}</span> },
        { key: 'entityType', header: 'Loại', render: (r) => getEntityTypeLabel(getEntityType(r)) },
        { key: 'status', header: 'Trạng thái', render: (r) => <StatusBadge status={r.status} /> },
        { key: 'authorName', header: 'Tác giả', render: (r) => r.authorName || '-' },
        { key: 'submittedAt', header: 'Ngày gửi', render: (r) => renderDateTimeCell(r.submittedAt || r.updatedAt || r.createdAt) },
        {
            key: 'actions', header: 'Thao tác', render: (r) => (
                <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Xem" onClick={() => openDetail(r)}><Eye className="h-4 w-4" /></button>
                    <button className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Lịch sử duyệt" onClick={() => openHistory(r)}>
                        <History className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button className="p-1.5 rounded-md hover:bg-emerald-500/15 transition-colors" title="Duyệt" onClick={() => openReviewModal(r, 'APPROVED')}>
                        <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                    </button>
                    <button className="p-1.5 rounded-md hover:bg-red-500/15 transition-colors" title="Từ chối" onClick={() => openReviewModal(r, 'REJECTED')}>
                        <XCircle className="h-4 w-4 text-red-500 dark:text-red-300" />
                    </button>
                </div>
            )
        },
    ];

    return (
        <div className="animate-fade-in">
            <PageHeader title="Duyệt nội dung" description="Phê duyệt các nội dung chờ xét duyệt"
                        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Duyệt nội dung' }]} />
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
                <FilterSelect value={entityTypeFilter} onChange={(value) => { setEntityTypeFilter(value); setPage(0); }} options={entityTypeOptions} className="min-w-[180px]" />
            </div>
            {loading ? <div className="h-64 bg-card rounded-xl border border-border/60 animate-pulse" /> : (
                <DataTable columns={columns} data={items} page={page} pageSize={pageSize} totalItems={totalItems}
                           onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(0); }} emptyMessage="Không có nội dung nào chờ duyệt" />
            )}
            <Modal
                open={!!reviewTarget}
                onClose={closeReviewModal}
                title={reviewAction === 'APPROVED' ? 'Duyệt nội dung' : 'Từ chối nội dung'}
                width={620}
                footer={(
                    <>
                        <Button variant="outline" onClick={closeReviewModal} disabled={reviewSubmitting}>Hủy</Button>
                        <Button
                            variant={reviewAction === 'APPROVED' ? 'primary' : 'destructive'}
                            onClick={handleReview}
                            loading={reviewSubmitting}
                        >
                            {reviewAction === 'APPROVED' ? 'Xác nhận duyệt' : 'Xác nhận từ chối'}
                        </Button>
                    </>
                )}
            >
                <div className="space-y-3">
                    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                        <p className="text-sm font-medium text-foreground">{getEntityTitle(reviewTarget)}</p>
                        <p className="text-xs text-muted-foreground">{getEntityTypeLabel(getEntityType(reviewTarget))}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                            {reviewAction === 'APPROVED' ? 'Ghi chú phê duyệt (không bắt buộc)' : <>Lý do từ chối <span className="text-destructive">*</span></>}
                        </label>
                        <FormTextarea
                            rows={4}
                            value={reviewComment}
                            onChange={(event) => setReviewComment(event.target.value)}
                            placeholder={reviewAction === 'APPROVED' ? 'Nhập ghi chú nếu có...' : 'Nhập lý do từ chối...'}
                        />
                    </div>
                </div>
            </Modal>
            <DetailModal open={historyOpen} onClose={closeHistory} title="Lịch sử duyệt" size="lg">
                <div className="space-y-3">
                    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                        <p className="text-sm font-medium text-foreground">{historyTarget?.entityTitle || '-'}</p>
                        <p className="text-xs text-muted-foreground">{historyTarget?.entityType || '-'}</p>
                    </div>
                    {historyLoading ? (
                        <div className="h-24 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : historyRecords.length === 0 ? (
                        <div className="h-24 rounded-lg border border-dashed border-border/70 bg-muted/10 flex items-center justify-center">
                            <p className="text-sm text-muted-foreground">Chưa có lịch sử duyệt</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {historyRecords.map((record) => (
                                <div key={record.approvalId} className="rounded-lg border border-border/60 bg-background p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-sm font-medium text-foreground">{formatDecisionLabel(record.decision)}</p>
                                        <p className="text-xs text-muted-foreground">{formatDateTimeInline(record.reviewedAt)}</p>
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground">Reviewer: {record.reviewerName || '-'}</p>
                                    <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">{record.comments || 'Không có nhận xét'}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DetailModal>
        </div>
    );
};

export default ApprovalPage;
