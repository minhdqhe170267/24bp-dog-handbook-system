package vn.edu.fpt.doghandbook.backend.service.impl;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
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

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MediaServiceImpl implements MediaService {

    private static final String CONTENT_ENTITY_TYPE = "CONTENT";

    private final MediaRepository mediaRepository;
    private final ContentRepository contentRepository;
    private final UserRepository userRepository;

    @Value("${app.upload.dir:uploads/}")
    private String uploadDir;

    @Override
    @Transactional
    public MediaResponse upload(MultipartFile file, String entityType, Integer entityId, Integer uploadedBy) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File is required");
        }

        String normalizedEntityType = normalizeEntityType(entityType);
        if (!CONTENT_ENTITY_TYPE.equals(normalizedEntityType)) {
            throw new BadRequestException("Only entityType=CONTENT is supported");
        }

        Content content = getActiveContentById(entityId);
        User uploader = getUserById(uploadedBy);

        String cleanOriginalName = sanitizeFilename(file.getOriginalFilename());
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

        int nextDisplayOrder = mediaRepository
                .findByContentContentIdAndIsDeletedFalseOrderByDisplayOrder(content.getContentId())
                .size() + 1;

        Media media = Media.builder()
                .content(content)
                .filename(cleanOriginalName)
                .mediaType(detectMediaType(file.getContentType(), cleanOriginalName))
                .fileUrl(buildFileUrl(storedName))
                .fileSizeBytes(file.getSize())
                .mimeType(file.getContentType())
                .altText(null)
                .displayOrder(nextDisplayOrder)
                .uploadedBy(uploader)
                .isDeleted(false)
                .deletedAt(null)
                .build();

        return toResponse(mediaRepository.save(media));
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
    public void delete(Integer id) {
        Media media = getActiveMediaById(id);
        media.setIsDeleted(true);
        media.setDeletedAt(LocalDateTime.now());
        mediaRepository.save(media);
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
                || normalizedName.endsWith(".gif")
                || normalizedName.endsWith(".webp")) {
            return MediaType.IMAGE;
        }
        if (normalizedName.endsWith(".mp4")
                || normalizedName.endsWith(".mov")
                || normalizedName.endsWith(".avi")
                || normalizedName.endsWith(".mkv")) {
            return MediaType.VIDEO;
        }
        return MediaType.DOCUMENT;
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

    private MediaResponse toResponse(Media media) {
        Integer contentId = resolveContentId(media.getContent());
        return MediaResponse.builder()
                .mediaId(media.getMediaId())
                .fileName(media.getFilename())
                .fileUrl(media.getFileUrl())
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
