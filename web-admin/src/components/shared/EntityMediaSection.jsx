import { useEffect, useMemo, useRef, useState } from 'react';
import { Image as ImageIcon, Video, Upload, Loader2, X } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../ui/Toast';
import { ConfirmDialog } from '../ui/FormComponents';

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
  const [activeMediaPreview, setActiveMediaPreview] = useState(null);
  const [previewLoadFailed, setPreviewLoadFailed] = useState(false);
  const [deleteMediaId, setDeleteMediaId] = useState(null);
  const [deletingMedia, setDeletingMedia] = useState(false);

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
      toast.error(`Tối đa ${maxFiles} tệp đa phương tiện`);
      return;
    }

    setUploading(true);
    try {
      const resolvedEntityId = await ensureEntityId();
      if (!resolvedEntityId) {
        toast.error('Cần lưu dữ liệu trước khi tải tệp đa phương tiện');
        return;
      }

      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('entityType', entityType);
        formData.append('entityId', String(resolvedEntityId));
        await api.post('/media/upload', formData);
      }

      toast.success('Tải tệp đa phương tiện thành công');
      await fetchMedia(resolvedEntityId);
    } catch (error) {
      console.error('Upload media error:', error);
      toast.error(error, { title: 'Không thể tải tệp đa phương tiện' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (disabled || !deleteMediaId) return;
    setDeletingMedia(true);
    try {
      await api.delete(`/media/${deleteMediaId}`);
      setMediaFiles((prev) => prev.filter((item) => item.mediaId !== deleteMediaId));
      toast.success('Đã xóa tệp đa phương tiện');
    } catch (error) {
      console.error('Delete media error:', error);
      toast.error(error, { title: 'Không thể xóa tệp đa phương tiện' });
    } finally {
      setDeletingMedia(false);
      setDeleteMediaId(null);
    }
  };

  const openMediaPreview = ({ media, mediaKey, previewUrl, isVideo }) => {
    if (!previewUrl) return;
    setPreviewLoadFailed(false);
    setActiveMediaPreview({
      mediaId: media?.mediaId || null,
      mediaKey,
      name: media?.fileName || media?.filename || 'Media',
      isVideo,
      previewUrl,
    });
  };

  const closeMediaPreview = () => {
    setActiveMediaPreview(null);
    setPreviewLoadFailed(false);
  };

  useEffect(() => {
    if (!activeMediaPreview) return;
    const stillExists = previewItems.some((item) => item.mediaKey === activeMediaPreview.mediaKey);
    if (!stillExists) closeMediaPreview();
  }, [previewItems, activeMediaPreview]);

  return (
    <div className="mt-6 rounded-xl border border-border/60 bg-card p-4">
      <div className="mb-3">
        <p className="text-sm font-semibold text-foreground">Media</p>
        <p className="text-xs text-muted-foreground">
          Hỗ trợ ảnh/video, tối đa {maxFiles} file. {entityId ? 'Đã liên kết với bản ghi hiện tại.' : 'Lưu nháp trước khi upload.'}
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
        <p className="text-sm text-foreground">Kéo thả file vào đây hoặc nhấp để chọn</p>
        <p className="mt-1 text-xs text-muted-foreground">Hỗ trợ ảnh và video. Tối đa {maxFiles} file.</p>
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

      <div className="mt-3">
        {listLoading ? (
          <div className="flex items-center justify-center rounded-lg border border-border/60 py-5">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : previewItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/10 px-3 py-4 text-center text-xs text-muted-foreground">
            Chưa có media
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {previewItems.map(({ media, mediaKey, previewUrl, isVideo }) => {
              const previewFailed = failedPreviews[mediaKey];
              const canPreview = Boolean(previewUrl) && !previewFailed;

              return (
                <div key={mediaKey} className="group relative rounded-xl border border-border/60 bg-background overflow-hidden">
                  <button
                    type="button"
                    onClick={() => openMediaPreview({ media, mediaKey, previewUrl, isVideo })}
                    disabled={!canPreview}
                    title={canPreview ? 'Xem chi tiết media' : 'Không xem trước được'}
                    className={`block w-full aspect-square overflow-hidden ${canPreview ? 'cursor-zoom-in' : 'cursor-not-allowed opacity-70'}`}
                  >
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
                      <div className="flex h-full w-full items-center justify-center bg-muted/20">
                        {isVideo ? (
                          <Video className="h-6 w-6 text-muted-foreground" />
                        ) : (
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                    )}
                  </button>

                  {!disabled && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setDeleteMediaId(media.mediaId);
                      }}
                      className="absolute top-2 right-2 h-7 w-7 rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600 dark:bg-red-400 dark:text-red-950 dark:hover:bg-red-300 transition-colors inline-flex items-center justify-center"
                      title="Xóa media"
                      disabled={!media.mediaId}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {activeMediaPreview && (
        <div className="fixed inset-0 z-50 bg-black/75 p-4 md:p-8" onClick={closeMediaPreview}>
          <div
            className="mx-auto flex h-full w-full max-w-5xl flex-col rounded-xl bg-card p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-sm font-medium text-foreground">{activeMediaPreview.name}</p>
              <button
                type="button"
                onClick={closeMediaPreview}
                className="h-8 w-8 rounded-full bg-red-500 text-white hover:bg-red-600 dark:bg-red-400 dark:text-red-950 dark:hover:bg-red-300 transition-colors inline-flex items-center justify-center"
                title="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-background">
              {previewLoadFailed ? (
                <p className="text-sm text-muted-foreground px-4 text-center">Không tải được xem trước media.</p>
              ) : activeMediaPreview.isVideo ? (
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
      <ConfirmDialog
        open={!!deleteMediaId}
        onClose={() => setDeleteMediaId(null)}
        title="Xóa media"
        description="Bạn có chắc chắn muốn xóa media này không?"
        onConfirm={handleDelete}
        confirmLabel="Xóa"
        loading={deletingMedia}
      />
    </div>
  );
};

export default EntityMediaSection;
