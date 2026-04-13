import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../../components/shared/PageHeader';
import {
    ArrowLeft,
    Eye,
    Bold,
    Italic,
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    Quote,
    Undo,
    Redo,
    Upload,
    Loader2,
    Trash2,
    Image as ImageIcon,
    Video,
    X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';

const contentTypeLabels = {
    BREED_INFO: 'Giống chó',
    TRAINING_GUIDE: 'Huấn luyện',
    HEALTH_INFO: 'Sức khỏe',
    NUTRITION_GUIDE: 'Dinh dưỡng',
    FIRST_AID: 'Sơ cứu',
};

const categories = {
    BREED_INFO: ['Chăm sóc', 'Giới thiệu', 'Dinh dưỡng'],
    TRAINING_GUIDE: ['Cơ bản', 'Nâng cao', 'Tác chiến'],
    HEALTH_INFO: ['Truyền nhiễm', 'Mãn tính', 'Sơ cứu'],
    NUTRITION_GUIDE: ['Khẩu phần', 'Dinh dưỡng', 'Thực phẩm'],
    FIRST_AID: ['Ngộ độc', 'Chấn thương', 'Say nắng'],
};

const MAX_MEDIA_FILES = 10;
const MAX_TAG_LENGTH = 255;

const ContentCreatePage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const toast = useToast();
    const { id } = useParams();
    const parsedRouteId = Number(id);
    const contentIdFromRoute = Number.isInteger(parsedRouteId) ? parsedRouteId : null;
    const isEditMode = Boolean(contentIdFromRoute) && location.pathname.endsWith('/edit');
    const isViewMode = Boolean(contentIdFromRoute) && !isEditMode;
    const isReadonlyMode = true;
    const fileInputRef = useRef(null);
    const [contentType, setContentType] = useState('');
    const [category, setCategory] = useState('');
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [tags, setTags] = useState('');
    const [contentStatus, setContentStatus] = useState('DRAFT');
    const [contentId, setContentId] = useState(null);
    const [mediaFiles, setMediaFiles] = useState([]);
    const [failedPreviews, setFailedPreviews] = useState({});
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loadingContent, setLoadingContent] = useState(false);
    const [activeMediaPreview, setActiveMediaPreview] = useState(null);
    const [previewLoadFailed, setPreviewLoadFailed] = useState(false);
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

    const buildApiUrl = (path) => {
        if (!path) return '';
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;

        if (/^https?:\/\//i.test(apiBase)) {
            try {
                const parsed = new URL(apiBase);
                const basePath = parsed.pathname.replace(/\/+$/, '');
                return `${parsed.origin}${basePath}${normalizedPath}`;
            } catch {
                return `${apiOrigin}${normalizedPath}`;
            }
        }

        return `${apiOrigin}${apiBase}${normalizedPath}`;
    };

    const buildAbsoluteUrl = (path) => {
        if (!path) return '';
        if (/^https?:\/\//i.test(path) || path.startsWith('blob:') || path.startsWith('data:')) {
            return path;
        }
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        return `${apiOrigin}${normalizedPath}`;
    };

    const buildPayload = () => ({
        title: title.trim(),
        contentType,
        body: body.trim(),
        summary: category || null,
        tags: tags.trim() || null,
    });

    const ensureValidContent = () => {
        if (!title.trim() || !contentType || !body.trim()) {
            toast.warning('Vui lòng nhập Tiêu đề, Loại nội dung và Nội dung chính trước khi lưu hoặc tải tệp đa phương tiện');
            return false;
        }
        if (tags.trim().length > MAX_TAG_LENGTH) {
            toast.warning(`Tags tối đa ${MAX_TAG_LENGTH} ký tự`);
            return false;
        }
        return true;
    };

    const fetchMediaByContent = async (id) => {
        const res = await api.get(`/media/entity/CONTENT/${id}`);
        const mediaList = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        setMediaFiles(mediaList);
        setFailedPreviews({});
    };

    useEffect(() => {
        let active = true;

        const fetchContentById = async () => {
            if (!contentIdFromRoute) return;
            setLoadingContent(true);
            try {
                const res = await api.get(`/contents/${contentIdFromRoute}`);
                const detail = res?.data || res || {};

                if (!active) return;

                const resolvedId = detail.contentId || contentIdFromRoute;
                setContentId(resolvedId);
                setContentType(detail.contentType || '');
                setCategory(detail.summary || '');
                setTitle(detail.title || '');
                setBody(detail.body || '');
                setTags(detail.tags || '');
                setContentStatus((detail.status || 'DRAFT').toUpperCase());

                await fetchMediaByContent(resolvedId);
            } catch (err) {
                toast.error(err, { title: 'Không tải được chi tiết nội dung' });
                navigate('/content');
            } finally {
                if (active) setLoadingContent(false);
            }
        };

        fetchContentById();

        return () => {
            active = false;
        };
    }, [contentIdFromRoute, navigate]);

    const isSupportedMedia = (file) =>
        file?.type?.startsWith('image/') || file?.type?.startsWith('video/');

    const revokeBlobUrls = (items) => {
        items.forEach((item) => {
            const url = item?.fileUrl;
            if (typeof url === 'string' && url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
        });
    };

    const handleUploadFiles = async (fileList) => {
        return;
    };

    const handleFileInputChange = async (e) => {
        await handleUploadFiles(e.target.files);
        e.target.value = '';
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        setDragging(false);
        await handleUploadFiles(e.dataTransfer.files);
    };

    const handleDeleteMedia = async (mediaId) => {
        if (isReadonlyMode) return;
        if (!mediaId) return;
        try {
            await api.delete(`/media/${mediaId}`);
            setMediaFiles((prev) => prev.filter((m) => m.mediaId !== mediaId));
        } catch (err) {
            toast.error(err, { title: 'Không thể xóa tệp đa phương tiện' });
        }
    };

    const getMediaKey = (media, index) =>
        media.tempId || media.mediaId || media.fileUrl || media.fileName || media.filename || `media-${index}`;

    const getMediaPreviewUrl = (media, index) => {
        const rawUrl = (media?.fileUrl || media?.url || '').trim();
        if (media?.tempId && rawUrl.startsWith('blob:')) {
            return rawUrl;
        }
        if (rawUrl) {
            return buildAbsoluteUrl(rawUrl);
        }
        if (media?.mediaId) {
            return buildApiUrl(`/media/${media.mediaId}/file`);
        }
        return '';
    };

    const openMediaPreview = (media, index) => {
        const previewUrl = getMediaPreviewUrl(media, index);
        if (!previewUrl) return;

        setPreviewLoadFailed(false);
        setActiveMediaPreview({
            mediaKey: getMediaKey(media, index),
            name: media.fileName || media.filename || 'Media',
            mediaType: media.mediaType,
            previewUrl,
        });
    };

    const closeMediaPreview = () => {
        setActiveMediaPreview(null);
        setPreviewLoadFailed(false);
    };

    useEffect(() => {
        if (!activeMediaPreview) return;
        const stillExists = mediaFiles.some((media, index) => getMediaKey(media, index) === activeMediaPreview.mediaKey);
        if (!stillExists) {
            setActiveMediaPreview(null);
            setPreviewLoadFailed(false);
        }
    }, [mediaFiles, activeMediaPreview]);

    const pageTitle = isReadonlyMode ? 'Chi tiết nội dung' : isEditMode ? 'Chỉnh sửa nội dung' : 'Tạo nội dung mới';
    const pageLastCrumb = isReadonlyMode ? 'Chi tiết' : isEditMode ? 'Chỉnh sửa' : 'Tạo mới';

    return (
        <div className="animate-fade-in">
            <PageHeader
                title={pageTitle}
                breadcrumbs={[
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: 'Nội dung', href: '/content' },
                    { label: pageLastCrumb },
                ]}
            />

            {loadingContent && contentIdFromRoute ? (
                <div className="h-64 bg-card rounded-xl border border-border/60 animate-pulse" />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Form */}
                <div className="lg:col-span-2 space-y-6">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                        <div className="bg-card rounded-xl border border-border/60 p-6 space-y-5">
                            {/* Type + Category */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Loại nội dung <span className="text-destructive">*</span></label>
                                    <select
                                        value={contentType}
                                        onChange={(e) => { setContentType(e.target.value); setCategory(''); }}
                                        className="w-full h-10 px-3 border border-border rounded-lg text-sm bg-card outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors cursor-pointer text-foreground"
                                        disabled={isReadonlyMode}
                                    >
                                        <option value="">Chọn loại</option>
                                        {Object.entries(contentTypeLabels).map(([k, v]) => (
                                            <option key={k} value={k}>{v}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Danh mục</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full h-10 px-3 border border-border rounded-lg text-sm bg-card outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors cursor-pointer text-foreground"
                                        disabled={!contentType || isReadonlyMode}
                                    >
                                        <option value="">Chọn danh mục</option>
                                        {(categories[contentType] || []).map((c) => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Title */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Tiêu đề <span className="text-destructive">*</span></label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Nhập tiêu đề nội dung"
                                    maxLength={200}
                                    className="w-full h-10 px-3 border border-border rounded-lg text-sm bg-card outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors text-foreground"
                                    disabled={isReadonlyMode}
                                />
                                <p className="text-xs text-muted-foreground text-right">{title.length}/200</p>
                            </div>

                            {/* Rich Text Editor Area */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Nội dung chính <span className="text-destructive">*</span></label>
                                <div className="border border-border rounded-lg overflow-hidden">
                                    {/* Toolbar */}
                                    <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-muted/30 flex-wrap">
                                        {[
                                            { icon: Bold, title: 'Bold' },
                                            { icon: Italic, title: 'Italic' },
                                            { icon: Heading1, title: 'H1' },
                                            { icon: Heading2, title: 'H2' },
                                            { icon: Heading3, title: 'H3' },
                                            { icon: List, title: 'Bullet List' },
                                            { icon: ListOrdered, title: 'Numbered List' },
                                            { icon: Quote, title: 'Quote' },
                                        ].map((tool, i) => (
                                            <button
                                                key={i}
                                                className="p-1.5 rounded hover:bg-muted transition-colors"
                                                title={tool.title}
                                                type="button"
                                            >
                                                <tool.icon className="h-4 w-4 text-muted-foreground" />
                                            </button>
                                        ))}
                                        <div className="w-px h-5 bg-border mx-1" />
                                        <button className="p-1.5 rounded hover:bg-muted transition-colors" title="Undo" type="button">
                                            <Undo className="h-4 w-4 text-muted-foreground" />
                                        </button>
                                        <button className="p-1.5 rounded hover:bg-muted transition-colors" title="Redo" type="button">
                                            <Redo className="h-4 w-4 text-muted-foreground" />
                                        </button>
                                    </div>
                                    {/* Editor area */}
                                    <textarea
                                        value={body}
                                        onChange={(e) => setBody(e.target.value)}
                                        placeholder="Nhập nội dung bài viết..."
                                        rows={10}
                                        className="w-full px-4 py-3 text-sm bg-card outline-none resize-none text-foreground placeholder:text-muted-foreground"
                                        disabled={isReadonlyMode}
                                    />
                                </div>
                            </div>

                            {/* Tags */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Tags</label>
                                <input
                                    type="text"
                                    value={tags}
                                    onChange={(e) => setTags(e.target.value)}
                                    placeholder="Nhập tags, phân cách bằng dấu phẩy"
                                    maxLength={MAX_TAG_LENGTH}
                                    className="w-full h-10 px-3 border border-border rounded-lg text-sm bg-card outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors text-foreground"
                                    disabled={isReadonlyMode}
                                />
                            </div>
                        </div>
                    </motion.div>

                    {/* Media Upload */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}>
                        <div className="bg-card rounded-xl border border-border/60 p-6">
                            <label className="text-sm font-medium text-foreground block mb-3">Media</label>
                            <div
                                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isReadonlyMode ? 'cursor-default opacity-90' : 'cursor-pointer'} ${dragging ? 'border-accent bg-accent/5' : 'border-border'}`}
                                onClick={() => {
                                    if (!isReadonlyMode) fileInputRef.current?.click();
                                }}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    if (isReadonlyMode) return;
                                    setDragging(true);
                                }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={handleDrop}
                            >
                                {uploading ? (
                                    <Loader2 className="h-8 w-8 text-accent mx-auto mb-3 animate-spin" />
                                ) : (
                                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                                )}
                                <p className="text-sm text-foreground font-medium">
                                    {isReadonlyMode ? 'Media đính kèm (chỉ xem)' : 'Kéo thả file vào đây hoặc nhấp để chọn'}
                                </p>
                                <p className="text-xs text-accent mt-1">
                                    {isReadonlyMode ? 'Ảnh và video đã upload cho nội dung này.' : `Hỗ trợ ảnh và video. Tối đa ${MAX_MEDIA_FILES} file.`}
                                </p>
                                {contentId && (
                                    <p className="text-xs text-muted-foreground mt-2">Đã liên kết nội dung hiện tại</p>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept="image/*,video/*"
                                    className="hidden"
                                    onChange={handleFileInputChange}
                                    disabled={isReadonlyMode}
                                />
                            </div>

                            {mediaFiles.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    {mediaFiles.map((media, index) => {
                                        const mediaKey = getMediaKey(media, index);
                                        const previewUrl = getMediaPreviewUrl(media, index);
                                        const previewFailed = failedPreviews[mediaKey];
                                        const isVideo = media.mediaType === 'VIDEO';
                                        const isImage = media.mediaType === 'IMAGE';
                                        const canOpenPreview = Boolean(previewUrl);
                                        const canRenderThumb = canOpenPreview && !previewFailed;

                                        return (
                                        <div key={mediaKey} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background px-3 py-2">
                                            <div className="min-w-0 flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => openMediaPreview(media, index)}
                                                    disabled={!canOpenPreview}
                                                    className={`h-16 w-16 rounded-md border border-border/60 bg-muted/20 overflow-hidden flex-shrink-0 ${canOpenPreview ? 'cursor-zoom-in hover:ring-2 hover:ring-accent/30' : 'cursor-not-allowed opacity-80'}`}
                                                    title={canOpenPreview ? 'Xem chi tiet' : 'Khong co preview'}
                                                >
                                                    {canRenderThumb && isImage ? (
                                                        <img
                                                            src={previewUrl}
                                                            alt={media.fileName || media.filename || 'Ảnh media'}
                                                            className="h-full w-full object-cover"
                                                            loading="lazy"
                                                            onError={() => setFailedPreviews((prev) => ({ ...prev, [mediaKey]: true }))}
                                                        />
                                                    ) : canRenderThumb && isVideo ? (
                                                        <video
                                                            src={previewUrl}
                                                            className="h-full w-full object-cover"
                                                            muted
                                                            preload="metadata"
                                                            onError={() => setFailedPreviews((prev) => ({ ...prev, [mediaKey]: true }))}
                                                        />
                                                    ) : (
                                                        <div className="h-full w-full flex items-center justify-center">
                                                            {isVideo ? (
                                                                <Video className="h-4 w-4 text-muted-foreground" />
                                                            ) : (
                                                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                                            )}
                                                        </div>
                                                    )}
                                                </button>
                                                <div className="min-w-0">
                                                    <p className="text-sm text-foreground truncate">{media.fileName || media.filename || '-'}</p>
                                                    <p className="text-xs text-muted-foreground">{media.mediaType} • {(media.fileSizeBytes || 0).toLocaleString()} bytes</p>
                                                    {canOpenPreview && (
                                                        <button
                                                            type="button"
                                                            onClick={() => openMediaPreview(media, index)}
                                                            className="text-xs text-accent hover:underline"
                                                        >
                                                            Xem chi tiet
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => openMediaPreview(media, index)}
                                                    className="h-8 w-8 rounded-md hover:bg-muted transition-colors flex items-center justify-center"
                                                    title="Xem chi tiet"
                                                    disabled={!canOpenPreview}
                                                >
                                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                                </button>
                                                {!isReadonlyMode && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteMedia(media.mediaId)}
                                                        className="h-8 w-8 rounded-md hover:bg-muted transition-colors flex items-center justify-center"
                                                        title="Xóa media"
                                                        disabled={!media.mediaId}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )})}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Sidebar actions */}
                <div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}>
                        <div className="bg-card rounded-xl border border-border/60 p-6 space-y-3">
                            <h3 className="font-semibold text-sm text-foreground">Hành động</h3>
                            <button
                                type="button"
                                onClick={() => navigate('/content')}
                                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted/50 transition-colors text-foreground cursor-pointer bg-card"
                            >
                                <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
                            </button>
                        </div>
                    </motion.div>
                </div>
                </div>
            )}

            {activeMediaPreview && (
                <div
                    className="fixed inset-0 z-50 bg-black/75 p-4 md:p-8"
                    onClick={closeMediaPreview}
                >
                    <div
                        className="mx-auto flex h-full w-full max-w-5xl flex-col rounded-xl bg-card p-4 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <p className="min-w-0 truncate text-sm font-medium text-foreground">
                                {activeMediaPreview.name}
                            </p>
                            <button
                                type="button"
                                onClick={closeMediaPreview}
                                className="h-8 w-8 rounded-md hover:bg-muted transition-colors flex items-center justify-center"
                                title="Dong"
                            >
                                <X className="h-4 w-4 text-muted-foreground" />
                            </button>
                        </div>
                        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-background">
                            {previewLoadFailed ? (
                                <div className="px-4 text-center">
                                    <p className="text-sm text-foreground">Khong tai duoc preview media.</p>
                                    <a
                                        href={activeMediaPreview.previewUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-2 inline-block text-sm text-accent hover:underline"
                                    >
                                        Mo file trong tab moi
                                    </a>
                                </div>
                            ) : activeMediaPreview.mediaType === 'VIDEO' ? (
                                <video
                                    src={activeMediaPreview.previewUrl}
                                    controls
                                    autoPlay
                                    className="max-h-full max-w-full"
                                    onError={() => setPreviewLoadFailed(true)}
                                />
                            ) : (
                                <img
                                    src={activeMediaPreview.previewUrl}
                                    alt={activeMediaPreview.name}
                                    className="max-h-full max-w-full object-contain"
                                    onError={() => setPreviewLoadFailed(true)}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContentCreatePage;
