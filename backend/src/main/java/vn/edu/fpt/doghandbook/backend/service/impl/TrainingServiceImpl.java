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
import vn.edu.fpt.doghandbook.backend.dto.request.TrainingPhaseRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.TrainingRoadmapRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.TrainingExerciseResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.TrainingMethodResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.TrainingRoadmapResponse;
import vn.edu.fpt.doghandbook.backend.entity.DogBreed;
import vn.edu.fpt.doghandbook.backend.entity.RoadmapExercise;
import vn.edu.fpt.doghandbook.backend.entity.TrainingExercise;
import vn.edu.fpt.doghandbook.backend.entity.TrainingMethod;
import vn.edu.fpt.doghandbook.backend.entity.TrainingPhase;
import vn.edu.fpt.doghandbook.backend.entity.TrainingRoadmap;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.DifficultyLevel;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.DogBreedRepository;
import vn.edu.fpt.doghandbook.backend.repository.DogTrainingEnrollmentRepository;
import vn.edu.fpt.doghandbook.backend.repository.RoadmapExerciseRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingExerciseRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingMethodRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingPhaseRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingRoadmapRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.TrainingService;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TrainingServiceImpl implements TrainingService {

    private static final String BREED_ALL_LABEL = "Tất cả giống";

    private final TrainingMethodRepository trainingMethodRepository;
    private final TrainingExerciseRepository trainingExerciseRepository;
    private final TrainingRoadmapRepository trainingRoadmapRepository;
    private final TrainingPhaseRepository trainingPhaseRepository;
    private final RoadmapExerciseRepository roadmapExerciseRepository;
    private final DogBreedRepository dogBreedRepository;
    private final UserRepository userRepository;
    private final DogTrainingEnrollmentRepository dogTrainingEnrollmentRepository;

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
        if (entity.getStatus() == ContentStatus.PUBLISHED) {
            throw new BadRequestException("Nội dung đã xuất bản phải gỡ xuất bản trước khi sửa");
        }
        applyMethodRequest(entity, request);
        if (entity.getStatus() == ContentStatus.REJECTED) {
            entity.setStatus(ContentStatus.DRAFT);
        }
        return toMethodResponse(trainingMethodRepository.save(entity));
    }

    @Override
    @Transactional
    public void deleteMethod(Integer id) {
        TrainingMethod entity = getActiveMethodById(id);
        if (entity.getStatus() == ContentStatus.PUBLISHED) {
            throw new BadRequestException("Nội dung đã xuất bản phải gỡ xuất bản trước khi xóa");
        }
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
        if (entity.getStatus() == ContentStatus.PUBLISHED) {
            throw new BadRequestException("Nội dung đã xuất bản phải gỡ xuất bản trước khi sửa");
        }
        applyExerciseRequest(entity, request);
        if (entity.getStatus() == ContentStatus.REJECTED) {
            entity.setStatus(ContentStatus.DRAFT);
        }
        return toExerciseResponse(trainingExerciseRepository.save(entity));
    }

    @Override
    @Transactional
    public void deleteExercise(Integer id) {
        TrainingExercise entity = getActiveExerciseById(id);
        if (entity.getStatus() == ContentStatus.PUBLISHED) {
            throw new BadRequestException("Nội dung đã xuất bản phải gỡ xuất bản trước khi xóa");
        }
        entity.setIsDeleted(true);
        entity.setDeletedAt(LocalDateTime.now());
        trainingExerciseRepository.save(entity);
    }

    @Override
    public PageResponse<TrainingRoadmapResponse> getAllRoadmaps(int page, int size) {
        Pageable pageable = buildPageable(page, size);
        Page<TrainingRoadmap> entityPage = trainingRoadmapRepository.findByIsDeletedFalse(pageable);
        Page<TrainingRoadmapResponse> dtoPage = entityPage.map(this::toRoadmapSummaryResponse);
        return PageResponse.<TrainingRoadmapResponse>builder()
                .content(dtoPage.getContent())
                .page(dtoPage.getNumber())
                .size(dtoPage.getSize())
                .totalElements(dtoPage.getTotalElements())
                .totalPages(dtoPage.getTotalPages())
                .build();
    }

    @Override
    public TrainingRoadmapResponse getRoadmapById(Integer id) {
        TrainingRoadmap entity = getActiveRoadmapById(id);
        return toRoadmapDetailResponse(entity);
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
        TrainingRoadmap saved = trainingRoadmapRepository.save(entity);

        persistPhases(saved, normalizePhaseRequests(request));
        return toRoadmapDetailResponse(saved);
    }

    @Override
    @Transactional
    public TrainingRoadmapResponse updateRoadmap(Integer id, TrainingRoadmapRequest request) {
        TrainingRoadmap entity = getActiveRoadmapById(id);
        if (entity.getStatus() == ContentStatus.PUBLISHED) {
            throw new BadRequestException("Nội dung đã xuất bản phải gỡ xuất bản trước khi sửa");
        }
        if (dogTrainingEnrollmentRepository.existsByTrainingRoadmapRoadmapIdAndIsDeletedFalse(id)) {
            throw new BadRequestException("Không thể sửa cấu trúc lộ trình đã có chó ghi danh");
        }

        applyRoadmapRequest(entity, request);
        if (entity.getStatus() == ContentStatus.REJECTED) {
            entity.setStatus(ContentStatus.DRAFT);
        }
        TrainingRoadmap saved = trainingRoadmapRepository.save(entity);
        replacePhases(saved, normalizePhaseRequests(request));
        return toRoadmapDetailResponse(saved);
    }

    @Override
    @Transactional
    public void deleteRoadmap(Integer id) {
        TrainingRoadmap entity = getActiveRoadmapById(id);
        if (entity.getStatus() == ContentStatus.PUBLISHED) {
            throw new BadRequestException("Nội dung đã xuất bản phải gỡ xuất bản trước khi xóa");
        }
        if (dogTrainingEnrollmentRepository.existsByTrainingRoadmapRoadmapIdAndIsDeletedFalse(id)) {
            throw new BadRequestException("Không thể xóa lộ trình đã có chó ghi danh");
        }

        entity.setIsDeleted(true);
        entity.setDeletedAt(LocalDateTime.now());
        trainingRoadmapRepository.save(entity);

        List<TrainingPhase> phases = trainingPhaseRepository
                .findByTrainingRoadmapRoadmapIdAndIsDeletedFalseOrderByPhaseOrderAsc(id);
        LocalDateTime now = LocalDateTime.now();
        for (TrainingPhase phase : phases) {
            phase.setIsDeleted(true);
            phase.setDeletedAt(now);
        }
        trainingPhaseRepository.saveAll(phases);
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
    }

    private List<TrainingPhaseRequest> normalizePhaseRequests(TrainingRoadmapRequest request) {
        List<TrainingPhaseRequest> requests = new ArrayList<>();
        if (request.getPhases() != null && !request.getPhases().isEmpty()) {
            requests.addAll(request.getPhases());
        } else if (request.getPhaseName() != null || request.getPhaseOrder() != null) {
            TrainingPhaseRequest phaseRequest = new TrainingPhaseRequest();
            phaseRequest.setPhaseName(request.getPhaseName());
            phaseRequest.setPhaseOrder(request.getPhaseOrder());
            phaseRequest.setPhaseDurationWeeks(request.getPhaseDurationWeeks());
            phaseRequest.setPhaseObjectives(request.getPhaseObjectives());
            phaseRequest.setAssessmentCriteria(request.getAssessmentCriteria());
            phaseRequest.setExerciseIds(request.getExerciseIds());
            requests.add(phaseRequest);
        }

        if (requests.isEmpty()) {
            throw new IllegalArgumentException("At least one phase is required");
        }

        requests.sort(Comparator.comparing(TrainingPhaseRequest::getPhaseOrder, Comparator.nullsLast(Integer::compareTo)));

        Set<Integer> seenOrders = new LinkedHashSet<>();
        Set<Integer> seenExercises = new LinkedHashSet<>();
        for (TrainingPhaseRequest phaseRequest : requests) {
            String phaseName = trimToNull(phaseRequest.getPhaseName());
            if (phaseName == null) {
                throw new IllegalArgumentException("phaseName is required");
            }
            phaseRequest.setPhaseName(phaseName);
            if (phaseRequest.getPhaseOrder() == null || phaseRequest.getPhaseOrder() <= 0) {
                throw new IllegalArgumentException("phaseOrder is required");
            }
            if (!seenOrders.add(phaseRequest.getPhaseOrder())) {
                throw new BadRequestException("Thứ tự giai đoạn không được trùng");
            }
            phaseRequest.setPhaseObjectives(trimToNull(phaseRequest.getPhaseObjectives()));
            phaseRequest.setAssessmentCriteria(trimToNull(phaseRequest.getAssessmentCriteria()));

            List<Integer> exerciseIds = phaseRequest.getExerciseIds();
            if (exerciseIds == null || exerciseIds.isEmpty()) {
                continue;
            }
            for (Integer exerciseId : exerciseIds) {
                if (exerciseId == null || exerciseId <= 0) {
                    throw new BadRequestException("exerciseIds phải chứa giá trị > 0");
                }
                if (!seenExercises.add(exerciseId)) {
                    throw new BadRequestException("Mỗi bài tập chỉ được xuất hiện một lần trong lộ trình");
                }
            }
        }
        return requests;
    }

    @Transactional
    protected void persistPhases(TrainingRoadmap roadmap, List<TrainingPhaseRequest> phaseRequests) {
        for (TrainingPhaseRequest phaseRequest : phaseRequests) {
            TrainingPhase phase = TrainingPhase.builder()
                    .trainingRoadmap(roadmap)
                    .roadmapName(roadmap.getRoadmapName())
                    .targetRole(roadmap.getTargetRole())
                    .description(roadmap.getDescription())
                    .totalDurationWeeks(roadmap.getTotalDurationWeeks())
                    .phaseName(phaseRequest.getPhaseName())
                    .phaseOrder(phaseRequest.getPhaseOrder())
                    .phaseDurationWeeks(phaseRequest.getPhaseDurationWeeks())
                    .phaseObjectives(phaseRequest.getPhaseObjectives())
                    .assessmentCriteria(phaseRequest.getAssessmentCriteria())
                    .status(roadmap.getStatus())
                    .publishedAt(roadmap.getPublishedAt())
                    .isDeleted(false)
                    .build();
            TrainingPhase savedPhase = trainingPhaseRepository.save(phase);
            persistRoadmapExercises(savedPhase, phaseRequest.getExerciseIds());
        }
    }

    @Transactional
    protected void replacePhases(TrainingRoadmap roadmap, List<TrainingPhaseRequest> phaseRequests) {
        List<TrainingPhase> existingPhases = trainingPhaseRepository
                .findByTrainingRoadmapRoadmapIdAndIsDeletedFalseOrderByPhaseOrderAsc(roadmap.getRoadmapId());
        for (TrainingPhase existingPhase : existingPhases) {
            List<RoadmapExercise> exercises = roadmapExerciseRepository
                    .findByTrainingPhasePhaseIdOrderByExerciseOrder(existingPhase.getPhaseId());
            roadmapExerciseRepository.deleteAll(exercises);
        }
        trainingPhaseRepository.deleteAll(existingPhases);
        persistPhases(roadmap, phaseRequests);
    }

    private void persistRoadmapExercises(TrainingPhase phase, List<Integer> exerciseIds) {
        if (exerciseIds == null || exerciseIds.isEmpty()) {
            return;
        }

        List<RoadmapExercise> entities = new ArrayList<>();
        int order = 1;
        for (Integer exerciseId : exerciseIds) {
            TrainingExercise exercise = getActiveExerciseById(exerciseId);
            entities.add(RoadmapExercise.builder()
                    .trainingPhase(phase)
                    .trainingExercise(exercise)
                    .exerciseOrder(order++)
                    .isMandatory(true)
                    .build());
        }
        roadmapExerciseRepository.saveAll(entities);
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

    private TrainingRoadmapResponse toRoadmapSummaryResponse(TrainingRoadmap entity) {
        List<TrainingPhase> phases = trainingPhaseRepository
                .findByTrainingRoadmapRoadmapIdAndIsDeletedFalseOrderByPhaseOrderAsc(entity.getRoadmapId());
        return toRoadmapResponse(entity, phases, Map.of(), false);
    }

    private TrainingRoadmapResponse toRoadmapDetailResponse(TrainingRoadmap entity) {
        List<TrainingPhase> phases = trainingPhaseRepository
                .findByTrainingRoadmapRoadmapIdAndIsDeletedFalseOrderByPhaseOrderAsc(entity.getRoadmapId());
        List<RoadmapExercise> roadmapExercises = roadmapExerciseRepository
                .findByRoadmapRoadmapIdOrderByPhaseOrderAndExerciseOrder(entity.getRoadmapId());
        Map<Integer, List<RoadmapExercise>> exercisesByPhase = roadmapExercises.stream()
                .collect(Collectors.groupingBy(re -> re.getTrainingPhase().getPhaseId(), LinkedHashMap::new, Collectors.toList()));
        return toRoadmapResponse(entity, phases, exercisesByPhase, true);
    }

    private TrainingRoadmapResponse toRoadmapResponse(
            TrainingRoadmap entity,
            List<TrainingPhase> phases,
            Map<Integer, List<RoadmapExercise>> exercisesByPhase,
            boolean includePhases
    ) {
        DogBreed breed = entity.getDogBreed();
        User createdBy = entity.getCreatedBy();
        TrainingPhase firstPhase = phases.isEmpty() ? null : phases.get(0);
        List<TrainingRoadmapResponse.TrainingPhaseItem> phaseItems = includePhases
                ? toPhaseItems(phases, exercisesByPhase)
                : List.of();
        List<TrainingRoadmapResponse.RoadmapExerciseItem> flattenedExercises = includePhases
                ? phaseItems.stream()
                .map(TrainingRoadmapResponse.TrainingPhaseItem::getExercises)
                .filter(Objects::nonNull)
                .flatMap(Collection::stream)
                .toList()
                : List.of();

        return TrainingRoadmapResponse.builder()
                .roadmapId(entity.getRoadmapId())
                .roadmapName(entity.getRoadmapName())
                .breedId(breed == null ? null : breed.getBreedId())
                .breedName(breed == null ? BREED_ALL_LABEL : breed.getBreedName())
                .targetRole(entity.getTargetRole())
                .description(entity.getDescription())
                .totalDurationWeeks(entity.getTotalDurationWeeks())
                .phaseName(firstPhase == null ? null : firstPhase.getPhaseName())
                .phaseOrder(firstPhase == null ? null : firstPhase.getPhaseOrder())
                .phaseDurationWeeks(firstPhase == null ? null : firstPhase.getPhaseDurationWeeks())
                .phaseObjectives(firstPhase == null ? null : firstPhase.getPhaseObjectives())
                .assessmentCriteria(firstPhase == null ? null : firstPhase.getAssessmentCriteria())
                .totalPhases(phases.size())
                .status(entity.getStatus() == null ? null : entity.getStatus().name())
                .createdByName(resolveUserFullName(createdBy))
                .exercises(flattenedExercises)
                .phases(phaseItems)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private List<TrainingRoadmapResponse.TrainingPhaseItem> toPhaseItems(
            List<TrainingPhase> phases,
            Map<Integer, List<RoadmapExercise>> exercisesByPhase
    ) {
        return phases.stream()
                .map(phase -> {
                    List<TrainingRoadmapResponse.RoadmapExerciseItem> exercises = toRoadmapExerciseItems(
                            exercisesByPhase.getOrDefault(phase.getPhaseId(), List.of())
                    );
                    return TrainingRoadmapResponse.TrainingPhaseItem.builder()
                            .phaseId(phase.getPhaseId())
                            .phaseName(phase.getPhaseName())
                            .phaseOrder(phase.getPhaseOrder())
                            .phaseDurationWeeks(phase.getPhaseDurationWeeks())
                            .phaseObjectives(phase.getPhaseObjectives())
                            .assessmentCriteria(phase.getAssessmentCriteria())
                            .totalExercises(exercises.size())
                            .exercises(exercises)
                            .build();
                })
                .toList();
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
