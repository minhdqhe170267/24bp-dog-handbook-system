import { useState, useEffect, useRef } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import FilterSelect from '../../components/shared/FilterSelect';
import ApprovalHistoryModal from '../../components/shared/ApprovalHistoryModal';
import DetailModal, { DetailView } from '../../components/shared/DetailModal';
import { Eye, Search, History, Loader2, Image as ImageIcon, Video } from 'lucide-react';
import api from '../../services/api';
import { approvalService, APPROVAL_ENTITY_TYPES } from '../../services/approvalService';
import { getContentTypeLabel } from '../../utils/enumLabels';
import { useToast } from '../../components/ui/Toast';

const typeOptions = [
    { value: 'all', label: 'Tất cả loại' },
    { value: APPROVAL_ENTITY_TYPES.CONTENT, label: 'Bài viết' },
    { value: APPROVAL_ENTITY_TYPES.DOG_BREED, label: 'Giống chó' },
    { value: APPROVAL_ENTITY_TYPES.DISEASE, label: 'Bệnh' },
    { value: APPROVAL_ENTITY_TYPES.MEDICATION, label: 'Thuốc' },
    { value: APPROVAL_ENTITY_TYPES.FIRST_AID_GUIDE, label: 'Sơ cứu' },
    { value: APPROVAL_ENTITY_TYPES.TRAINING_EXERCISE, label: 'Bài tập huấn luyện' },
    { value: APPROVAL_ENTITY_TYPES.TRAINING_METHOD, label: 'Phương pháp huấn luyện' },
    { value: APPROVAL_ENTITY_TYPES.NUTRITION_STANDARD, label: 'Tiêu chuẩn dinh dưỡng' },
];

const statusOptions = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'DRAFT', label: 'Nháp' },
    { value: 'PENDING', label: 'Chờ duyệt' },
    { value: 'APPROVED', label: 'Đã duyệt' },
    { value: 'PUBLISHED', label: 'Đã xuất bản' },
    { value: 'REJECTED', label: 'Từ chối' },
];

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

const detailContentKeys = [
    'description',
    'body',
    'summary',
    'instructions',
    'immediateSteps',
    'commonSymptoms',
    'treatment',
    'preventionMethods',
    'operationalCapabilities',
    'specialNotes',
    'phaseObjectives',
    'assessmentCriteria',
];

const getSortableTimestamp = (item) => {
    const value = item?.updatedAt || item?.updated_at || item?.createdAt || item?.created_at || null;
    const time = new Date(value || 0).getTime();
    return Number.isNaN(time) ? 0 : time;
};

const getSortableEntityId = (item) => {
    const parsed = Number(item?.entityId || item?.contentId || item?.id || 0);
    return Number.isFinite(parsed) ? parsed : 0;
};

const ContentListPage = () => {
    const toast = useToast();
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [contents, setContents] = useState([]);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(true);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyRecords, setHistoryRecords] = useState([]);
    const [historyTarget, setHistoryTarget] = useState({ title: '', typeLabel: '' });
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailItem, setDetailItem] = useState(null);
    const [detailMedia, setDetailMedia] = useState([]);
    const [failedMediaPreviews, setFailedMediaPreviews] = useState({});
    const detailRequestRef = useRef(0);

    const fetchContents = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', String(page));
            params.append('size', String(pageSize));
            if (search) params.append('search', search);
            if (typeFilter !== 'all') params.append('entityType', typeFilter);
            if (statusFilter !== 'all') params.append('status', statusFilter);

            const res = await api.get(`/contents/unified?${params.toString()}`);
            const payload = res?.data || res || {};
            const rows = Array.isArray(payload) ? payload : payload.content || [];
            const sortedRows = [...rows].sort((left, right) => {
                const timeDiff = getSortableTimestamp(right) - getSortableTimestamp(left);
                if (timeDiff !== 0) return timeDiff;
                return getSortableEntityId(right) - getSortableEntityId(left);
            });
            setContents(sortedRows);
            setTotalItems(Array.isArray(payload) ? rows.length : payload.totalElements || rows.length);
        } catch (err) {
            console.error('Fetch contents error:', err);
            setContents([]);
            setTotalItems(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContents();
    }, [page, pageSize, search, typeFilter, statusFilter]);

    const getEntityId = (row) => row?.entityId || row?.contentId || row?.id;
    const getEntityType = (row) => row?.entityType || APPROVAL_ENTITY_TYPES.CONTENT;

    const resolveEntityTitleFromDetail = (entityType, detail, fallbackTitle) => {
        if (!detail || typeof detail !== 'object') return fallbackTitle || '-';
        const titleKey = entityTitleKeys[entityType];
        if (titleKey && detail[titleKey]) return detail[titleKey];
        if (detail.title) return detail.title;
        return fallbackTitle || '-';
    };

    const resolveDetailContent = (detail, fallbackDescription) => {
        if (!detail || typeof detail !== 'object') return fallbackDescription || '';
        for (const key of detailContentKeys) {
            const value = detail[key];
            if (typeof value === 'string' && value.trim()) return value;
        }
        return fallbackDescription || '';
    };

    const resolveEntityAuthor = (detail, row) =>
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

    const resolveAbsoluteUrl = (path) => {
        if (!path) return '';
        if (/^https?:\/\//i.test(path) || path.startsWith('blob:') || path.startsWith('data:')) return path;
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        return `${window.location.origin}${normalizedPath}`;
    };

    const getMediaPreviewUrl = (media) => {
        const rawUrl = (media?.fileUrl || media?.url || '').trim();
        if (rawUrl) return resolveAbsoluteUrl(rawUrl);
        if (!media?.mediaId) return '';
        return `${window.location.origin}/api/v1/media/${media.mediaId}/file`;
    };

    const openView = async (row) => {
        const entityType = getEntityType(row);
        const entityId = getEntityId(row);
        const fallbackTitle = row?.title || '-';

        if (!entityId) return;

        const requestId = detailRequestRef.current + 1;
        detailRequestRef.current = requestId;

        setDetailOpen(true);
        setDetailLoading(true);
        setFailedMediaPreviews({});
        setDetailMedia([]);
        setDetailItem({
            title: fallbackTitle,
            entityType,
            status: row?.status || null,
            authorName: row?.authorName || '-',
            updatedAt: row?.updatedAt || row?.createdAt || null,
            description: row?.description || '',
        });

        try {
            const detailEndpoint = entityDetailEndpoints[entityType];
            const [detailRes, mediaRes] = await Promise.allSettled([
                detailEndpoint ? api.get(`${detailEndpoint}/${entityId}`) : Promise.resolve(null),
                api.get(`/media/entity/${entityType}/${entityId}`),
            ]);

            const detail = detailRes.status === 'fulfilled'
                ? (detailRes.value?.data || detailRes.value || {})
                : {};
            const mediaPayload = mediaRes.status === 'fulfilled'
                ? (mediaRes.value?.data || mediaRes.value || [])
                : [];
            const mediaList = Array.isArray(mediaPayload)
                ? mediaPayload
                : (Array.isArray(mediaPayload.content) ? mediaPayload.content : []);

            if (detailRequestRef.current !== requestId) return;

            setDetailItem({
                title: resolveEntityTitleFromDetail(entityType, detail, fallbackTitle),
                entityType,
                status: detail?.status || row?.status || null,
                authorName: resolveEntityAuthor(detail, row),
                updatedAt: resolveEntityUpdatedAt(detail, row),
                description: resolveDetailContent(detail, row?.description || ''),
            });
            setDetailMedia(mediaList);
        } catch (err) {
            console.error('Fetch content detail error:', err);
            if (detailRequestRef.current !== requestId) return;
            toast.error(err, { title: 'Không tải được chi tiết nội dung' });
        } finally {
            if (detailRequestRef.current !== requestId) return;
            setDetailLoading(false);
        }
    };

    const closeDetail = () => {
        detailRequestRef.current = 0;
        setDetailOpen(false);
        setDetailLoading(false);
        setDetailItem(null);
        setDetailMedia([]);
        setFailedMediaPreviews({});
    };

    const openHistory = async (row) => {
        const id = getEntityId(row);
        const entityType = getEntityType(row);
        if (!id) return;

        setHistoryTarget({
            title: row.title || '-',
            typeLabel: getContentTypeLabel(entityType),
        });
        setHistoryOpen(true);
        setHistoryLoading(true);
        setHistoryRecords([]);

        try {
            const res = await approvalService.getHistory(entityType, id);
            const payload = res?.data || res || [];
            setHistoryRecords(Array.isArray(payload) ? payload : payload.content || []);
        } catch (err) {
            console.error('Fetch content approval history error:', err);
            setHistoryRecords([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    const getDateTimeParts = (value) => {
        if (!value) return null;
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return { time: value, date: '' };
        const twoDigits = (num) => String(num).padStart(2, '0');
        return {
            time: `${twoDigits(d.getHours())}:${twoDigits(d.getMinutes())}:${twoDigits(d.getSeconds())}`,
            date: `${twoDigits(d.getDate())}/${twoDigits(d.getMonth() + 1)}/${d.getFullYear()}`,
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
        { key: 'entityType', header: 'Loại', render: (r) => getContentTypeLabel(r.entityType) },
        { key: 'status', header: 'Trạng thái', render: (r) => <StatusBadge status={r.status} /> },
        { key: 'authorName', header: 'Tác giả', render: (r) => r.authorName || '-' },
        { key: 'updatedAt', header: 'Cập nhật', render: (r) => renderDateTimeCell(r.updatedAt || r.createdAt) },
        {
            key: 'actions', header: 'Thao tác', render: (r) => (
                <div className="flex items-center gap-1">
                    <button
                        className="p-1.5 rounded-md hover:bg-muted transition-colors"
                        title="Xem"
                        onClick={() => openView(r)}
                    >
                        <Eye className="h-4 w-4" />
                    </button>
                    <button
                        className="p-1.5 rounded-md hover:bg-muted transition-colors"
                        title="Lịch sử duyệt"
                        onClick={() => openHistory(r)}
                    >
                        <History className="h-4 w-4 text-muted-foreground" />
                    </button>
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
                    placeholder="Tất cả trạng thái"
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

            <ApprovalHistoryModal
                open={historyOpen}
                onClose={() => setHistoryOpen(false)}
                loading={historyLoading}
                records={historyRecords}
                entityTitle={historyTarget.title}
                entityTypeLabel={historyTarget.typeLabel}
            />

            <DetailModal open={detailOpen} onClose={closeDetail} title="Chi tiết nội dung" size="xl">
                <DetailView
                    fields={[
                        { key: 'title', label: 'Tiêu đề' },
                        { key: 'entityType', label: 'Loại nội dung' },
                        { key: 'status', label: 'Trạng thái' },
                        { key: 'authorName', label: 'Tác giả' },
                        { key: 'updatedAt', label: 'Cập nhật', render: (d) => renderDateTimeCell(d.updatedAt) },
                        { key: 'description', label: 'Nội dung', type: 'textarea' },
                    ]}
                    data={detailItem}
                />

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
                            {detailMedia.map((media, index) => {
                                const mediaKey = media.mediaId || media.fileUrl || media.fileName || `media-${index}`;
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
        </div>
    );
};

export default ContentListPage;
