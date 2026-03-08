package vn.edu.fpt.doghandbook.backend.service.impl;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.fpt.doghandbook.backend.dto.request.ApprovalRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.ContentRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ApprovalRecordResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.ContentResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.entity.ApprovalRecord;
import vn.edu.fpt.doghandbook.backend.entity.Content;
import vn.edu.fpt.doghandbook.backend.entity.Media;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.ApprovalDecision;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentType;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.ApprovalRecordRepository;
import vn.edu.fpt.doghandbook.backend.repository.ContentRepository;
import vn.edu.fpt.doghandbook.backend.repository.MediaRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.ContentService;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ContentServiceImpl implements ContentService {

    private final ContentRepository contentRepository;
    private final MediaRepository mediaRepository;
    private final ApprovalRecordRepository approvalRecordRepository;
    private final UserRepository userRepository;

    @Override
    public PageResponse<ContentResponse> getAll(int page, int size, String search, String type, String status) {
        Pageable pageable = buildPageable(page, size);
        Page<Content> contentPage;

        if (search != null && !search.isBlank()) {
            contentPage = contentRepository.findByTitleContainingIgnoreCaseAndIsDeletedFalse(search.trim(), pageable);
        } else if (type != null && !type.isBlank()) {
            contentPage = contentRepository.findByContentTypeAndIsDeletedFalse(parseContentType(type), pageable);
        } else if (status != null && !status.isBlank()) {
            contentPage = contentRepository.findByStatusAndIsDeletedFalse(parseContentStatus(status), pageable);
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

        Content content = Content.builder()
                .title(normalizeRequired(request.getTitle(), "title"))
                .contentType(parseContentType(request.getContentType()))
                .body(normalizeRequired(request.getBody(), "body"))
                .summary(trimToNull(request.getSummary()))
                .status(ContentStatus.DRAFT)
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
    public ContentResponse update(Integer id, ContentRequest request) {
        Content content = getActiveContentById(id);

        if (content.getStatus() == ContentStatus.PUBLISHED) {
            throw new BadRequestException("Published content must be unpublished before update");
        }

        content.setTitle(normalizeRequired(request.getTitle(), "title"));
        content.setContentType(parseContentType(request.getContentType()));
        content.setBody(normalizeRequired(request.getBody(), "body"));
        content.setSummary(trimToNull(request.getSummary()));
        content.setTags(trimToNull(request.getTags()));
        content.setVersion(content.getVersion() + 1);

        if (content.getStatus() == ContentStatus.REJECTED) {
            content.setStatus(ContentStatus.DRAFT);
        }

        return toContentResponse(contentRepository.save(content));
    }

    @Override
    @Transactional
    public void delete(Integer id) {
        Content content = getActiveContentById(id);
        LocalDateTime now = LocalDateTime.now();

        content.setIsDeleted(true);
        content.setDeletedAt(now);

        List<Media> mediaFiles = mediaRepository.findByContentContentIdAndIsDeletedFalseOrderByDisplayOrder(id);
        mediaFiles.forEach(media -> {
            media.setIsDeleted(true);
            media.setDeletedAt(now);
        });

        if (!mediaFiles.isEmpty()) {
            mediaRepository.saveAll(mediaFiles);
        }
        contentRepository.save(content);
    }

    @Override
    @Transactional
    public ContentResponse submitForReview(Integer contentId) {
        Content content = getActiveContentById(contentId);
        if (content.getStatus() != ContentStatus.DRAFT && content.getStatus() != ContentStatus.REJECTED) {
            throw new BadRequestException("Only DRAFT or REJECTED content can be submitted for review");
        }

        content.setStatus(ContentStatus.PENDING);
        return toContentResponse(contentRepository.save(content));
    }

    @Override
    @Transactional
    public ContentResponse publish(Integer contentId) {
        Content content = getActiveContentById(contentId);
        if (content.getStatus() != ContentStatus.APPROVED) {
            throw new BadRequestException("Only APPROVED content can be published");
        }

        content.setStatus(ContentStatus.PUBLISHED);
        content.setPublishedAt(LocalDateTime.now());
        return toContentResponse(contentRepository.save(content));
    }

    @Override
    @Transactional
    public ApprovalRecordResponse reviewContent(Integer contentId, ApprovalRequest request, Integer reviewerId) {
        Content content = getActiveContentById(contentId);
        if (content.getStatus() != ContentStatus.PENDING) {
            throw new BadRequestException("Only PENDING content can be reviewed");
        }

        ApprovalDecision decision = parseApprovalDecision(request.getDecision());
        if (decision == ApprovalDecision.PENDING) {
            throw new BadRequestException("Invalid review decision: PENDING");
        }

        String comments = trimToNull(request.getComments());
        if (decision == ApprovalDecision.REVISION_REQUESTED && comments == null) {
            throw new BadRequestException("Comments are required for REVISION_REQUESTED");
        }

        User reviewer = getUserById(reviewerId);
        ApprovalRecord approvalRecord = ApprovalRecord.builder()
                .content(content)
                .reviewer(reviewer)
                .decision(decision)
                .comments(comments)
                .reviewedAt(LocalDateTime.now())
                .build();

        approvalRecord = approvalRecordRepository.save(approvalRecord);

        if (decision == ApprovalDecision.APPROVED) {
            content.setStatus(ContentStatus.APPROVED);
        } else {
            content.setStatus(ContentStatus.REJECTED);
        }
        contentRepository.save(content);

        return toApprovalRecordResponse(approvalRecord);
    }

    @Override
    public List<ApprovalRecordResponse> getApprovalHistory(Integer contentId) {
        getActiveContentById(contentId);
        return approvalRecordRepository.findByContentContentIdOrderByReviewedAtDesc(contentId)
                .stream()
                .map(this::toApprovalRecordResponse)
                .toList();
    }

    @Override
    public PageResponse<ContentResponse> getPendingReviews(int page, int size) {
        Pageable pageable = buildPageable(page, size);
        Page<Content> pendingPage = contentRepository
                .findByStatusAndIsDeletedFalse(ContentStatus.PENDING, pageable);
        return toContentPageResponse(pendingPage);
    }

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
                .findByContentContentIdAndIsDeletedFalseOrderByDisplayOrder(entity.getContentId())
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
                .fileUrl(media.getFileUrl())
                .fileSizeBytes(media.getFileSizeBytes())
                .mimeType(media.getMimeType())
                .altText(media.getAltText())
                .displayOrder(media.getDisplayOrder())
                .build();
    }

    private ApprovalRecordResponse toApprovalRecordResponse(ApprovalRecord entity) {
        Content content = entity.getContent();
        User reviewer = entity.getReviewer();

        return ApprovalRecordResponse.builder()
                .approvalId(entity.getApprovalId())
                .contentId(resolveContentId(content))
                .contentTitle(resolveContentTitle(content))
                .reviewerId(resolveUserId(reviewer))
                .reviewerName(resolveUserFullName(reviewer))
                .decision(entity.getDecision() != null ? entity.getDecision().name() : null)
                .comments(entity.getComments())
                .reviewedAt(entity.getReviewedAt())
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

    private ApprovalDecision parseApprovalDecision(String value) {
        String normalized = normalizeRequired(value, "decision");
        try {
            return ApprovalDecision.valueOf(normalized.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Invalid approval decision: " + value);
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
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private Integer resolveUserId(User user) {
        if (user == null) {
            return null;
        }
        try {
            return user.getUserId();
        } catch (EntityNotFoundException ex) {
            return null;
        }
    }

    private String resolveUserFullName(User user) {
        if (user == null) {
            return null;
        }
        try {
            return user.getFullName();
        } catch (EntityNotFoundException ex) {
            return null;
        }
    }

    private Integer resolveContentId(Content content) {
        if (content == null) {
            return null;
        }
        try {
            return content.getContentId();
        } catch (EntityNotFoundException ex) {
            return null;
        }
    }

    private String resolveContentTitle(Content content) {
        if (content == null) {
            return null;
        }
        try {
            return content.getTitle();
        } catch (EntityNotFoundException ex) {
            return null;
        }
    }
}
