import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Image as ImageIcon, Loader2, Video } from 'lucide-react';
import api from '../../services/api';

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

const EntityMediaPreview = ({ entityType, entityId, title = 'Media đã tải lên' }) => {
  const [loading, setLoading] = useState(false);
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
    [mediaFiles],
  );

  useEffect(() => {
    let cancelled = false;

    const fetchMedia = async () => {
      if (!entityType || !entityId) {
        if (!cancelled) {
          setMediaFiles([]);
          setFailedPreviews({});
        }
        return;
      }

      setLoading(true);
      try {
        const res = await api.get(`/media/entity/${entityType}/${entityId}`);
        const payload = res?.data || res || [];
        const mediaList = Array.isArray(payload) ? payload : payload.content || [];
        if (!cancelled) {
          setMediaFiles(mediaList);
          setFailedPreviews({});
        }
      } catch (error) {
        if (!cancelled) {
          setMediaFiles([]);
          setFailedPreviews({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchMedia();
    return () => {
      cancelled = true;
    };
  }, [entityType, entityId]);

  if (!entityId) return null;

  return (
    <div className="mt-4 border-t border-border pt-4">
      <h3 className="mb-2 text-sm font-semibold text-foreground">{title}</h3>
      {loading ? (
        <div className="flex items-center justify-center rounded-lg border border-border/60 py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : previewItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/70 bg-muted/10 px-3 py-4 text-center text-xs text-muted-foreground">
          Chưa có media
        </div>
      ) : (
        <div className="space-y-2">
          {previewItems.map(({ media, mediaKey, previewUrl, isVideo }) => {
            const previewFailed = failedPreviews[mediaKey];
            const canPreview = Boolean(previewUrl) && !previewFailed;

            return (
              <div
                key={mediaKey}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background px-3 py-2"
              >
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
                        {isVideo ? (
                          <Video className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{media.fileName || media.filename || '-'}</p>
                    <p className="text-xs text-muted-foreground">{media.mediaType || '-'}</p>
                  </div>
                </div>
                {previewUrl && (
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted transition-colors"
                    title="Mở media"
                  >
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EntityMediaPreview;
