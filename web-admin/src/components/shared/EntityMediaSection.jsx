import { useEffect, useMemo, useRef, useState } from 'react';
import { Image as ImageIcon, Video, Upload, EyeOff, Loader2, Eye } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../ui/Toast';

const MAX_MEDIA_FILES = 10;

const getMediaKey = (media, index) =>
  media.mediaId || media.fileUrl || media.fileName || media.filename || `media-${index}`;

const getAbsoluteUrl = (rawUrl) => {
  if (!rawUrl) return '';
  if (/^https?:\/\//i.test(rawUrl) || rawUrl.startsWith('blob:') || rawUrl.startsWith('data:')) {
    return rawUrl;
  }
  const normalizedPath = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
  return `${window.location.origin}${normalizedPath}`;
};

const isSupportedMedia = (file) =>
  file?.type?.startsWith('image/') || file?.type?.startsWith('video/');

const EntityMediaSection = ({
  entityType,
  entityId,
  onEnsureEntity,
  disabled = false,
  maxFiles = MAX_MEDIA_FILES,
}) => {
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [listLoading, setListLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [failedPreviews, setFailedPreviews] = useState({});

  const previewItems = useMemo(
    () =>
      mediaFiles.map((media, index) => {
        const mediaKey = getMediaKey(media, index);
        const fileUrl = (media.fileUrl || media.url || '').trim();
        const previewUrl = getAbsoluteUrl(fileUrl || (media.mediaId ? `/api/v1/media/${media.mediaId}/file` : ''));
        const mediaType = String(media.mediaType || '').toUpperCase();
        const isVideo = mediaType === 'VIDEO' || media.mimeType?.startsWith('video/');
        return { media, mediaKey, previewUrl, isVideo };
      }),
    [mediaFiles]
  );

  const fetchMedia = async (currentEntityId) => {
    if (!currentEntityId) {
      setMediaFiles([]);
      setFailedPreviews({});
      return;
    }

    setListLoading(true);
    try {
      const res = await api.get(`/media/entity/${entityType}/${currentEntityId}`);
      const payload = res?.data || res || [];
      const mediaList = Array.isArray(payload) ? payload : payload.content || [];
      setMediaFiles(mediaList);
      setFailedPreviews({});
    } catch (error) {
      console.error('Fetch entity media error:', error);
      setMediaFiles([]);
      setFailedPreviews({});
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia(entityId);
  }, [entityId, entityType]);

  const ensureEntityId = async () => {
    if (entityId) return entityId;
    if (!onEnsureEntity) return null;
    const ensured = await onEnsureEntity();
    return ensured?.id || null;
  };

  const uploadFiles = async (fileList) => {
    if (disabled) return;

    const files = Array.from(fileList || []);
    if (!files.length) return;

    const invalid = files.find((file) => !isSupportedMedia(file));
    if (invalid) {
      toast.error(`File không hỗ trợ: ${invalid.name}`);
      return;
    }

    if (mediaFiles.length + files.length > maxFiles) {
      toast.error(`Tối đa ${maxFiles} file media`);
      return;
    }

    setUploading(true);
    try {
      const resolvedEntityId = await ensureEntityId();
      if (!resolvedEntityId) {
        toast.error('Cần lưu dữ liệu trước khi upload media');
        return;
      }

      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('entityType', entityType);
        formData.append('entityId', String(resolvedEntityId));
        await api.post('/media/upload', formData);
      }

      toast.success('Upload media thành công');
      await fetchMedia(resolvedEntityId);
    } catch (error) {
      console.error('Upload media error:', error);
      toast.error(error?.message || 'Không thể upload media');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (mediaId) => {
    if (disabled || !mediaId) return;
    if (!window.confirm('Bạn có chắc muốn ẩn media này?')) return;

    try {
      await api.delete(`/media/${mediaId}`);
      setMediaFiles((prev) => prev.filter((item) => item.mediaId !== mediaId));
      toast.success('Đã ẩn media');
    } catch (error) {
      console.error('Delete media error:', error);
      toast.error(error?.message || 'Không thể ẩn media');
    }
  };

  return (
    <div className="mt-6 rounded-xl border border-border/60 bg-card p-4">
      <div className="mb-3">
        <p className="text-sm font-semibold text-foreground">Media</p>
        <p className="text-xs text-muted-foreground">
          Hỗ trợ ảnh/video, tối đa {maxFiles} file. {entityId ? `Đã liên kết ID: ${entityId}` : 'Lưu nháp trước khi upload.'}
        </p>
      </div>

      <div
        className={`rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
          disabled
            ? 'cursor-not-allowed border-border/60 opacity-70'
            : dragging
              ? 'cursor-pointer border-accent bg-accent/5'
              : 'cursor-pointer border-border hover:border-accent/40'
        }`}
        onClick={() => {
          if (!disabled) fileInputRef.current?.click();
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (disabled) return;
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={async (event) => {
          event.preventDefault();
          setDragging(false);
          if (disabled) return;
          await uploadFiles(event.dataTransfer.files);
        }}
      >
        {uploading ? (
          <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-accent" />
        ) : (
          <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
        )}
        <p className="text-sm text-foreground">Kéo thả hoặc bấm để chọn file</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={async (event) => {
          await uploadFiles(event.target.files);
          event.target.value = '';
        }}
        disabled={disabled}
      />

      <div className="mt-3 space-y-2">
        {listLoading ? (
          <div className="flex items-center justify-center rounded-lg border border-border/60 py-5">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : previewItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/10 px-3 py-4 text-center text-xs text-muted-foreground">
            Chưa có media
          </div>
        ) : (
          previewItems.map(({ media, mediaKey, previewUrl, isVideo }) => {
            const previewFailed = failedPreviews[mediaKey];
            const canPreview = Boolean(previewUrl) && !previewFailed;

            return (
              <div key={mediaKey} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background px-3 py-2">
                <div className="min-w-0 flex items-center gap-2">
                  <div className="h-14 w-14 overflow-hidden rounded-md border border-border/60 bg-muted/20">
                    {canPreview && isVideo ? (
                      <video
                        src={previewUrl}
                        className="h-full w-full object-cover"
                        muted
                        preload="metadata"
                        onError={() => setFailedPreviews((prev) => ({ ...prev, [mediaKey]: true }))}
                      />
                    ) : canPreview ? (
                      <img
                        src={previewUrl}
                        alt={media.fileName || media.filename || 'Media'}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        onError={() => setFailedPreviews((prev) => ({ ...prev, [mediaKey]: true }))}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        {isVideo ? <Video className="h-4 w-4 text-muted-foreground" /> : <ImageIcon className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{media.fileName || media.filename || '-'}</p>
                    <p className="text-xs text-muted-foreground">{media.mediaType || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {previewUrl && (
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted transition-colors"
                      title="Xem media"
                    >
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </a>
                  )}
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted transition-colors"
                    title="Ẩn media"
                    onClick={() => handleDelete(media.mediaId)}
                    disabled={disabled}
                  >
                    <EyeOff className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default EntityMediaSection;
