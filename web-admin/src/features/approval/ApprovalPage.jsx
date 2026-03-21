import { useState, useEffect, useRef } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import FilterSelect from '../../components/shared/FilterSelect';
import DetailModal, { DetailView } from '../../components/shared/DetailModal';
import { CheckCircle, XCircle, Eye, Loader2, Image as ImageIcon, Video, Search, History } from 'lucide-react';
import api from '../../services/api';
import { approvalService, APPROVAL_ENTITY_TYPES } from '../../services/approvalService';

const detailFields = [
    { key: 'title', label: 'Tiêu đề', render: (d) => d.title || d.entityTitle || '-' },
    { key: 'entityType', label: 'Loại nội dung' },
    { key: 'status', label: 'Trạng thái' },
    { key: 'authorName', label: 'Tác giả' },
    { key: 'body', label: 'Nội dung', type: 'textarea' },
];

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

const detailBodyKeys = [
    'body',
    'description',
    'instructions',
    'immediateSteps',
    'indications',
    'operationalCapabilities',
    'summary',
];

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

const statusOptions = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'PENDING', label: 'Chờ duyệt' },
    { value: 'APPROVED', label: 'Đã duyệt' },
    { value: 'REJECTED', label: 'Từ chối' },
    { value: 'DRAFT', label: 'Nháp' },
    { value: 'PUBLISHED', label: 'Đã xuất bản' },
];

const ApprovalPage = () => {
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [entityTypeFilter, setEntityTypeFilter] = useState('ALL');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [items, setItems] = useState([]);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(true);
    const [detailItem, setDetailItem] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailMedia, setDetailMedia] = useState([]);
    const [failedMediaPreviews, setFailedMediaPreviews] = useState({});
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyRecords, setHistoryRecords] = useState([]);
    const [historyTarget, setHistoryTarget] = useState(null);
    const detailRequestRef = useRef(0);

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

    const resolveEntityBodyFromDetail = (detail) => {
        if (!detail || typeof detail !== 'object') return '';
        for (const key of detailBodyKeys) {
            const value = detail[key];
            if (typeof value === 'string' && value.trim()) return value;
        }
        return '';
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

    const normalizeApiBase = (value) => {
        if (!value) return '/api/v1';
        const normalized = value.trim().replace(/\/+$/, '');
        if (/^https?:\/\//i.test(normalized)) return normalized;
        return normalized.startsWith('/') ? normalized : `/${normalized}`;
    };

    const apiBase = normalizeApiBase(api?.defaults?.baseURL || import.meta.env.VITE_API_BASE_URL || '/api/v1');

    const resolveApiOrigin = () => {
        if (typeof window === 'undefined') return '';
        if (/^https?:\/\//i.test(apiBase)) {
            try {
                return new URL(apiBase).origin;
            } catch {
                return window.location.origin;
            }
        }
        return window.location.origin;
    };

    const apiOrigin = resolveApiOrigin();

    const buildAbsoluteUrl = (path) => {
        if (!path) return '';
        if (/^https?:\/\//i.test(path) || path.startsWith('blob:') || path.startsWith('data:')) {
            return path;
        }
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        return `${apiOrigin}${normalizedPath}`;
    };

    const getMediaPreviewUrl = (media) => {
        const rawUrl = (media?.fileUrl || media?.url || '').trim();
        if (rawUrl) return buildAbsoluteUrl(rawUrl);
        if (!media?.mediaId) return '';

        if (/^https?:\/\//i.test(apiBase)) {
            try {
                const parsed = new URL(apiBase);
                const basePath = parsed.pathname.replace(/\/+$/, '');
                return `${parsed.origin}${basePath}/media/${media.mediaId}/file`;
            } catch {
                return `${apiOrigin}/media/${media.mediaId}/file`;
            }
        }
        return `${apiOrigin}${apiBase}/media/${media.mediaId}/file`;
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await approvalService.getPending(entityTypeFilter, page, pageSize);
            const payload = res?.data || res || {};
            const rawItems = Array.isArray(payload) ? payload : payload.content || [];
            const normalizedRows = rawItems.map((row, index) => ({
                ...row,
                id: `${getEntityType(row)}-${getEntityId(row) || index}`,
            }));
            setItems(normalizedRows);
            setTotalItems(Array.isArray(payload) ? normalizedRows.length : payload.totalElements || normalizedRows.length);
        } catch (err) { console.error('Fetch pending reviews error:', err); setItems([]); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, [entityTypeFilter, page, pageSize]);

    const openDetail = async (row) => {
        const entityType = getEntityType(row);
        const entityId = getEntityId(row);
        if (!entityId) {
            setDetailItem(row || null);
            setDetailMedia([]);
            return;
        }

        const requestId = detailRequestRef.current + 1;
        detailRequestRef.current = requestId;
        setDetailItem({
            ...row,
            title: getEntityTitle(row),
            entityType: getEntityTypeLabel(entityType),
        });
        setDetailMedia([]);
        setFailedMediaPreviews({});
        setDetailLoading(true);

        try {
            const detailEndpoint = getEntityDetailEndpoint(entityType);
            const [detailRes, mediaRes] = await Promise.allSettled([
                detailEndpoint ? api.get(`${detailEndpoint}/${entityId}`) : Promise.resolve(null),
                api.get(`/media/entity/${entityType}/${entityId}`),
            ]);

            const entityDetail =
                detailRes.status === 'fulfilled'
                    ? detailRes.value?.data || detailRes.value || {}
                    : {};
            const mediaPayload =
                mediaRes.status === 'fulfilled'
                    ? mediaRes.value?.data || mediaRes.value || []
                    : [];
            const mediaList = Array.isArray(mediaPayload)
                ? mediaPayload
                : Array.isArray(mediaPayload.content)
                    ? mediaPayload.content
                    : [];

            if (detailRequestRef.current !== requestId) return;
            setDetailItem({
                ...row,
                ...entityDetail,
                title: resolveEntityTitleFromDetail(entityType, entityDetail, getEntityTitle(row)),
                entityType: getEntityTypeLabel(entityType),
                body: resolveEntityBodyFromDetail(entityDetail),
                authorName: resolveEntityAuthorFromDetail(entityDetail, row),
                updatedAt: resolveEntityUpdatedAt(entityDetail, row),
            });
            setDetailMedia(mediaList);
        } catch (err) {
            console.error('Fetch reviewer detail error:', err);
            if (detailRequestRef.current !== requestId) return;
            setDetailMedia([]);
        } finally {
            if (detailRequestRef.current !== requestId) return;
            setDetailLoading(false);
        }
    };

    const closeDetail = () => {
        detailRequestRef.current = 0;
        setDetailItem(null);
        setDetailMedia([]);
        setFailedMediaPreviews({});
        setDetailLoading(false);
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

    const handleReview = async (row, action) => {
        const entityId = getEntityId(row);
        if (!entityId) return;
        const comment = window.prompt(action === 'APPROVED' ? 'Ghi chú phê duyệt (không bắt buộc):' : 'Lý do từ chối:');
        if (comment === null) return;
        if (action !== 'APPROVED' && !comment.trim()) {
            alert('Vui lòng nhập lý do cho quyết định này');
            return;
        }
        const entityType = getEntityType(row);
        try { await approvalService.review(entityType, entityId, action, comment || ''); fetchData(); }
        catch (err) { console.error('Review error:', err); alert('Có lỗi xảy ra khi duyệt nội dung'); }
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
        { key: 'updatedAt', header: 'Ngày gửi', render: (r) => renderDateTimeCell(r.updatedAt || r.createdAt) },
        {
            key: 'actions', header: 'Thao tác', render: (r) => (
                <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Xem" onClick={() => openDetail(r)}><Eye className="h-4 w-4" /></button>
                    <button className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Lịch sử duyệt" onClick={() => openHistory(r)}>
                        <History className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button className="p-1.5 rounded-md hover:bg-green-100 transition-colors" title="Duyệt" onClick={() => handleReview(r, 'APPROVED')}>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </button>
                    <button className="p-1.5 rounded-md hover:bg-red-100 transition-colors" title="Từ chối" onClick={() => handleReview(r, 'REJECTED')}>
                        <XCircle className="h-4 w-4 text-red-500" />
                    </button>
                </div>
            )
        },
    ];

    const normalizedSearch = search.trim().toLowerCase();
    const filteredItems = items.filter((item) => {
        const title = getEntityTitle(item);
        const matchTitle = !normalizedSearch || title.toLowerCase().includes(normalizedSearch);
        const matchStatus = statusFilter === 'all' || item.status === statusFilter;
        return matchTitle && matchStatus;
    });
    const hasClientFilter = Boolean(normalizedSearch) || statusFilter !== 'all';

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
                <FilterSelect value={statusFilter} onChange={(value) => { setStatusFilter(value); setPage(0); }} options={statusOptions} className="min-w-[180px]" />
                <FilterSelect value={entityTypeFilter} onChange={(value) => { setEntityTypeFilter(value); setPage(0); }} options={entityTypeOptions} className="min-w-[180px]" />
            </div>
            {loading ? <div className="h-64 bg-card rounded-xl border border-border/60 animate-pulse" /> : (
                <DataTable columns={columns} data={filteredItems} page={page} pageSize={pageSize} totalItems={hasClientFilter ? filteredItems.length : totalItems}
                           onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(0); }} emptyMessage="Không có nội dung nào chờ duyệt" />
            )}
            <DetailModal open={!!detailItem} onClose={closeDetail} title="Chi tiết nội dung" size="xl">
                <DetailView fields={detailFields} data={detailItem} />
                <div className="mt-5 pt-4 border-t border-border space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">Media đính kèm</h3>
                    {detailLoading ? (
                        <div className="h-28 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : detailMedia.length === 0 ? (
                        <div className="h-28 rounded-lg border border-dashed border-border/80 bg-muted/10 flex items-center justify-center">
                            <p className="text-sm text-muted-foreground">Không có media cho nội dung này</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {detailMedia.map((media) => {
                                const mediaKey = media.mediaId || media.fileUrl || media.fileName;
                                const previewUrl = getMediaPreviewUrl(media);
                                const previewFailed = failedMediaPreviews[mediaKey];
                                const isVideo = media.mediaType === 'VIDEO';
                                const canPreview = Boolean(previewUrl) && !previewFailed;

                                return (
                                    <div key={mediaKey} className="rounded-lg border border-border/60 bg-background p-2">
                                        <div className="aspect-video w-full rounded-md border border-border/60 bg-muted/15 overflow-hidden flex items-center justify-center">
                                            {canPreview && isVideo ? (
                                                <video
                                                    src={previewUrl}
                                                    controls
                                                    preload="metadata"
                                                    className="h-full w-full object-cover"
                                                    onError={() => setFailedMediaPreviews((prev) => ({ ...prev, [mediaKey]: true }))}
                                                />
                                            ) : canPreview ? (
                                                <img
                                                    src={previewUrl}
                                                    alt={media.fileName || media.filename || 'Media'}
                                                    className="h-full w-full object-cover"
                                                    loading="lazy"
                                                    onError={() => setFailedMediaPreviews((prev) => ({ ...prev, [mediaKey]: true }))}
                                                />
                                            ) : (
                                                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                                    {isVideo ? <Video className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />}
                                                    <span className="text-xs">Không xem trước được</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-2 min-w-0">
                                            <p className="text-sm text-foreground truncate">{media.fileName || media.filename || '-'}</p>
                                            <p className="text-xs text-muted-foreground">{media.mediaType || 'MEDIA'}</p>
                                            {previewUrl && (
                                                <a
                                                    href={previewUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-xs text-accent hover:underline"
                                                >
                                                    Mở trong tab mới
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </DetailModal>
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
