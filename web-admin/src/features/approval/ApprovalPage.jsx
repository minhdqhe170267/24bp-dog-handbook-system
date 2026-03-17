import { useState, useEffect, useRef } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import FilterSelect from '../../components/shared/FilterSelect';
import DetailModal, { DetailView } from '../../components/shared/DetailModal';
import { CheckCircle, XCircle, Eye, Loader2, Image as ImageIcon, Video, Search } from 'lucide-react';
import api from '../../services/api';

const detailFields = [
    { key: 'title', label: 'Tiêu đề', render: (d) => d.title || d.contentTitle || '-' },
    { key: 'contentType', label: 'Loại nội dung' },
    { key: 'status', label: 'Trạng thái' },
    { key: 'authorName', label: 'Tác giả' },
    { key: 'body', label: 'Nội dung', type: 'textarea' },
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
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [items, setItems] = useState([]);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(true);
    const [detailItem, setDetailItem] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailMedia, setDetailMedia] = useState([]);
    const [failedMediaPreviews, setFailedMediaPreviews] = useState({});
    const detailRequestRef = useRef(0);

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

    const openDetail = async (row) => {
        const contentId = row?.contentId || row?.id;
        if (!contentId) {
            setDetailItem(row || null);
            setDetailMedia([]);
            return;
        }

        const requestId = detailRequestRef.current + 1;
        detailRequestRef.current = requestId;
        setDetailItem(row);
        setDetailMedia([]);
        setFailedMediaPreviews({});
        setDetailLoading(true);

        try {
            const [contentRes, mediaRes] = await Promise.all([
                api.get(`/contents/${contentId}`),
                api.get(`/media/entity/CONTENT/${contentId}`),
            ]);

            const contentDetail = contentRes?.data || contentRes || {};
            const mediaList = Array.isArray(mediaRes?.data) ? mediaRes.data : Array.isArray(mediaRes) ? mediaRes : [];

            if (detailRequestRef.current !== requestId) return;
            setDetailItem({ ...row, ...contentDetail });
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

    const handleReview = async (contentId, action) => {
        const comment = window.prompt(action === 'APPROVED' ? 'Ghi chú phê duyệt (không bắt buộc):' : 'Lý do từ chối:');
        if (comment === null) return;
        try { await api.post(`/contents/${contentId}/review`, { action, comment: comment || '' }); fetchData(); }
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

    const columns = [
        { key: 'title', header: 'Tiêu đề', render: (r) => <span className="font-medium">{r.title || r.contentTitle || '-'}</span> },
        { key: 'contentType', header: 'Loại', render: (r) => r.contentType || '-' },
        { key: 'status', header: 'Trạng thái', render: (r) => <StatusBadge status={r.status} /> },
        { key: 'authorName', header: 'Tác giả', render: (r) => r.authorName || '-' },
        { key: 'updatedAt', header: 'Ngày gửi', render: (r) => renderDateTimeCell(r.updatedAt || r.createdAt) },
        {
            key: 'actions', header: 'Thao tác', render: (r) => (
                <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Xem" onClick={() => openDetail(r)}><Eye className="h-4 w-4" /></button>
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

    const normalizedSearch = search.trim().toLowerCase();
    const filteredItems = items.filter((item) => {
        const title = item.title || item.contentTitle || '';
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
        </div>
    );
};

export default ApprovalPage;
