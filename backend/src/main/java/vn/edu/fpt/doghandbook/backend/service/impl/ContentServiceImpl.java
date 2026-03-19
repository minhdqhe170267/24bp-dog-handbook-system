package vn.edu.fpt.doghandbook.backend.service.impl;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.fpt.doghandbook.backend.dto.request.ContentRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ContentResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.entity.Content;
import vn.edu.fpt.doghandbook.backend.entity.Media;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.ApprovableEntityType;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentType;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ConflictException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.ContentRepository;
import vn.edu.fpt.doghandbook.backend.repository.MediaRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.ContentService;
import vn.edu.fpt.doghandbook.backend.util.MediaUrlResolver;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ContentServiceImpl implements ContentService {

    private final ContentRepository contentRepository;
    private final MediaRepository mediaRepository;
    private final UserRepository userRepository;
    private final MediaUrlResolver mediaUrlResolver;

    @Override
    public PageResponse<ContentResponse> getAll(int page, int size, String search, String type, String status) {
        Pageable pageable = buildPageable(page, size);
        Page<Content> contentPage;

        String normalizedSearch = trimToNull(search);
        ContentType contentType = type == null || type.isBlank() ? null : parseContentType(type);
        ContentStatus contentStatus = status == null || status.isBlank() ? null : parseContentStatus(status);

        if (normalizedSearch != null && contentType != null && contentStatus != null) {
            contentPage = contentRepository.findByTitleContainingIgnoreCaseAndContentTypeAndStatusAndIsDeletedFalse(
                    normalizedSearch, contentType, contentStatus, pageable);
        } else if (normalizedSearch != null && contentType != null) {
            contentPage = contentRepository.findByTitleContainingIgnoreCaseAndContentTypeAndIsDeletedFalse(
                    normalizedSearch, contentType, pageable);
        } else if (normalizedSearch != null && contentStatus != null) {
            contentPage = contentRepository.findByTitleContainingIgnoreCaseAndStatusAndIsDeletedFalse(
                    normalizedSearch, contentStatus, pageable);
        } else if (contentType != null && contentStatus != null) {
            contentPage = contentRepository.findByContentTypeAndStatusAndIsDeletedFalse(
                    contentType, contentStatus, pageable);
        } else if (normalizedSearch != null) {
            contentPage = contentRepository.findByTitleContainingIgnoreCaseAndIsDeletedFalse(normalizedSearch, pageable);
        } else if (contentType != null) {
            contentPage = contentRepository.findByContentTypeAndIsDeletedFalse(contentType, pageable);
        } else if (contentStatus != null) {
            contentPage = contentRepository.findByStatusAndIsDeletedFalse(contentStatus, pageable);
        } else {
            contentPage = contentRepository.findByIsDeletedFalse(pageable);
        }

        return toContentPageResponse(contentPage);
    }

    @Override
    public ContentResponse getById(Integer id) {
        return toContentResponse(getActiveContentById(id));
    }

    @Override
    @Transactional
    public ContentResponse create(ContentRequest request, Integer authorId) {
        User author = getUserById(authorId);
        String title = normalizeRequired(request.getTitle(), "title");
        ContentType contentType = parseContentType(request.getContentType());
        String body = normalizeRequired(request.getBody(), "body");
        ContentStatus initialStatus = resolveRequestedWriteStatus(request.getStatus(), ContentStatus.DRAFT);
        ensureUniqueContentTitle(title, contentType, null);

        Content content = Content.builder()
                .title(title)
                .contentType(contentType)
                .body(body)
                .summary(trimToNull(request.getSummary()))
                .status(initialStatus)
                .author(author)
                .publishedAt(null)
                .version(1)
                .tags(trimToNull(request.getTags()))
                .isDeleted(false)
                .deletedAt(null)
                .build();

        return toContentResponse(contentRepository.save(content));
    }

    @Override
    @Transactional
    public ContentResponse update(Integer id, ContentRequest request, Integer actorId) {
        Content content = getActiveContentById(id);
        getUserById(actorId);

        if (content.getStatus() == ContentStatus.PUBLISHED) {
            throw new BadRequestException("Published content must be unpublished before update");
        }

        String title = normalizeRequired(request.getTitle(), "title");
        ContentType contentType = parseContentType(request.getContentType());
        String body = normalizeRequired(request.getBody(), "body");
        ensureUniqueContentTitle(title, contentType, id);

        content.setTitle(title);
        content.setContentType(contentType);
        content.setBody(body);
        content.setSummary(trimToNull(request.getSummary()));
        content.setTags(trimToNull(request.getTags()));
        content.setVersion(content.getVersion() + 1);

        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            ContentStatus requestedStatus = resolveRequestedWriteStatus(request.getStatus(), content.getStatus());
            content.setStatus(requestedStatus);
        } else if (content.getStatus() == ContentStatus.REJECTED) {
            content.setStatus(ContentStatus.DRAFT);
        }

        return toContentResponse(contentRepository.save(content));
    }

    @Override
    @Transactional
    public void delete(Integer id) {
        Content content = getActiveContentById(id);
        if (content.getStatus() == ContentStatus.PUBLISHED) {
            throw new BadRequestException("Published content must be unpublished before delete");
        }
        LocalDateTime now = LocalDateTime.now();

        content.setIsDeleted(true);
        content.setDeletedAt(now);

        List<Media> mediaFiles = mediaRepository.findByEntityTypeAndEntityIdAndIsDeletedFalseOrderByDisplayOrder(ApprovableEntityType.CONTENT, id);
        mediaFiles.forEach(media -> {
            media.setIsDeleted(true);
            media.setDeletedAt(now);
        });

        if (!mediaFiles.isEmpty()) {
            mediaRepository.saveAll(mediaFiles);
        }
        contentRepository.save(content);
    }

    // ── Private helpers ──────────────────────────────────────────

    private PageResponse<ContentResponse> toContentPageResponse(Page<Content> contentPage) {
        List<ContentResponse> responses = contentPage.getContent()
                .stream()
                .map(this::toContentResponse)
                .toList();

        return PageResponse.<ContentResponse>builder()
                .content(responses)
                .page(contentPage.getNumber())
                .size(contentPage.getSize())
                .totalElements(contentPage.getTotalElements())
                .totalPages(contentPage.getTotalPages())
                .build();
    }

    private ContentResponse toContentResponse(Content entity) {
        List<ContentResponse.MediaItem> mediaItems = mediaRepository
                .findByEntityTypeAndEntityIdAndIsDeletedFalseOrderByDisplayOrder(ApprovableEntityType.CONTENT, entity.getContentId())
                .stream()
                .map(this::toMediaItem)
                .toList();

        return ContentResponse.builder()
                .contentId(entity.getContentId())
                .title(entity.getTitle())
                .contentType(entity.getContentType() != null ? entity.getContentType().name() : null)
                .body(entity.getBody())
                .summary(entity.getSummary())
                .status(entity.getStatus() != null ? entity.getStatus().name() : null)
                .authorId(resolveUserId(entity.getAuthor()))
                .authorName(resolveUserFullName(entity.getAuthor()))
                .publishedAt(entity.getPublishedAt())
                .version(entity.getVersion())
                .tags(entity.getTags())
                .mediaFiles(mediaItems)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private ContentResponse.MediaItem toMediaItem(Media media) {
        return ContentResponse.MediaItem.builder()
                .mediaId(media.getMediaId())
                .filename(media.getFilename())
                .mediaType(media.getMediaType() != null ? media.getMediaType().name() : null)
                .fileUrl(mediaUrlResolver.toPublicUrl(media.getFileUrl()))
                .fileSizeBytes(media.getFileSizeBytes())
                .mimeType(media.getMimeType())
                .altText(media.getAltText())
                .displayOrder(media.getDisplayOrder())
                .build();
    }

    private Content getActiveContentById(Integer id) {
        if (id == null || id <= 0) {
            throw new BadRequestException("id must be greater than 0");
        }

        Content content = contentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Content", "id", id));

        if (Boolean.TRUE.equals(content.getIsDeleted())) {
            throw new ResourceNotFoundException("Content", "id", id);
        }
        return content;
    }

    private User getUserById(Integer userId) {
        if (userId == null || userId <= 0) {
            throw new BadRequestException("userId must be greater than 0");
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
    }

    private Pageable buildPageable(int page, int size) {
        if (page < 0) {
            throw new BadRequestException("page must be greater than or equal to 0");
        }
        if (size <= 0) {
            throw new BadRequestException("size must be greater than 0");
        }
        return PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    private void ensureUniqueContentTitle(String title, ContentType contentType, Integer contentId) {
        boolean exists = contentId == null
                ? contentRepository.existsByTitleIgnoreCaseAndContentTypeAndIsDeletedFalse(title, contentType)
                : contentRepository.existsByTitleIgnoreCaseAndContentTypeAndContentIdNotAndIsDeletedFalse(
                        title, contentType, contentId);

        if (exists) {
            throw new ConflictException("Content with the same title and type already exists");
        }
    }

    private ContentStatus resolveRequestedWriteStatus(String value, ContentStatus defaultStatus) {
        String normalized = trimToNull(value);
        if (normalized == null) {
            return defaultStatus;
        }

        ContentStatus requestedStatus = parseContentStatus(normalized);
        if (requestedStatus == ContentStatus.APPROVED
                || requestedStatus == ContentStatus.REJECTED
                || requestedStatus == ContentStatus.PUBLISHED) {
            throw new BadRequestException("APPROVED, REJECTED and PUBLISHED cannot be set directly");
        }
        return requestedStatus;
    }

    private ContentType parseContentType(String value) {
        String normalized = normalizeRequired(value, "contentType");
        try {
            return ContentType.valueOf(normalized.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Invalid content type: " + value);
        }
    }

    private ContentStatus parseContentStatus(String value) {
        String normalized = normalizeRequired(value, "status");
        try {
            return ContentStatus.valueOf(normalized.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Invalid content status: " + value);
        }
    }

    private String normalizeRequired(String value, String fieldName) {
        String normalized = trimToNull(value);
        if (normalized == null) {
            throw new BadRequestException(fieldName + " is required");
        }
        return normalized;
    }

    private String trimToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }

    private Integer resolveUserId(User user) {
        if (user == null) return null;
        try { return user.getUserId(); } catch (EntityNotFoundException ex) { return null; }
    }

    private String resolveUserFullName(User user) {
        if (user == null) return null;
        try { return user.getFullName(); } catch (EntityNotFoundException ex) { return null; }
    }
}
