import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../../components/shared/PageHeader';
import {
    Save,
    Eye,
    Pencil,
    Send,
    Globe,
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
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../services/api';

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

const ContentCreatePage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const parsedRouteId = Number(id);
    const contentIdFromRoute = Number.isInteger(parsedRouteId) ? parsedRouteId : null;
    const isEditMode = Boolean(contentIdFromRoute) && location.pathname.endsWith('/edit');
    const isViewMode = Boolean(contentIdFromRoute) && !isEditMode;
    const fileInputRef = useRef(null);
    const [contentType, setContentType] = useState('');
    const [category, setCategory] = useState('');
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [tags, setTags] = useState('');
    const [contentId, setContentId] = useState(null);
    const [mediaFiles, setMediaFiles] = useState([]);
    const [mediaPreviewUrls, setMediaPreviewUrls] = useState({});
    const [failedPreviews, setFailedPreviews] = useState({});
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loadingContent, setLoadingContent] = useState(false);

    const getErrorMessage = (err, fallback) => {
        if (typeof err === 'string') return err;
        if (err?.message) return err.message;
        if (err?.error) return err.error;
        return fallback;
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
            alert('Vui lòng nhập Tiêu đề, Loại nội dung và Nội dung chính trước khi lưu/upload media');
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

                await fetchMediaByContent(resolvedId);
            } catch (err) {
                alert(getErrorMessage(err, 'Không tải được chi tiết nội dung'));
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

    const saveOrUpdateContent = async () => {
        if (!ensureValidContent()) {
            throw new Error('Thiếu thông tin bắt buộc');
        }

        const payload = buildPayload();

        if (contentId) {
            await api.put(`/contents/${contentId}`, payload);
            return contentId;
        }

        const created = await api.post('/contents', payload);
        const newId = created?.data?.contentId || created?.contentId;
        if (!newId) {
            throw new Error('Không lấy được contentId sau khi tạo nội dung');
        }
        setContentId(newId);
        return newId;
    };

    const isSupportedMedia = (file) =>
        file?.type?.startsWith('image/') || file?.type?.startsWith('video/');

    const handleUploadFiles = async (fileList) => {
        if (isViewMode) return;
        const picked = Array.from(fileList || []);
        if (!picked.length) return;

        const supported = picked.filter(isSupportedMedia);
        if (!supported.length) {
            alert('Chỉ hỗ trợ file ảnh và video');
            return;
        }

        const slotsLeft = MAX_MEDIA_FILES - mediaFiles.length;
        if (slotsLeft <= 0) {
            alert(`Tối đa ${MAX_MEDIA_FILES} file media`);
            return;
        }

        const queue = supported.slice(0, slotsLeft);
        if (supported.length > slotsLeft) {
            alert(`Chỉ upload ${slotsLeft} file đầu tiên vì giới hạn ${MAX_MEDIA_FILES} file`);
        }

        setUploading(true);
        try {
            const entityId = await saveOrUpdateContent();

            for (const file of queue) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('entityType', 'CONTENT');
                formData.append('entityId', String(entityId));
                await api.post('/media/upload', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
            }

            await fetchMediaByContent(entityId);
        } catch (err) {
            alert(getErrorMessage(err, 'Lỗi upload media'));
        } finally {
            setUploading(false);
        }
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
        if (isViewMode) return;
        try {
            await api.delete(`/media/${mediaId}`);
            setMediaFiles((prev) => prev.filter((m) => m.mediaId !== mediaId));
        } catch (err) {
            alert(getErrorMessage(err, 'Lỗi xóa media'));
        }
    };

    const handleSave = async (status) => {
        if (isViewMode) return;
        setSaving(true);
        try {
            const id = await saveOrUpdateContent();

            if (status === 'PENDING') {
                await api.put(`/contents/${id}/submit`);
            } else if (status === 'PUBLISHED') {
                await api.put(`/contents/${id}/publish`);
            }

            navigate('/content');
        } catch (err) {
            console.error('Save error:', err);
            alert(getErrorMessage(err, 'Lỗi khi lưu nội dung'));
        } finally {
            setSaving(false);
        }
    };

    const getMediaKey = (media, index) =>
        media.mediaId || media.fileUrl || media.fileName || media.filename || `media-${index}`;

    useEffect(() => {
        let cancelled = false;

        const loadMediaPreviewUrls = async () => {
            const nextUrls = {};

            for (let i = 0; i < mediaFiles.length; i += 1) {
                const media = mediaFiles[i];
                if (!media?.mediaId) continue;
                if (media.mediaType !== 'IMAGE' && media.mediaType !== 'VIDEO') continue;

                const mediaKey = getMediaKey(media, i);
                try {
                    const blob = await api.get(`/media/${media.mediaId}/file`, { responseType: 'blob' });
                    if (cancelled || !(blob instanceof Blob)) continue;
                    nextUrls[mediaKey] = URL.createObjectURL(blob);
                } catch {
                    if (!cancelled) {
                        setFailedPreviews((prev) => ({ ...prev, [mediaKey]: true }));
                    }
                }
            }

            if (cancelled) {
                Object.values(nextUrls).forEach((url) => URL.revokeObjectURL(url));
                return;
            }

            setMediaPreviewUrls((prev) => {
                Object.values(prev).forEach((url) => URL.revokeObjectURL(url));
                return nextUrls;
            });
        };

        loadMediaPreviewUrls();

        return () => {
            cancelled = true;
        };
    }, [mediaFiles]);

    useEffect(() => {
        return () => {
            Object.values(mediaPreviewUrls).forEach((url) => URL.revokeObjectURL(url));
        };
    }, [mediaPreviewUrls]);

    const getMediaPreviewUrl = (media, index) => {
        const mediaKey = getMediaKey(media, index);
        if (mediaPreviewUrls[mediaKey]) {
            return mediaPreviewUrls[mediaKey];
        }

        if (media?.mediaId) {
            return '';
        }

        const rawUrl = media?.fileUrl || media?.url || '';
        if (!rawUrl) return '';
        if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
        if (rawUrl.startsWith('/')) return rawUrl;
        return `/${rawUrl}`;
    };

    const pageTitle = isViewMode ? 'Chi tiết nội dung' : isEditMode ? 'Chỉnh sửa nội dung' : 'Tạo nội dung mới';
    const pageLastCrumb = isViewMode ? 'Chi tiết' : isEditMode ? 'Chỉnh sửa' : 'Tạo mới';

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
                                    <label className="text-sm font-medium text-foreground">Loại nội dung *</label>
                                    <select
                                        value={contentType}
                                        onChange={(e) => { setContentType(e.target.value); setCategory(''); }}
                                        className="w-full h-10 px-3 border border-border rounded-lg text-sm bg-card outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors cursor-pointer text-foreground"
                                        disabled={isViewMode}
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
                                        disabled={!contentType || isViewMode}
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
                                <label className="text-sm font-medium text-foreground">Tiêu đề *</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Nhập tiêu đề nội dung"
                                    maxLength={200}
                                    className="w-full h-10 px-3 border border-border rounded-lg text-sm bg-card outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors text-foreground"
                                    disabled={isViewMode}
                                />
                                <p className="text-xs text-muted-foreground text-right">{title.length}/200</p>
                            </div>

                            {/* Rich Text Editor Area */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Nội dung chính</label>
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
                                        disabled={isViewMode}
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
                                    className="w-full h-10 px-3 border border-border rounded-lg text-sm bg-card outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors text-foreground"
                                    disabled={isViewMode}
                                />
                            </div>
                        </div>
                    </motion.div>

                    {/* Media Upload */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}>
                        <div className="bg-card rounded-xl border border-border/60 p-6">
                            <label className="text-sm font-medium text-foreground block mb-3">Media</label>
                            <div
                                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isViewMode ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'} ${dragging ? 'border-accent bg-accent/5' : 'border-border'}`}
                                onClick={() => {
                                    if (!isViewMode) fileInputRef.current?.click();
                                }}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    if (isViewMode) return;
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
                                <p className="text-sm text-foreground font-medium">Kéo thả file vào đây hoặc nhấp để chọn</p>
                                <p className="text-xs text-accent mt-1">Hỗ trợ ảnh và video. Tối đa {MAX_MEDIA_FILES} file.</p>
                                {contentId && (
                                    <p className="text-xs text-muted-foreground mt-2">Đã liên kết nội dung ID: {contentId}</p>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept="image/*,video/*"
                                    className="hidden"
                                    onChange={handleFileInputChange}
                                    disabled={isViewMode}
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

                                        return (
                                        <div key={mediaKey} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background px-3 py-2">
                                            <div className="min-w-0 flex items-center gap-2">
                                                <div className="h-12 w-12 rounded-md border border-border/60 bg-muted/20 overflow-hidden flex-shrink-0">
                                                    {previewUrl && isImage && !previewFailed ? (
                                                        <img
                                                            src={previewUrl}
                                                            alt={media.fileName || media.filename || 'Ảnh media'}
                                                            className="h-full w-full object-cover"
                                                            loading="lazy"
                                                            onError={() => setFailedPreviews((prev) => ({ ...prev, [mediaKey]: true }))}
                                                        />
                                                    ) : previewUrl && isVideo && !previewFailed ? (
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
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm text-foreground truncate">{media.fileName || media.filename || '-'}</p>
                                                    <p className="text-xs text-muted-foreground">{media.mediaType} • {(media.fileSizeBytes || 0).toLocaleString()} bytes</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteMedia(media.mediaId)}
                                                className="h-8 w-8 rounded-md hover:bg-muted transition-colors flex items-center justify-center"
                                                title="Xóa media"
                                                disabled={isViewMode}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </button>
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
                            {isViewMode ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/content/${contentIdFromRoute}/edit`)}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted/50 transition-colors text-foreground cursor-pointer bg-card"
                                    >
                                        <Pencil className="h-4 w-4" /> Chỉnh sửa
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/content')}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted/50 transition-colors text-foreground cursor-pointer bg-card"
                                    >
                                        <Eye className="h-4 w-4" /> Quay lại danh sách
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => handleSave('DRAFT')}
                                        disabled={saving || uploading}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted/50 transition-colors text-foreground cursor-pointer bg-card disabled:opacity-50"
                                    >
                                        <Save className="h-4 w-4" /> Lưu nháp
                                    </button>
                                    <button
                                        type="button"
                                        className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted/50 transition-colors text-foreground cursor-pointer bg-card"
                                    >
                                        <Eye className="h-4 w-4" /> Xem trước
                                    </button>
                                    <button
                                        onClick={() => handleSave('PENDING')}
                                        disabled={saving || uploading}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
                                    >
                                        <Send className="h-4 w-4" /> Gửi duyệt
                                    </button>
                                    <button
                                        onClick={() => handleSave('PUBLISHED')}
                                        disabled={saving || uploading}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors cursor-pointer bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20 disabled:opacity-50"
                                    >
                                        <Globe className="h-4 w-4" /> Xuất bản
                                    </button>
                                </>
                            )}
                        </div>
                    </motion.div>
                </div>
                </div>
            )}
        </div>
    );
};

export default ContentCreatePage;
