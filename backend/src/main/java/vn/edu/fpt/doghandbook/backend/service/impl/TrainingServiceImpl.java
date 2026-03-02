package vn.edu.fpt.doghandbook.backend.service.impl;

    import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.fpt.doghandbook.backend.dto.request.TrainingExerciseRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.TrainingMethodRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.TrainingRoadmapRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.TrainingExerciseResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.TrainingMethodResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.TrainingRoadmapResponse;
import vn.edu.fpt.doghandbook.backend.entity.DogBreed;
import vn.edu.fpt.doghandbook.backend.entity.RoadmapExercise;
import vn.edu.fpt.doghandbook.backend.entity.TrainingExercise;
import vn.edu.fpt.doghandbook.backend.entity.TrainingMethod;
import vn.edu.fpt.doghandbook.backend.entity.TrainingRoadmap;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.DifficultyLevel;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.DogBreedRepository;
import vn.edu.fpt.doghandbook.backend.repository.RoadmapExerciseRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingExerciseRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingMethodRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingRoadmapRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.TrainingService;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TrainingServiceImpl implements TrainingService {

    private static final String BREED_ALL_LABEL = "Tất cả giống";

    private final TrainingMethodRepository trainingMethodRepository;
    private final TrainingExerciseRepository trainingExerciseRepository;
    private final TrainingRoadmapRepository trainingRoadmapRepository;
    private final RoadmapExerciseRepository roadmapExerciseRepository;
    private final DogBreedRepository dogBreedRepository;
    private final UserRepository userRepository;

    @Override
    public PageResponse<TrainingMethodResponse> getAllMethods(int page, int size, String search) {
        Pageable pageable = buildPageable(page, size);
        Page<TrainingMethod> entityPage;

        if (search == null || search.isBlank()) {
            entityPage = trainingMethodRepository.findByIsDeletedFalse(pageable);
        } else {
            entityPage = trainingMethodRepository
                    .findByMethodNameContainingIgnoreCaseAndIsDeletedFalse(search.trim(), pageable);
        }

        return toMethodPageResponse(entityPage);
    }

    @Override
    public TrainingMethodResponse getMethodById(Integer id) {
        return toMethodResponse(getActiveMethodById(id));
    }

    @Override
    @Transactional
    public TrainingMethodResponse createMethod(TrainingMethodRequest request, Integer userId) {
        TrainingMethod entity = new TrainingMethod();
        applyMethodRequest(entity, request);
        entity.setCreatedBy(getUserById(userId));
        entity.setStatus(ContentStatus.DRAFT);
        entity.setIsDeleted(false);
        entity.setDeletedAt(null);
        return toMethodResponse(trainingMethodRepository.save(entity));
    }

    @Override
    @Transactional
    public TrainingMethodResponse updateMethod(Integer id, TrainingMethodRequest request) {
        TrainingMethod entity = getActiveMethodById(id);
        applyMethodRequest(entity, request);
        return toMethodResponse(trainingMethodRepository.save(entity));
    }

    @Override
    @Transactional
    public void deleteMethod(Integer id) {
        TrainingMethod entity = getActiveMethodById(id);
        entity.setIsDeleted(true);
        entity.setDeletedAt(LocalDateTime.now());
        trainingMethodRepository.save(entity);
    }

    @Override
    public PageResponse<TrainingExerciseResponse> getAllExercises(int page, int size, String search, String difficulty) {
        Pageable pageable = buildPageable(page, size);
        Page<TrainingExercise> entityPage;

        if (search != null && !search.isBlank()) {
            entityPage = trainingExerciseRepository
                    .findByExerciseNameContainingIgnoreCaseAndIsDeletedFalse(search.trim(), pageable);
        } else if (difficulty != null && !difficulty.isBlank()) {
            entityPage = trainingExerciseRepository
                    .findByDifficultyLevelAndIsDeletedFalse(parseDifficultyLevel(difficulty), pageable);
        } else {
            entityPage = trainingExerciseRepository.findByIsDeletedFalse(pageable);
        }

        return toExercisePageResponse(entityPage);
    }

    @Override
    public TrainingExerciseResponse getExerciseById(Integer id) {
        return toExerciseResponse(getActiveExerciseById(id));
    }

    @Override
    @Transactional
    public TrainingExerciseResponse createExercise(TrainingExerciseRequest request, Integer userId) {
        TrainingExercise entity = new TrainingExercise();
        applyExerciseRequest(entity, request);
        entity.setCreatedBy(getUserById(userId));
        entity.setStatus(ContentStatus.DRAFT);
        entity.setIsDeleted(false);
        entity.setDeletedAt(null);
        return toExerciseResponse(trainingExerciseRepository.save(entity));
    }

    @Override
    @Transactional
    public TrainingExerciseResponse updateExercise(Integer id, TrainingExerciseRequest request) {
        TrainingExercise entity = getActiveExerciseById(id);
        applyExerciseRequest(entity, request);
        return toExerciseResponse(trainingExerciseRepository.save(entity));
    }

    @Override
    @Transactional
    public void deleteExercise(Integer id) {
        TrainingExercise entity = getActiveExerciseById(id);
        entity.setIsDeleted(true);
        entity.setDeletedAt(LocalDateTime.now());
        trainingExerciseRepository.save(entity);
    }

    @Override
    public PageResponse<TrainingRoadmapResponse> getAllRoadmaps(int page, int size) {
        Pageable pageable = buildPageable(page, size);
        Page<TrainingRoadmap> entityPage = trainingRoadmapRepository.findByIsDeletedFalse(pageable);
        return toRoadmapPageResponse(entityPage);
    }

    @Override
    public TrainingRoadmapResponse getRoadmapById(Integer id) {
        TrainingRoadmap entity = getActiveRoadmapById(id);
        List<RoadmapExercise> exercises = roadmapExerciseRepository
                .findByRoadmapRoadmapIdOrderByExerciseOrder(entity.getRoadmapId());
        return toRoadmapResponse(entity, exercises);
    }

    @Override
    @Transactional
    public TrainingRoadmapResponse createRoadmap(TrainingRoadmapRequest request, Integer userId) {
        TrainingRoadmap entity = new TrainingRoadmap();
        applyRoadmapRequest(entity, request);
        entity.setCreatedBy(getUserById(userId));
        entity.setStatus(ContentStatus.DRAFT);
        entity.setIsDeleted(false);
        entity.setDeletedAt(null);
        return toRoadmapResponse(trainingRoadmapRepository.save(entity), List.of());
    }

    @Override
    @Transactional
    public void deleteRoadmap(Integer id) {
        TrainingRoadmap entity = getActiveRoadmapById(id);
        entity.setIsDeleted(true);
        entity.setDeletedAt(LocalDateTime.now());
        trainingRoadmapRepository.save(entity);
    }

    private Pageable buildPageable(int page, int size) {
        if (page < 0) {
            throw new IllegalArgumentException("page must be greater than or equal to 0");
        }
        if (size <= 0) {
            throw new IllegalArgumentException("size must be greater than 0");
        }
        return PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    private TrainingMethod getActiveMethodById(Integer id) {
        if (id == null || id <= 0) {
            throw new IllegalArgumentException("id must be greater than 0");
        }

        TrainingMethod entity = trainingMethodRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Training method not found: " + id));

        if (Boolean.TRUE.equals(entity.getIsDeleted())) {
            throw new ResourceNotFoundException("Training method not found: " + id);
        }
        return entity;
    }

    private TrainingExercise getActiveExerciseById(Integer id) {
        if (id == null || id <= 0) {
            throw new IllegalArgumentException("id must be greater than 0");
        }

        TrainingExercise entity = trainingExerciseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Training exercise not found: " + id));

        if (Boolean.TRUE.equals(entity.getIsDeleted())) {
            throw new ResourceNotFoundException("Training exercise not found: " + id);
        }
        return entity;
    }

    private TrainingRoadmap getActiveRoadmapById(Integer id) {
        if (id == null || id <= 0) {
            throw new IllegalArgumentException("id must be greater than 0");
        }

        TrainingRoadmap entity = trainingRoadmapRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Training roadmap not found: " + id));

        if (Boolean.TRUE.equals(entity.getIsDeleted())) {
            throw new ResourceNotFoundException("Training roadmap not found: " + id);
        }
        return entity;
    }

    private User getUserById(Integer userId) {
        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("userId must be greater than 0");
        }

        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
    }

    private TrainingMethod getMethodIfPresent(Integer methodId) {
        if (methodId == null) {
            return null;
        }
        return getActiveMethodById(methodId);
    }

    private DogBreed getBreedIfPresent(Integer breedId) {
        if (breedId == null) {
            return null;
        }
        if (breedId <= 0) {
            throw new IllegalArgumentException("breedId must be greater than 0");
        }

        return dogBreedRepository.findByBreedIdAndIsDeletedFalse(breedId)
                .orElseThrow(() -> new ResourceNotFoundException("Dog breed not found: " + breedId));
    }

    private DifficultyLevel parseDifficultyLevel(String difficulty) {
        try {
            return DifficultyLevel.valueOf(difficulty.trim().toUpperCase(Locale.ROOT));
        } catch (Exception ex) {
            throw new BadRequestException("Mức độ bài tập không hợp lệ");
        }
    }

    private void applyMethodRequest(TrainingMethod entity, TrainingMethodRequest request) {
        entity.setMethodName(normalizeRequired(request.getMethodName(), "methodName"));
        entity.setDescription(trimToNull(request.getDescription()));
        entity.setAdvantages(trimToNull(request.getAdvantages()));
        entity.setDisadvantages(trimToNull(request.getDisadvantages()));
        entity.setInstructions(trimToNull(request.getInstructions()));
    }

    private void applyExerciseRequest(TrainingExercise entity, TrainingExerciseRequest request) {
        entity.setExerciseName(normalizeRequired(request.getExerciseName(), "exerciseName"));
        entity.setDescription(trimToNull(request.getDescription()));
        entity.setDifficultyLevel(parseDifficultyLevel(request.getDifficultyLevel()));
        entity.setTrainingMethod(getMethodIfPresent(request.getMethodId()));
        entity.setInstructions(trimToNull(request.getInstructions()));
        entity.setDurationMinutes(request.getDurationMinutes());
        entity.setSafetyPrecautions(trimToNull(request.getSafetyPrecautions()));
        entity.setRequiredEquipment(trimToNull(request.getRequiredEquipment()));
        entity.setMediaUrls(trimToNull(request.getMediaUrls()));
    }

    private void applyRoadmapRequest(TrainingRoadmap entity, TrainingRoadmapRequest request) {
        entity.setRoadmapName(normalizeRequired(request.getRoadmapName(), "roadmapName"));
        entity.setDogBreed(getBreedIfPresent(request.getBreedId()));
        entity.setTargetRole(trimToNull(request.getTargetRole()));
        entity.setDescription(trimToNull(request.getDescription()));
        entity.setTotalDurationWeeks(request.getTotalDurationWeeks());
        entity.setPhaseName(normalizeRequired(request.getPhaseName(), "phaseName"));
        if (request.getPhaseOrder() == null) {
            throw new IllegalArgumentException("phaseOrder is required");
        }
        entity.setPhaseOrder(request.getPhaseOrder());
        entity.setPhaseDurationWeeks(request.getPhaseDurationWeeks());
        entity.setPhaseObjectives(trimToNull(request.getPhaseObjectives()));
        entity.setAssessmentCriteria(trimToNull(request.getAssessmentCriteria()));
    }

    private PageResponse<TrainingMethodResponse> toMethodPageResponse(Page<TrainingMethod> entityPage) {
        Page<TrainingMethodResponse> dtoPage = entityPage.map(this::toMethodResponse);
        return PageResponse.<TrainingMethodResponse>builder()
                .content(dtoPage.getContent())
                .page(dtoPage.getNumber())
                .size(dtoPage.getSize())
                .totalElements(dtoPage.getTotalElements())
                .totalPages(dtoPage.getTotalPages())
                .build();
    }

    private PageResponse<TrainingExerciseResponse> toExercisePageResponse(Page<TrainingExercise> entityPage) {
        Page<TrainingExerciseResponse> dtoPage = entityPage.map(this::toExerciseResponse);
        return PageResponse.<TrainingExerciseResponse>builder()
                .content(dtoPage.getContent())
                .page(dtoPage.getNumber())
                .size(dtoPage.getSize())
                .totalElements(dtoPage.getTotalElements())
                .totalPages(dtoPage.getTotalPages())
                .build();
    }

    private PageResponse<TrainingRoadmapResponse> toRoadmapPageResponse(Page<TrainingRoadmap> entityPage) {
        Page<TrainingRoadmapResponse> dtoPage = entityPage.map(entity -> toRoadmapResponse(entity, List.of()));
        return PageResponse.<TrainingRoadmapResponse>builder()
                .content(dtoPage.getContent())
                .page(dtoPage.getNumber())
                .size(dtoPage.getSize())
                .totalElements(dtoPage.getTotalElements())
                .totalPages(dtoPage.getTotalPages())
                .build();
    }

    private TrainingMethodResponse toMethodResponse(TrainingMethod entity) {
        User createdBy = entity.getCreatedBy();

        return TrainingMethodResponse.builder()
                .methodId(entity.getMethodId())
                .methodName(entity.getMethodName())
                .description(entity.getDescription())
                .advantages(entity.getAdvantages())
                .disadvantages(entity.getDisadvantages())
                .instructions(entity.getInstructions())
                .status(entity.getStatus() == null ? null : entity.getStatus().name())
                .createdByName(resolveUserFullName(createdBy))
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private TrainingExerciseResponse toExerciseResponse(TrainingExercise entity) {
        TrainingMethod method = entity.getTrainingMethod();
        User createdBy = entity.getCreatedBy();

        return TrainingExerciseResponse.builder()
                .exerciseId(entity.getExerciseId())
                .exerciseName(entity.getExerciseName())
                .description(entity.getDescription())
                .difficultyLevel(entity.getDifficultyLevel() == null ? null : entity.getDifficultyLevel().name())
                .methodId(method == null ? null : method.getMethodId())
                .methodName(method == null ? null : method.getMethodName())
                .instructions(entity.getInstructions())
                .durationMinutes(entity.getDurationMinutes())
                .safetyPrecautions(entity.getSafetyPrecautions())
                .requiredEquipment(entity.getRequiredEquipment())
                .mediaUrls(entity.getMediaUrls())
                .status(entity.getStatus() == null ? null : entity.getStatus().name())
                .createdByName(resolveUserFullName(createdBy))
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private TrainingRoadmapResponse toRoadmapResponse(TrainingRoadmap entity, List<RoadmapExercise> exercises) {
        DogBreed breed = entity.getDogBreed();
        User createdBy = entity.getCreatedBy();

        return TrainingRoadmapResponse.builder()
                .roadmapId(entity.getRoadmapId())
                .roadmapName(entity.getRoadmapName())
                .breedId(breed == null ? null : breed.getBreedId())
                .breedName(breed == null ? BREED_ALL_LABEL : breed.getBreedName())
                .targetRole(entity.getTargetRole())
                .description(entity.getDescription())
                .totalDurationWeeks(entity.getTotalDurationWeeks())
                .phaseName(entity.getPhaseName())
                .phaseOrder(entity.getPhaseOrder())
                .phaseDurationWeeks(entity.getPhaseDurationWeeks())
                .phaseObjectives(entity.getPhaseObjectives())
                .assessmentCriteria(entity.getAssessmentCriteria())
                .status(entity.getStatus() == null ? null : entity.getStatus().name())
                .createdByName(resolveUserFullName(createdBy))
                .exercises(toRoadmapExerciseItems(exercises))
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private List<TrainingRoadmapResponse.RoadmapExerciseItem> toRoadmapExerciseItems(List<RoadmapExercise> exercises) {
        return exercises.stream()
                .map(exercise -> TrainingRoadmapResponse.RoadmapExerciseItem.builder()
                        .exerciseId(exercise.getTrainingExercise().getExerciseId())
                        .exerciseName(exercise.getTrainingExercise().getExerciseName())
                        .exerciseOrder(exercise.getExerciseOrder())
                        .isMandatory(exercise.getIsMandatory())
                        .build())
                .toList();
    }

    private String normalizeRequired(String value, String fieldName) {
        String normalized = trimToNull(value);
        if (normalized == null) {
            throw new IllegalArgumentException(fieldName + " is required");
        }
        return normalized;
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

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
