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
import vn.edu.fpt.doghandbook.backend.dto.response.UnifiedContentResponse;
import vn.edu.fpt.doghandbook.backend.entity.*;
import vn.edu.fpt.doghandbook.backend.entity.enums.ApprovableEntityType;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentType;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ConflictException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.*;
import vn.edu.fpt.doghandbook.backend.service.ContentService;
import vn.edu.fpt.doghandbook.backend.util.MediaUrlResolver;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ContentServiceImpl implements ContentService {

    private final ContentRepository contentRepository;
    private final MediaRepository mediaRepository;
    private final UserRepository userRepository;
    private final MediaUrlResolver mediaUrlResolver;
    private final DogBreedRepository dogBreedRepository;
    private final MedicationRepository medicationRepository;
    private final FirstAidGuideRepository firstAidGuideRepository;
    private final DiseaseRepository diseaseRepository;
    private final TrainingExerciseRepository trainingExerciseRepository;
    private final TrainingMethodRepository trainingMethodRepository;
    private final NutritionStandardRepository nutritionStandardRepository;

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

    @Override
    public PageResponse<UnifiedContentResponse> getAllUnified(int page, int size, String search, String entityType, String status) {
        if (page < 0) throw new BadRequestException("page must be greater than or equal to 0");
        if (size <= 0) throw new BadRequestException("size must be greater than 0");

        String normalizedSearch = trimToNull(search);
        String normalizedEntityType = trimToNull(entityType);
        String normalizedStatus = trimToNull(status);

        List<UnifiedContentResponse> allItems = new ArrayList<>();

        if (shouldInclude(normalizedEntityType, "CONTENT")) {
            contentRepository.findByIsDeletedFalse(PageRequest.of(0, Integer.MAX_VALUE)).getContent()
                    .forEach(c -> allItems.add(UnifiedContentResponse.builder()
                            .entityId(c.getContentId())
                            .entityType("CONTENT")
                            .title(c.getTitle())
                            .description(c.getSummary())
                            .status(c.getStatus() != null ? c.getStatus().name() : null)
                            .authorName(resolveUserFullName(c.getAuthor()))
                            .createdAt(c.getCreatedAt())
                            .updatedAt(c.getUpdatedAt())
                            .build()));
        }

        if (shouldInclude(normalizedEntityType, "DOG_BREED")) {
            dogBreedRepository.findAll()
                    .forEach(b -> allItems.add(UnifiedContentResponse.builder()
                            .entityId(b.getBreedId())
                            .entityType("DOG_BREED")
                            .title(b.getBreedName())
                            .description(b.getDescription())
                            .status(b.getStatus() != null ? b.getStatus().name() : null)
                            .authorName(resolveCreatedByName(b.getCreatedBy()))
                            .createdAt(b.getCreatedAt())
                            .updatedAt(b.getUpdatedAt())
                            .build()));
        }

        if (shouldInclude(normalizedEntityType, "MEDICATION")) {
            medicationRepository.findAll()
                    .forEach(m -> allItems.add(UnifiedContentResponse.builder()
                            .entityId(m.getMedicationId())
                            .entityType("MEDICATION")
                            .title(m.getMedicationName())
                            .description(m.getDescription())
                            .status(m.getStatus() != null ? m.getStatus().name() : null)
                            .authorName(resolveCreatedByName(m.getCreatedBy()))
                            .createdAt(m.getCreatedAt())
                            .updatedAt(m.getUpdatedAt())
                            .build()));
        }

        if (shouldInclude(normalizedEntityType, "FIRST_AID_GUIDE")) {
            firstAidGuideRepository.findAll()
                    .forEach(f -> allItems.add(UnifiedContentResponse.builder()
                            .entityId(f.getGuideId())
                            .entityType("FIRST_AID_GUIDE")
                            .title(f.getGuideTitle())
                            .description(f.getDescription())
                            .status(f.getStatus() != null ? f.getStatus().name() : null)
                            .authorName(resolveCreatedByName(f.getCreatedBy()))
                            .createdAt(f.getCreatedAt())
                            .updatedAt(f.getUpdatedAt())
                            .build()));
        }

        if (shouldInclude(normalizedEntityType, "DISEASE")) {
            diseaseRepository.findAll()
                    .forEach(d -> allItems.add(UnifiedContentResponse.builder()
                            .entityId(d.getDiseaseId())
                            .entityType("DISEASE")
                            .title(d.getDiseaseName())
                            .description(d.getDescription())
                            .status(d.getStatus() != null ? d.getStatus().name() : null)
                            .authorName(resolveCreatedByName(d.getCreatedBy()))
                            .createdAt(d.getCreatedAt())
                            .updatedAt(d.getUpdatedAt())
                            .build()));
        }

        if (shouldInclude(normalizedEntityType, "TRAINING_EXERCISE")) {
            trainingExerciseRepository.findAll()
                    .forEach(te -> allItems.add(UnifiedContentResponse.builder()
                            .entityId(te.getExerciseId())
                            .entityType("TRAINING_EXERCISE")
                            .title(te.getExerciseName())
                            .description(te.getDescription())
                            .status(te.getStatus() != null ? te.getStatus().name() : null)
                            .authorName(resolveCreatedByName(te.getCreatedBy()))
                            .createdAt(te.getCreatedAt())
                            .updatedAt(te.getUpdatedAt())
                            .build()));
        }

        if (shouldInclude(normalizedEntityType, "TRAINING_METHOD")) {
            trainingMethodRepository.findAll()
                    .forEach(tm -> allItems.add(UnifiedContentResponse.builder()
                            .entityId(tm.getMethodId())
                            .entityType("TRAINING_METHOD")
                            .title(tm.getMethodName())
                            .description(tm.getDescription())
                            .status(tm.getStatus() != null ? tm.getStatus().name() : null)
                            .authorName(resolveCreatedByName(tm.getCreatedBy()))
                            .createdAt(tm.getCreatedAt())
                            .updatedAt(tm.getUpdatedAt())
                            .build()));
        }

        if (shouldInclude(normalizedEntityType, "NUTRITION_STANDARD")) {
            nutritionStandardRepository.findAll()
                    .forEach(ns -> allItems.add(UnifiedContentResponse.builder()
                            .entityId(ns.getStandardId())
                            .entityType("NUTRITION_STANDARD")
                            .title(ns.getRationName())
                            .description(ns.getDescription())
                            .status(ns.getStatus())
                            .authorName(resolveCreatedByName(ns.getCreatedBy()))
                            .createdAt(ns.getCreatedAt())
                            .updatedAt(ns.getUpdatedAt())
                            .build()));
        }

        List<UnifiedContentResponse> filtered = allItems.stream()
                .filter(item -> normalizedSearch == null
                        || (item.getTitle() != null && item.getTitle().toLowerCase().contains(normalizedSearch.toLowerCase())))
                .filter(item -> normalizedStatus == null
                        || normalizedStatus.equalsIgnoreCase(item.getStatus()))
                .sorted(Comparator.comparing(UnifiedContentResponse::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());

        long totalElements = filtered.size();
        int totalPages = (int) Math.ceil((double) totalElements / size);
        int fromIndex = Math.min(page * size, filtered.size());
        int toIndex = Math.min(fromIndex + size, filtered.size());
        List<UnifiedContentResponse> pageContent = filtered.subList(fromIndex, toIndex);

        return PageResponse.<UnifiedContentResponse>builder()
                .content(pageContent)
                .page(page)
                .size(size)
                .totalElements(totalElements)
                .totalPages(totalPages)
                .build();
    }

    private boolean shouldInclude(String filterEntityType, String currentType) {
        return filterEntityType == null || filterEntityType.equalsIgnoreCase(currentType);
    }

    private String resolveCreatedByName(User user) {
        if (user == null) return null;
        try { return user.getFullName(); } catch (Exception ex) { return null; }
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
