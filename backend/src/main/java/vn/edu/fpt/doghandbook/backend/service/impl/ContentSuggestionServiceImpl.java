package vn.edu.fpt.doghandbook.backend.service.impl;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.fpt.doghandbook.backend.dto.request.ContentSuggestionRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ContentSuggestionResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.entity.ContentSuggestion;
import vn.edu.fpt.doghandbook.backend.entity.TrainingExercise;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.SuggestionStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.SuggestionType;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.ContentSuggestionRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingExerciseRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.ContentSuggestionService;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ContentSuggestionServiceImpl implements ContentSuggestionService {

    private static final Set<SuggestionStatus> REVIEWABLE_STATUSES = Set.of(
            SuggestionStatus.UNDER_REVIEW,
            SuggestionStatus.ACCEPTED,
            SuggestionStatus.REJECTED,
            SuggestionStatus.IMPLEMENTED
    );

    private final ContentSuggestionRepository contentSuggestionRepository;
    private final UserRepository userRepository;
    private final TrainingExerciseRepository trainingExerciseRepository;

    @Override
    public PageResponse<ContentSuggestionResponse> getAll(int page, int size, String status) {
        Pageable pageable = buildPageable(page, size);
        Page<ContentSuggestion> entityPage;

        if (status == null || status.isBlank()) {
            entityPage = contentSuggestionRepository.findByOrderBySubmittedAtDesc(pageable);
        } else {
            entityPage = contentSuggestionRepository
                    .findByStatusOrderBySubmittedAtDesc(parseSuggestionStatus(status), pageable);
        }

        return toPageResponse(entityPage);
    }

    @Override
    public ContentSuggestionResponse getById(Integer id) {
        ContentSuggestion entity = getSuggestionById(id);
        return toResponse(entity);
    }

    @Override
    @Transactional
    public ContentSuggestionResponse submit(ContentSuggestionRequest request, Integer trainerId) {
        User trainer = getUserById(trainerId);
        TrainingExercise relatedExercise = getExerciseIfPresent(request.getRelatedExerciseId());

        ContentSuggestion entity = ContentSuggestion.builder()
                .trainer(trainer)
                .suggestionType(parseSuggestionType(request.getSuggestionType()))
                .relatedExercise(relatedExercise)
                .title(normalizeRequired(request.getTitle(), "title"))
                .description(normalizeRequired(request.getDescription(), "description"))
                .status(SuggestionStatus.SUBMITTED)
                .adminResponse(null)
                .reviewedBy(null)
                .reviewedAt(null)
                .submittedAt(LocalDateTime.now())
                .build();

        return toResponse(contentSuggestionRepository.save(entity));
    }

    @Override
    @Transactional
    public ContentSuggestionResponse respond(
            Integer suggestionId,
            String adminResponse,
            String newStatus,
            Integer reviewerId
    ) {
        ContentSuggestion entity = getSuggestionById(suggestionId);
        SuggestionStatus status = parseReviewStatus(newStatus);
        User reviewer = getUserById(reviewerId);

        entity.setAdminResponse(trimToNull(adminResponse));
        entity.setStatus(status);
        entity.setReviewedBy(reviewer);
        entity.setReviewedAt(LocalDateTime.now());

        return toResponse(contentSuggestionRepository.save(entity));
    }

    @Override
    public List<ContentSuggestionResponse> getMySubmissions(Integer trainerId) {
        validatePositiveId(trainerId, "trainerId");
        return contentSuggestionRepository.findByTrainerUserIdOrderBySubmittedAtDesc(trainerId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private PageResponse<ContentSuggestionResponse> toPageResponse(Page<ContentSuggestion> entityPage) {
        Page<ContentSuggestionResponse> dtoPage = entityPage.map(this::toResponse);
        return PageResponse.<ContentSuggestionResponse>builder()
                .content(dtoPage.getContent())
                .page(dtoPage.getNumber())
                .size(dtoPage.getSize())
                .totalElements(dtoPage.getTotalElements())
                .totalPages(dtoPage.getTotalPages())
                .build();
    }

    private ContentSuggestionResponse toResponse(ContentSuggestion entity) {
        TrainingExercise relatedExercise = entity.getRelatedExercise();
        User trainer = entity.getTrainer();
        User reviewedBy = entity.getReviewedBy();

        return ContentSuggestionResponse.builder()
                .suggestionId(entity.getSuggestionId())
                .trainerId(resolveUserId(trainer))
                .trainerName(resolveUserFullName(trainer))
                .suggestionType(entity.getSuggestionType() == null ? null : entity.getSuggestionType().name())
                .relatedExerciseId(resolveExerciseId(relatedExercise))
                .relatedExerciseName(resolveExerciseName(relatedExercise))
                .title(entity.getTitle())
                .description(entity.getDescription())
                .status(entity.getStatus() == null ? null : entity.getStatus().name())
                .adminResponse(entity.getAdminResponse())
                .reviewedById(resolveUserId(reviewedBy))
                .reviewedByName(resolveUserFullName(reviewedBy))
                .reviewedAt(entity.getReviewedAt())
                .submittedAt(entity.getSubmittedAt())
                .build();
    }

    private ContentSuggestion getSuggestionById(Integer id) {
        validatePositiveId(id, "suggestionId");
        return contentSuggestionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Content suggestion", "id", id));
    }

    private User getUserById(Integer userId) {
        validatePositiveId(userId, "userId");
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
    }

    private TrainingExercise getExerciseIfPresent(Integer exerciseId) {
        if (exerciseId == null) {
            return null;
        }
        validatePositiveId(exerciseId, "relatedExerciseId");

        TrainingExercise exercise = trainingExerciseRepository.findById(exerciseId)
                .orElseThrow(() -> new ResourceNotFoundException("Training exercise", "id", exerciseId));

        if (Boolean.TRUE.equals(exercise.getIsDeleted())) {
            throw new ResourceNotFoundException("Training exercise", "id", exerciseId);
        }
        return exercise;
    }

    private SuggestionType parseSuggestionType(String value) {
        String normalized = normalizeRequired(value, "suggestionType");
        try {
            return SuggestionType.valueOf(normalized.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Invalid suggestionType: " + value);
        }
    }

    private SuggestionStatus parseSuggestionStatus(String value) {
        String normalized = normalizeRequired(value, "status");
        try {
            return SuggestionStatus.valueOf(normalized.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Invalid status: " + value);
        }
    }

    private SuggestionStatus parseReviewStatus(String value) {
        SuggestionStatus status = parseSuggestionStatus(value);
        if (!REVIEWABLE_STATUSES.contains(status)) {
            throw new BadRequestException("Invalid review status: " + value);
        }
        return status;
    }

    private Pageable buildPageable(int page, int size) {
        if (page < 0) {
            throw new BadRequestException("page must be greater than or equal to 0");
        }
        if (size <= 0) {
            throw new BadRequestException("size must be greater than 0");
        }
        return PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "submittedAt"));
    }

    private void validatePositiveId(Integer value, String fieldName) {
        if (value == null || value <= 0) {
            throw new BadRequestException(fieldName + " must be greater than 0");
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

    private Integer resolveExerciseId(TrainingExercise exercise) {
        if (exercise == null) {
            return null;
        }
        try {
            return exercise.getExerciseId();
        } catch (EntityNotFoundException ex) {
            return null;
        }
    }

    private String resolveExerciseName(TrainingExercise exercise) {
        if (exercise == null) {
            return null;
        }
        try {
            return exercise.getExerciseName();
        } catch (EntityNotFoundException ex) {
            return null;
        }
    }
}
