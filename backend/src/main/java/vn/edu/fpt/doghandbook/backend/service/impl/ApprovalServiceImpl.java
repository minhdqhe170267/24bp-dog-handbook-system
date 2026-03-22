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
import vn.edu.fpt.doghandbook.backend.dto.response.ApprovalRecordResponse;
import vn.edu.fpt.doghandbook.backend.entity.*;
import vn.edu.fpt.doghandbook.backend.entity.enums.ApprovableEntityType;
import vn.edu.fpt.doghandbook.backend.entity.enums.ApprovalDecision;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.NotificationType;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.*;
import vn.edu.fpt.doghandbook.backend.service.ApprovalService;
import vn.edu.fpt.doghandbook.backend.service.NotificationService;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class ApprovalServiceImpl implements ApprovalService {

    private final ApprovalRecordRepository approvalRecordRepository;
    private final UserRepository userRepository;
    private final ContentRepository contentRepository;
    private final DogBreedRepository dogBreedRepository;
    private final NutritionStandardRepository nutritionStandardRepository;
    private final TrainingExerciseRepository trainingExerciseRepository;
    private final TrainingRoadmapRepository trainingRoadmapRepository;
    private final TrainingMethodRepository trainingMethodRepository;
    private final DevelopmentStageRepository developmentStageRepository;
    private final DiseaseRepository diseaseRepository;
    private final MedicationRepository medicationRepository;
    private final FirstAidGuideRepository firstAidGuideRepository;
    private final NotificationService notificationService;

    @Override
    public void submitForReview(ApprovableEntityType entityType, Integer entityId, Integer senderId) {
        ContentStatus currentStatus = getStatus(entityType, entityId);
        if (currentStatus != ContentStatus.DRAFT && currentStatus != ContentStatus.REJECTED) {
            throw new BadRequestException("Chỉ có thể gửi duyệt khi trạng thái là DRAFT hoặc REJECTED");
        }
        setStatus(entityType, entityId, ContentStatus.PENDING);

        String entityTitle = getEntityTitle(entityType, entityId);
        User sender = userRepository.findById(senderId).orElse(null);
        String senderName = sender != null ? sender.getFullName() : "Người dùng";
        notificationService.notifyRole(
                UserRole.REVIEWER, sender,
                NotificationType.CONTENT_SUBMITTED,
                "Nội dung mới cần duyệt",
                senderName + " đã gửi \"" + entityTitle + "\" cần duyệt",
                entityType.name(), entityId
        );
    }

    @Override
    public ApprovalRecordResponse review(ApprovableEntityType entityType, Integer entityId,
                                         ApprovalRequest request, Integer reviewerId) {
        ContentStatus currentStatus = getStatus(entityType, entityId);
        if (currentStatus != ContentStatus.PENDING) {
            throw new BadRequestException("Chỉ có thể duyệt khi trạng thái là PENDING");
        }

        ApprovalDecision decision = parseDecision(request.resolveDecision());
        if (decision == ApprovalDecision.PENDING) {
            throw new BadRequestException("Quyết định không hợp lệ: PENDING");
        }

        String comments = trimToNull(request.resolveComments());
        if ((decision == ApprovalDecision.REJECTED || decision == ApprovalDecision.REVISION_REQUESTED)
                && comments == null) {
            throw new BadRequestException("Phải có nhận xét khi từ chối hoặc yêu cầu chỉnh sửa");
        }

        User reviewer = userRepository.findById(reviewerId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", reviewerId));

        ApprovalRecord record = ApprovalRecord.builder()
                .entityType(entityType)
                .entityId(entityId)
                .reviewer(reviewer)
                .decision(decision)
                .comments(comments)
                .reviewedAt(LocalDateTime.now())
                .build();
        record = approvalRecordRepository.save(record);

        if (decision == ApprovalDecision.APPROVED) {
            setStatus(entityType, entityId, ContentStatus.APPROVED);
        } else {
            setStatus(entityType, entityId, ContentStatus.REJECTED);
        }

        User author = getEntityAuthor(entityType, entityId);
        if (author != null && !author.getUserId().equals(reviewerId)) {
            String entityTitle = getEntityTitle(entityType, entityId);
            NotificationType notifType = switch (decision) {
                case APPROVED -> NotificationType.CONTENT_APPROVED;
                case REJECTED -> NotificationType.CONTENT_REJECTED;
                case REVISION_REQUESTED -> NotificationType.CONTENT_REVISION_REQUESTED;
                default -> null;
            };
            if (notifType != null) {
                String action = switch (decision) {
                    case APPROVED -> "đã duyệt";
                    case REJECTED -> "đã từ chối";
                    case REVISION_REQUESTED -> "yêu cầu chỉnh sửa";
                    default -> "";
                };
                notificationService.notifyUser(
                        author, reviewer, notifType,
                        "Kết quả duyệt nội dung",
                        reviewer.getFullName() + " " + action + " \"" + entityTitle + "\"",
                        entityType.name(), entityId
                );
            }
        }

        return toResponse(record);
    }

    @Override
    public void publish(ApprovableEntityType entityType, Integer entityId, Integer senderId) {
        ContentStatus currentStatus = getStatus(entityType, entityId);
        if (currentStatus != ContentStatus.APPROVED) {
            throw new BadRequestException("Chỉ có thể xuất bản khi trạng thái là APPROVED");
        }
        setStatus(entityType, entityId, ContentStatus.PUBLISHED);
        setPublishedAt(entityType, entityId, LocalDateTime.now());

        String entityTitle = getEntityTitle(entityType, entityId);
        User sender = userRepository.findById(senderId).orElse(null);
        String senderName = sender != null ? sender.getFullName() : "Quản trị viên";

        // Notify author
        User author = getEntityAuthor(entityType, entityId);
        if (author != null && !author.getUserId().equals(senderId)) {
            notificationService.notifyUser(
                    author, sender,
                    NotificationType.CONTENT_PUBLISHED,
                    "Nội dung đã xuất bản",
                    "\"" + entityTitle + "\" đã được xuất bản bởi " + senderName,
                    entityType.name(), entityId
            );
        }

        // Notify all trainers (for mobile sync)
        notificationService.notifyRole(
                UserRole.TRAINER, sender,
                NotificationType.CONTENT_PUBLISHED,
                "Nội dung mới",
                "\"" + entityTitle + "\" vừa được xuất bản",
                entityType.name(), entityId
        );
    }

    @Override
    public void unpublish(ApprovableEntityType entityType, Integer entityId, Integer senderId) {
        ContentStatus currentStatus = getStatus(entityType, entityId);
        if (currentStatus != ContentStatus.PUBLISHED) {
            throw new BadRequestException("Chỉ có thể gỡ xuất bản khi trạng thái là PUBLISHED");
        }
        setStatus(entityType, entityId, ContentStatus.DRAFT);
        setPublishedAt(entityType, entityId, null);

        User sender = userRepository.findById(senderId).orElse(null);
        User author = getEntityAuthor(entityType, entityId);
        if (author != null && !author.getUserId().equals(senderId)) {
            String entityTitle = getEntityTitle(entityType, entityId);
            String senderName = sender != null ? sender.getFullName() : "Quản trị viên";
            notificationService.notifyUser(
                    author, sender,
                    NotificationType.CONTENT_UNPUBLISHED,
                    "Nội dung đã gỡ xuất bản",
                    "\"" + entityTitle + "\" đã bị gỡ xuất bản bởi " + senderName,
                    entityType.name(), entityId
            );
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<ApprovalRecordResponse> getApprovalHistory(ApprovableEntityType entityType, Integer entityId) {
        return approvalRecordRepository
                .findByEntityTypeAndEntityIdOrderByReviewedAtDesc(entityType, entityId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getPendingReviews(ApprovableEntityType entityType, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return switch (entityType) {
            case CONTENT -> toPendingList(contentRepository.findByStatusAndIsDeletedFalse(ContentStatus.PENDING, pageable), entityType);
            case DOG_BREED -> toPendingList(dogBreedRepository.findByStatusAndIsDeletedFalse(ContentStatus.PENDING, pageable), entityType);
            case DOG_PROFILE -> throw unsupportedApprovalEntityType(entityType);
            case NUTRITION_STANDARD -> toPendingList(nutritionStandardRepository.findByStatusAndIsDeletedFalse(ContentStatus.PENDING, pageable), entityType);
            case TRAINING_EXERCISE -> toPendingList(trainingExerciseRepository.findByStatusAndIsDeletedFalse(ContentStatus.PENDING, pageable), entityType);
            case TRAINING_ROADMAP -> toPendingList(trainingRoadmapRepository.findByStatusAndIsDeletedFalse(ContentStatus.PENDING, pageable), entityType);
            case TRAINING_METHOD -> toPendingList(trainingMethodRepository.findByStatusAndIsDeletedFalse(ContentStatus.PENDING, pageable), entityType);
            case DEVELOPMENT_STAGE -> toPendingList(developmentStageRepository.findByStatusAndIsDeletedFalse(ContentStatus.PENDING, pageable), entityType);
            case DISEASE -> toPendingList(diseaseRepository.findByStatusAndIsDeletedFalse(ContentStatus.PENDING, pageable), entityType);
            case MEDICATION -> toPendingList(medicationRepository.findByStatusAndIsDeletedFalse(ContentStatus.PENDING, pageable), entityType);
            case FIRST_AID_GUIDE -> toPendingList(firstAidGuideRepository.findByStatusAndIsDeletedFalse(ContentStatus.PENDING, pageable), entityType);
        };
    }

    // ── Entity status helpers ────────────────────────────────────

    private ContentStatus getStatus(ApprovableEntityType type, Integer id) {
        return switch (type) {
            case CONTENT -> findContent(id).getStatus();
            case DOG_BREED -> findBreed(id).getStatus();
            case DOG_PROFILE -> throw unsupportedApprovalEntityType(type);
            case NUTRITION_STANDARD -> findNutrition(id).getStatusEnum();
            case TRAINING_EXERCISE -> findExercise(id).getStatus();
            case TRAINING_ROADMAP -> findRoadmap(id).getStatus();
            case TRAINING_METHOD -> findMethod(id).getStatus();
            case DEVELOPMENT_STAGE -> findDevStage(id).getStatus();
            case DISEASE -> findDisease(id).getStatus();
            case MEDICATION -> findMedication(id).getStatus();
            case FIRST_AID_GUIDE -> findFirstAid(id).getStatus();
        };
    }

    private void setStatus(ApprovableEntityType type, Integer id, ContentStatus status) {
        switch (type) {
            case CONTENT -> { Content e = findContent(id); e.setStatus(status); contentRepository.save(e); }
            case DOG_BREED -> { DogBreed e = findBreed(id); e.setStatus(status); dogBreedRepository.save(e); }
            case DOG_PROFILE -> throw unsupportedApprovalEntityType(type);
            case NUTRITION_STANDARD -> { NutritionStandard e = findNutrition(id); e.setStatusEnum(status); nutritionStandardRepository.save(e); }
            case TRAINING_EXERCISE -> { TrainingExercise e = findExercise(id); e.setStatus(status); trainingExerciseRepository.save(e); }
            case TRAINING_ROADMAP -> { TrainingRoadmap e = findRoadmap(id); e.setStatus(status); trainingRoadmapRepository.save(e); }
            case TRAINING_METHOD -> { TrainingMethod e = findMethod(id); e.setStatus(status); trainingMethodRepository.save(e); }
            case DEVELOPMENT_STAGE -> { DevelopmentStage e = findDevStage(id); e.setStatus(status); developmentStageRepository.save(e); }
            case DISEASE -> { Disease e = findDisease(id); e.setStatus(status); diseaseRepository.save(e); }
            case MEDICATION -> { Medication e = findMedication(id); e.setStatus(status); medicationRepository.save(e); }
            case FIRST_AID_GUIDE -> { FirstAidGuide e = findFirstAid(id); e.setStatus(status); firstAidGuideRepository.save(e); }
        }
    }

    private void setPublishedAt(ApprovableEntityType type, Integer id, LocalDateTime publishedAt) {
        switch (type) {
            case CONTENT -> { Content e = findContent(id); e.setPublishedAt(publishedAt); contentRepository.save(e); }
            case DOG_BREED -> { DogBreed e = findBreed(id); e.setPublishedAt(publishedAt); dogBreedRepository.save(e); }
            case DOG_PROFILE -> throw unsupportedApprovalEntityType(type);
            case NUTRITION_STANDARD -> { NutritionStandard e = findNutrition(id); e.setPublishedAt(publishedAt); nutritionStandardRepository.save(e); }
            case TRAINING_EXERCISE -> { TrainingExercise e = findExercise(id); e.setPublishedAt(publishedAt); trainingExerciseRepository.save(e); }
            case TRAINING_ROADMAP -> { TrainingRoadmap e = findRoadmap(id); e.setPublishedAt(publishedAt); trainingRoadmapRepository.save(e); }
            case TRAINING_METHOD -> { TrainingMethod e = findMethod(id); e.setPublishedAt(publishedAt); trainingMethodRepository.save(e); }
            case DEVELOPMENT_STAGE -> { DevelopmentStage e = findDevStage(id); e.setPublishedAt(publishedAt); developmentStageRepository.save(e); }
            case DISEASE -> { Disease e = findDisease(id); e.setPublishedAt(publishedAt); diseaseRepository.save(e); }
            case MEDICATION -> { Medication e = findMedication(id); e.setPublishedAt(publishedAt); medicationRepository.save(e); }
            case FIRST_AID_GUIDE -> { FirstAidGuide e = findFirstAid(id); e.setPublishedAt(publishedAt); firstAidGuideRepository.save(e); }
        }
    }

    private User getEntityAuthor(ApprovableEntityType type, Integer id) {
        try {
            return switch (type) {
                case CONTENT -> findContent(id).getAuthor();
                case DOG_BREED -> findBreed(id).getCreatedBy();
                case DOG_PROFILE -> null;
                case NUTRITION_STANDARD -> findNutrition(id).getCreatedBy();
                case TRAINING_EXERCISE -> findExercise(id).getCreatedBy();
                case TRAINING_ROADMAP -> findRoadmap(id).getCreatedBy();
                case TRAINING_METHOD -> findMethod(id).getCreatedBy();
                case DEVELOPMENT_STAGE -> findDevStage(id).getCreatedBy();
                case DISEASE -> findDisease(id).getCreatedBy();
                case MEDICATION -> findMedication(id).getCreatedBy();
                case FIRST_AID_GUIDE -> findFirstAid(id).getCreatedBy();
            };
        } catch (Exception e) {
            return null;
        }
    }

    private String getEntityTitle(ApprovableEntityType type, Integer id) {
        try {
            return switch (type) {
                case CONTENT -> findContent(id).getTitle();
                case DOG_BREED -> findBreed(id).getBreedName();
                case DOG_PROFILE -> throw unsupportedApprovalEntityType(type);
                case NUTRITION_STANDARD -> findNutrition(id).getRationName();
                case TRAINING_EXERCISE -> findExercise(id).getExerciseName();
                case TRAINING_ROADMAP -> findRoadmap(id).getRoadmapName();
                case TRAINING_METHOD -> findMethod(id).getMethodName();
                case DEVELOPMENT_STAGE -> findDevStage(id).getStageName();
                case DISEASE -> findDisease(id).getDiseaseName();
                case MEDICATION -> findMedication(id).getMedicationName();
                case FIRST_AID_GUIDE -> findFirstAid(id).getGuideTitle();
            };
        } catch (Exception e) {
            return null;
        }
    }

    // ── Entity finders ───────────────────────────────────────────

    private Content findContent(Integer id) {
        return contentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Content", "id", id));
    }

    private DogBreed findBreed(Integer id) {
        return dogBreedRepository.findByBreedIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("DogBreed", "id", id));
    }

    private NutritionStandard findNutrition(Integer id) {
        return nutritionStandardRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("NutritionStandard", "id", id));
    }

    private TrainingExercise findExercise(Integer id) {
        return trainingExerciseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TrainingExercise", "id", id));
    }

    private TrainingRoadmap findRoadmap(Integer id) {
        return trainingRoadmapRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TrainingRoadmap", "id", id));
    }

    private TrainingMethod findMethod(Integer id) {
        return trainingMethodRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TrainingMethod", "id", id));
    }

    private DevelopmentStage findDevStage(Integer id) {
        return developmentStageRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("DevelopmentStage", "id", id));
    }

    private Disease findDisease(Integer id) {
        return diseaseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Disease", "id", id));
    }

    private Medication findMedication(Integer id) {
        return medicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Medication", "id", id));
    }

    private FirstAidGuide findFirstAid(Integer id) {
        return firstAidGuideRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("FirstAidGuide", "id", id));
    }

    // ── Mapping helpers ──────────────────────────────────────────

    private ApprovalRecordResponse toResponse(ApprovalRecord record) {
        User reviewer = record.getReviewer();
        return ApprovalRecordResponse.builder()
                .approvalId(record.getApprovalId())
                .entityType(record.getEntityType() != null ? record.getEntityType().name() : null)
                .entityId(record.getEntityId())
                .entityTitle(getEntityTitle(record.getEntityType(), record.getEntityId()))
                .reviewerId(safeUserId(reviewer))
                .reviewerName(safeUserName(reviewer))
                .decision(record.getDecision() != null ? record.getDecision().name() : null)
                .comments(record.getComments())
                .reviewedAt(record.getReviewedAt())
                .build();
    }

    private <T> List<Map<String, Object>> toPendingList(Page<T> page, ApprovableEntityType entityType) {
        return page.getContent().stream().map(entity -> {
            Map<String, Object> item = new HashMap<>();
            item.put("entityType", entityType.name());
            item.put("entityId", getEntityId(entity, entityType));
            item.put("title", getEntityTitleFromObject(entity, entityType));
            item.put("status", "PENDING");
            return item;
        }).toList();
    }

    private Integer getEntityId(Object entity, ApprovableEntityType type) {
        return switch (type) {
            case CONTENT -> ((Content) entity).getContentId();
            case DOG_BREED -> ((DogBreed) entity).getBreedId();
            case DOG_PROFILE -> throw unsupportedApprovalEntityType(type);
            case NUTRITION_STANDARD -> ((NutritionStandard) entity).getStandardId();
            case TRAINING_EXERCISE -> ((TrainingExercise) entity).getExerciseId();
            case TRAINING_ROADMAP -> ((TrainingRoadmap) entity).getRoadmapId();
            case TRAINING_METHOD -> ((TrainingMethod) entity).getMethodId();
            case DEVELOPMENT_STAGE -> ((DevelopmentStage) entity).getStageId();
            case DISEASE -> ((Disease) entity).getDiseaseId();
            case MEDICATION -> ((Medication) entity).getMedicationId();
            case FIRST_AID_GUIDE -> ((FirstAidGuide) entity).getGuideId();
        };
    }

    private String getEntityTitleFromObject(Object entity, ApprovableEntityType type) {
        return switch (type) {
            case CONTENT -> ((Content) entity).getTitle();
            case DOG_BREED -> ((DogBreed) entity).getBreedName();
            case DOG_PROFILE -> throw unsupportedApprovalEntityType(type);
            case NUTRITION_STANDARD -> ((NutritionStandard) entity).getRationName();
            case TRAINING_EXERCISE -> ((TrainingExercise) entity).getExerciseName();
            case TRAINING_ROADMAP -> ((TrainingRoadmap) entity).getRoadmapName();
            case TRAINING_METHOD -> ((TrainingMethod) entity).getMethodName();
            case DEVELOPMENT_STAGE -> ((DevelopmentStage) entity).getStageName();
            case DISEASE -> ((Disease) entity).getDiseaseName();
            case MEDICATION -> ((Medication) entity).getMedicationName();
            case FIRST_AID_GUIDE -> ((FirstAidGuide) entity).getGuideTitle();
        };
    }

    private ApprovalDecision parseDecision(String value) {
        if (value == null || value.isBlank()) {
            throw new BadRequestException("Quyết định là bắt buộc");
        }
        try {
            return ApprovalDecision.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Quyết định không hợp lệ: " + value);
        }
    }

    private String trimToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }

    private BadRequestException unsupportedApprovalEntityType(ApprovableEntityType type) {
        return new BadRequestException("entityType không hỗ trợ workflow duyệt nội dung: " + type.name());
    }

    private Integer safeUserId(User user) {
        if (user == null) return null;
        try { return user.getUserId(); } catch (EntityNotFoundException e) { return null; }
    }

    private String safeUserName(User user) {
        if (user == null) return null;
        try { return user.getFullName(); } catch (EntityNotFoundException e) { return null; }
    }
}
