package vn.edu.fpt.doghandbook.backend.service.impl;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.fpt.doghandbook.backend.dto.request.MediaUpdateRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.MediaResponse;
import vn.edu.fpt.doghandbook.backend.entity.Content;
import vn.edu.fpt.doghandbook.backend.entity.Media;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.MediaType;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.ContentRepository;
import vn.edu.fpt.doghandbook.backend.repository.MediaRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.MediaService;
import vn.edu.fpt.doghandbook.backend.util.MediaUrlResolver;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MediaServiceImpl implements MediaService {

    private static final String CONTENT_ENTITY_TYPE = "CONTENT";
    private static final long MAX_IMAGE_SIZE_BYTES = 10L * 1024 * 1024;
    private static final long MAX_VIDEO_SIZE_BYTES = 100L * 1024 * 1024;

    private final MediaRepository mediaRepository;
    private final ContentRepository contentRepository;
    private final UserRepository userRepository;
    private final MediaUrlResolver mediaUrlResolver;

    @Value("${app.upload.dir:uploads/}")
    private String uploadDir;

    @Override
    @Transactional
    public MediaResponse upload(
            MultipartFile file,
            String entityType,
            Integer entityId,
            Integer uploadedBy,
            String altText,
            Integer displayOrder
    ) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File is required");
        }
        if (displayOrder != null && displayOrder <= 0) {
            throw new BadRequestException("displayOrder must be greater than 0");
        }

        String normalizedEntityType = normalizeEntityType(entityType);
        if (!CONTENT_ENTITY_TYPE.equals(normalizedEntityType)) {
            throw new BadRequestException("Only entityType=CONTENT is supported");
        }

        Content content = getActiveContentById(entityId);
        User uploader = getUserById(uploadedBy);

        String cleanOriginalName = sanitizeFilename(file.getOriginalFilename());
        MediaType mediaType = detectMediaType(file.getContentType(), cleanOriginalName);
        validateFile(file, mediaType);
        String storedName = UUID.randomUUID() + "_" + cleanOriginalName;

        Path uploadRoot = resolveUploadDir();
        Path targetPath = uploadRoot.resolve(storedName).normalize();
        if (!targetPath.startsWith(uploadRoot)) {
            throw new BadRequestException("Invalid file path");
        }

        try (InputStream inputStream = file.getInputStream()) {
            Files.copy(inputStream, targetPath, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException ex) {
            throw new BadRequestException("Could not store file: " + ex.getMessage());
        }

        Media media = Media.builder()
                .content(content)
                .filename(cleanOriginalName)
                .mediaType(mediaType)
                .fileUrl(buildFileUrl(storedName))
                .fileSizeBytes(file.getSize())
                .mimeType(file.getContentType())
                .altText(normalizeAltText(altText))
                .displayOrder(displayOrder != null ? displayOrder : 1)
                .uploadedBy(uploader)
                .isDeleted(false)
                .deletedAt(null)
                .build();

        Media savedMedia = mediaRepository.save(media);
        reorderMedia(savedMedia, displayOrder);
        return toResponse(getActiveMediaById(savedMedia.getMediaId()));
    }

    @Override
    public MediaResponse getById(Integer id) {
        return toResponse(getActiveMediaById(id));
    }

    @Override
    public List<MediaResponse> getByEntity(String entityType, Integer entityId) {
        String normalizedEntityType = normalizeEntityType(entityType);
        if (!CONTENT_ENTITY_TYPE.equals(normalizedEntityType)) {
            throw new BadRequestException("Only entityType=CONTENT is supported");
        }
        if (entityId == null || entityId <= 0) {
            throw new BadRequestException("entityId must be greater than 0");
        }

        return mediaRepository.findByContentContentIdAndIsDeletedFalseOrderByDisplayOrder(entityId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public MediaResponse updateMetadata(Integer id, MediaUpdateRequest request) {
        Media media = getActiveMediaById(id);
        media.setAltText(normalizeAltText(request.getAltText()));
        mediaRepository.save(media);
        reorderMedia(media, request.getDisplayOrder());
        return toResponse(getActiveMediaById(id));
    }

    @Override
    @Transactional
    public void delete(Integer id) {
        Media media = getActiveMediaById(id);
        Integer contentId = resolveContentId(media.getContent());
        media.setIsDeleted(true);
        media.setDeletedAt(LocalDateTime.now());
        mediaRepository.save(media);
        if (contentId != null) {
            List<Media> remainingMedia = mediaRepository.findByContentContentIdAndIsDeletedFalseOrderByDisplayOrder(contentId);
            for (int index = 0; index < remainingMedia.size(); index++) {
                remainingMedia.get(index).setDisplayOrder(index + 1);
            }
            mediaRepository.saveAll(remainingMedia);
        }
        tryDeleteLocalFile(media.getFileUrl());
    }

    private Media getActiveMediaById(Integer id) {
        if (id == null || id <= 0) {
            throw new BadRequestException("id must be greater than 0");
        }
        return mediaRepository.findByMediaIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Media", "id", id));
    }

    private Content getActiveContentById(Integer contentId) {
        if (contentId == null || contentId <= 0) {
            throw new BadRequestException("entityId must be greater than 0");
        }

        Content content = contentRepository.findById(contentId)
                .orElseThrow(() -> new ResourceNotFoundException("Content", "id", contentId));
        if (Boolean.TRUE.equals(content.getIsDeleted())) {
            throw new ResourceNotFoundException("Content", "id", contentId);
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

    private Path resolveUploadDir() {
        Path path = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(path);
        } catch (IOException ex) {
            throw new BadRequestException("Could not create upload directory: " + ex.getMessage());
        }
        return path;
    }

    private String buildFileUrl(String storedName) {
        String normalizedUploadDir = uploadDir.replace("\\", "/");
        if (!normalizedUploadDir.endsWith("/")) {
            normalizedUploadDir += "/";
        }
        return normalizedUploadDir + storedName;
    }

    private void reorderMedia(Media targetMedia, Integer requestedDisplayOrder) {
        Integer contentId = resolveContentId(targetMedia.getContent());
        if (contentId == null) {
            mediaRepository.save(targetMedia);
            return;
        }

        List<Media> mediaItems = new ArrayList<>(
                mediaRepository.findByContentContentIdAndIsDeletedFalseOrderByDisplayOrder(contentId)
        );
        if (mediaItems.isEmpty()) {
            return;
        }

        mediaItems.removeIf(media -> media.getMediaId().equals(targetMedia.getMediaId()));

        int insertIndex = Math.min(Math.max(targetMedia.getDisplayOrder() - 1, 0), mediaItems.size());
        if (requestedDisplayOrder != null) {
            if (requestedDisplayOrder <= 0) {
                throw new BadRequestException("displayOrder must be greater than 0");
            }
            insertIndex = Math.min(requestedDisplayOrder - 1, mediaItems.size());
        }

        mediaItems.add(insertIndex, targetMedia);
        for (int index = 0; index < mediaItems.size(); index++) {
            mediaItems.get(index).setDisplayOrder(index + 1);
        }
        mediaRepository.saveAll(mediaItems);
    }

    private void tryDeleteLocalFile(String fileUrl) {
        if (fileUrl == null || fileUrl.isBlank()) {
            return;
        }

        try {
            Path path = Paths.get(fileUrl);
            if (!path.isAbsolute()) {
                path = Paths.get("").toAbsolutePath().resolve(fileUrl).normalize();
            }
            Files.deleteIfExists(path);
        } catch (IOException ignored) {
        }
    }

    private MediaType detectMediaType(String mimeType, String fileName) {
        String normalizedMime = mimeType == null ? "" : mimeType.toLowerCase(Locale.ROOT);
        if (normalizedMime.startsWith("image/")) {
            return MediaType.IMAGE;
        }
        if (normalizedMime.startsWith("video/")) {
            return MediaType.VIDEO;
        }

        String normalizedName = fileName == null ? "" : fileName.toLowerCase(Locale.ROOT);
        if (normalizedName.endsWith(".png")
                || normalizedName.endsWith(".jpg")
                || normalizedName.endsWith(".jpeg")
                || normalizedName.endsWith(".webp")) {
            return MediaType.IMAGE;
        }
        if (normalizedName.endsWith(".mp4")
                || normalizedName.endsWith(".webm")) {
            return MediaType.VIDEO;
        }
        throw new BadRequestException("Unsupported media format");
    }

    private void validateFile(MultipartFile file, MediaType mediaType) {
        long fileSize = file.getSize();
        if (mediaType == MediaType.IMAGE && fileSize > MAX_IMAGE_SIZE_BYTES) {
            throw new BadRequestException("Image size exceeds 10MB limit");
        }
        if (mediaType == MediaType.VIDEO && fileSize > MAX_VIDEO_SIZE_BYTES) {
            throw new BadRequestException("Video size exceeds 100MB limit");
        }
    }

    private String sanitizeFilename(String originalFilename) {
        String fallback = "file";
        if (originalFilename == null || originalFilename.isBlank()) {
            return fallback;
        }

        String cleaned = StringUtils.cleanPath(originalFilename.trim());
        int slashIndex = Math.max(cleaned.lastIndexOf('/'), cleaned.lastIndexOf('\\'));
        String fileNameOnly = slashIndex >= 0 ? cleaned.substring(slashIndex + 1) : cleaned;
        if (fileNameOnly.isBlank()) {
            return fallback;
        }
        return fileNameOnly.replaceAll("\\s+", "_");
    }

    private String normalizeEntityType(String entityType) {
        if (entityType == null || entityType.isBlank()) {
            throw new BadRequestException("entityType is required");
        }
        return entityType.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeAltText(String altText) {
        String normalized = altText == null || altText.isBlank() ? null : altText.trim();
        if (normalized != null && normalized.length() > 255) {
            throw new BadRequestException("altText must not exceed 255 characters");
        }
        return normalized;
    }

    private MediaResponse toResponse(Media media) {
        Integer contentId = resolveContentId(media.getContent());
        return MediaResponse.builder()
                .mediaId(media.getMediaId())
                .fileName(media.getFilename())
                .fileUrl(mediaUrlResolver.toPublicUrl(media.getFileUrl()))
                .mediaType(media.getMediaType() == null ? null : media.getMediaType().name())
                .fileSizeBytes(media.getFileSizeBytes())
                .mimeType(media.getMimeType())
                .altText(media.getAltText())
                .displayOrder(media.getDisplayOrder())
                .entityType(contentId == null ? null : CONTENT_ENTITY_TYPE)
                .entityId(contentId)
                .uploadedByName(resolveUserFullName(media.getUploadedBy()))
                .createdAt(media.getCreatedAt())
                .build();
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
}
