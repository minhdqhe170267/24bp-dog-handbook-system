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
import vn.edu.fpt.doghandbook.backend.entity.TrainingSpecialty;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.DifficultyLevel;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.DogBreedRepository;
import vn.edu.fpt.doghandbook.backend.repository.RoadmapExerciseRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingExerciseRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingMethodRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingPhaseRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingRoadmapRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingSpecialtyRepository;
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

    private static final String BREED_ALL_LABEL = "Tat ca giong";

    private final TrainingMethodRepository trainingMethodRepository;
    private final TrainingExerciseRepository trainingExerciseRepository;
    private final TrainingRoadmapRepository trainingRoadmapRepository;
    private final TrainingPhaseRepository trainingPhaseRepository;
    private final RoadmapExerciseRepository roadmapExerciseRepository;
    private final DogBreedRepository dogBreedRepository;
    private final UserRepository userRepository;
    private final TrainingSpecialtyRepository trainingSpecialtyRepository;

    @Override
    public PageResponse<TrainingMethodResponse> getAllMethods(int page, int size, String search) {
        Pageable pageable = buildPageable(page, size);
        Page<TrainingMethod> entityPage = search == null || search.isBlank()
                ? trainingMethodRepository.findByIsDeletedFalse(pageable)
                : trainingMethodRepository.findByMethodNameContainingIgnoreCaseAndIsDeletedFalse(search.trim(), pageable);
        return PageResponse.<TrainingMethodResponse>builder()
                .content(entityPage.getContent().stream().map(this::toMethodResponse).toList())
                .page(entityPage.getNumber())
                .size(entityPage.getSize())
                .totalElements(entityPage.getTotalElements())
                .totalPages(entityPage.getTotalPages())
                .build();
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
        return toMethodResponse(trainingMethodRepository.save(entity));
    }

    @Override
    @Transactional
    public TrainingMethodResponse updateMethod(Integer id, TrainingMethodRequest request) {
        TrainingMethod entity = getActiveMethodById(id);
        if (entity.getStatus() == ContentStatus.PUBLISHED) {
            throw new BadRequestException("Noi dung da xuat ban phai go xuat ban truoc khi sua");
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
            throw new BadRequestException("Noi dung da xuat ban phai go xuat ban truoc khi xoa");
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
            entityPage = trainingExerciseRepository.findByExerciseNameContainingIgnoreCaseAndIsDeletedFalse(search.trim(), pageable);
        } else if (difficulty != null && !difficulty.isBlank()) {
            entityPage = trainingExerciseRepository.findByDifficultyLevelAndIsDeletedFalse(parseDifficultyLevel(difficulty), pageable);
        } else {
            entityPage = trainingExerciseRepository.findByIsDeletedFalse(pageable);
        }
        return PageResponse.<TrainingExerciseResponse>builder()
                .content(entityPage.getContent().stream().map(this::toExerciseResponse).toList())
                .page(entityPage.getNumber())
                .size(entityPage.getSize())
                .totalElements(entityPage.getTotalElements())
                .totalPages(entityPage.getTotalPages())
                .build();
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
        return toExerciseResponse(trainingExerciseRepository.save(entity));
    }

    @Override
    @Transactional
    public TrainingExerciseResponse updateExercise(Integer id, TrainingExerciseRequest request) {
        TrainingExercise entity = getActiveExerciseById(id);
        if (entity.getStatus() == ContentStatus.PUBLISHED) {
            throw new BadRequestException("Noi dung da xuat ban phai go xuat ban truoc khi sua");
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
            throw new BadRequestException("Noi dung da xuat ban phai go xuat ban truoc khi xoa");
        }
        entity.setIsDeleted(true);
        entity.setDeletedAt(LocalDateTime.now());
        trainingExerciseRepository.save(entity);
    }

    @Override
    public PageResponse<TrainingRoadmapResponse> getAllRoadmaps(int page, int size, Integer specialtyId) {
        Pageable pageable = buildPageable(page, size);
        Page<TrainingRoadmap> entityPage = specialtyId == null
                ? trainingRoadmapRepository.findByIsDeletedFalse(pageable)
                : trainingRoadmapRepository.findByTrainingSpecialtySpecialtyIdAndIsDeletedFalse(specialtyId, pageable);
        return PageResponse.<TrainingRoadmapResponse>builder()
                .content(entityPage.getContent().stream().map(this::toRoadmapSummaryResponse).toList())
                .page(entityPage.getNumber())
                .size(entityPage.getSize())
                .totalElements(entityPage.getTotalElements())
                .totalPages(entityPage.getTotalPages())
                .build();
    }

    @Override
    public TrainingRoadmapResponse getRoadmapById(Integer id) {
        return toRoadmapDetailResponse(getActiveRoadmapById(id));
    }

    @Override
    @Transactional
    public TrainingRoadmapResponse createRoadmap(TrainingRoadmapRequest request, Integer userId) {
        TrainingRoadmap entity = new TrainingRoadmap();
        applyRoadmapRequest(entity, request);
        validateRoadmapOrder(entity.getTrainingSpecialty().getSpecialtyId(), entity.getRoadmapOrder(), null);
        entity.setCreatedBy(getUserById(userId));
        entity.setStatus(ContentStatus.DRAFT);
        entity.setIsDeleted(false);
        entity.setDeletedAt(null);
        TrainingRoadmap saved = trainingRoadmapRepository.save(entity);
        persistPhases(saved, normalizePhaseRequests(request));
        bumpSpecialtyVersion(saved.getTrainingSpecialty());
        return toRoadmapDetailResponse(saved);
    }

    @Override
    @Transactional
    public TrainingRoadmapResponse updateRoadmap(Integer id, TrainingRoadmapRequest request) {
        TrainingRoadmap entity = getActiveRoadmapById(id);
        if (entity.getStatus() == ContentStatus.PUBLISHED) {
            throw new BadRequestException("Noi dung da xuat ban phai go xuat ban truoc khi sua");
        }
        applyRoadmapRequest(entity, request);
        validateRoadmapOrder(entity.getTrainingSpecialty().getSpecialtyId(), entity.getRoadmapOrder(), entity.getRoadmapId());
        if (entity.getStatus() == ContentStatus.REJECTED) {
            entity.setStatus(ContentStatus.DRAFT);
        }
        TrainingRoadmap saved = trainingRoadmapRepository.save(entity);
        replacePhases(saved, normalizePhaseRequests(request));
        bumpSpecialtyVersion(saved.getTrainingSpecialty());
        return toRoadmapDetailResponse(saved);
    }

    @Override
    @Transactional
    public void deleteRoadmap(Integer id) {
        TrainingRoadmap entity = getActiveRoadmapById(id);
        if (entity.getStatus() == ContentStatus.PUBLISHED) {
            throw new BadRequestException("Noi dung da xuat ban phai go xuat ban truoc khi xoa");
        }
        entity.setIsDeleted(true);
        entity.setDeletedAt(LocalDateTime.now());
        trainingRoadmapRepository.save(entity);

        List<TrainingPhase> phases = trainingPhaseRepository.findByTrainingRoadmapRoadmapIdAndIsDeletedFalseOrderByPhaseOrderAsc(id);
        LocalDateTime now = LocalDateTime.now();
        for (TrainingPhase phase : phases) {
            phase.setIsDeleted(true);
            phase.setDeletedAt(now);
        }
        trainingPhaseRepository.saveAll(phases);
        bumpSpecialtyVersion(entity.getTrainingSpecialty());
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

    private TrainingSpecialty getActiveSpecialtyById(Integer specialtyId) {
        if (specialtyId == null || specialtyId <= 0) {
            throw new BadRequestException("specialtyId is required");
        }
        return trainingSpecialtyRepository.findBySpecialtyIdAndIsDeletedFalse(specialtyId)
                .orElseThrow(() -> new ResourceNotFoundException("Training specialty not found: " + specialtyId));
    }

    private User getUserById(Integer userId) {
        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("userId must be greater than 0");
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
    }

    private TrainingMethod getMethodIfPresent(Integer methodId) {
        return methodId == null ? null : getActiveMethodById(methodId);
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
            throw new BadRequestException("Muc do bai tap khong hop le");
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
        entity.setRoadmapOrder(request.getRoadmapOrder() == null ? 1 : request.getRoadmapOrder());
        entity.setTrainingSpecialty(getActiveSpecialtyById(request.getSpecialtyId()));
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
                throw new BadRequestException("Thu tu giai doan khong duoc trung");
            }
            phaseRequest.setPhaseObjectives(trimToNull(phaseRequest.getPhaseObjectives()));
            phaseRequest.setAssessmentCriteria(trimToNull(phaseRequest.getAssessmentCriteria()));
            List<Integer> exerciseIds = phaseRequest.getExerciseIds();
            if (exerciseIds == null || exerciseIds.isEmpty()) {
                continue;
            }
            for (Integer exerciseId : exerciseIds) {
                if (exerciseId == null || exerciseId <= 0) {
                    throw new BadRequestException("exerciseIds phai chua gia tri > 0");
                }
                if (!seenExercises.add(exerciseId)) {
                    throw new BadRequestException("Moi bai tap chi duoc xuat hien mot lan trong lo trinh");
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
        List<TrainingPhase> existingPhases = trainingPhaseRepository.findByTrainingRoadmapRoadmapIdAndIsDeletedFalseOrderByPhaseOrderAsc(roadmap.getRoadmapId());
        for (TrainingPhase existingPhase : existingPhases) {
            List<RoadmapExercise> exercises = roadmapExerciseRepository.findByTrainingPhasePhaseIdOrderByExerciseOrder(existingPhase.getPhaseId());
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
        List<TrainingPhase> phases = trainingPhaseRepository.findByTrainingRoadmapRoadmapIdAndIsDeletedFalseOrderByPhaseOrderAsc(entity.getRoadmapId());
        return toRoadmapResponse(entity, phases, Map.of(), false);
    }

    private TrainingRoadmapResponse toRoadmapDetailResponse(TrainingRoadmap entity) {
        List<TrainingPhase> phases = trainingPhaseRepository.findByTrainingRoadmapRoadmapIdAndIsDeletedFalseOrderByPhaseOrderAsc(entity.getRoadmapId());
        List<RoadmapExercise> roadmapExercises = roadmapExerciseRepository.findByRoadmapRoadmapIdOrderByPhaseOrderAndExerciseOrder(entity.getRoadmapId());
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
        TrainingSpecialty specialty = entity.getTrainingSpecialty();
        TrainingPhase firstPhase = phases.isEmpty() ? null : phases.get(0);
        List<TrainingRoadmapResponse.TrainingPhaseItem> phaseItems = includePhases ? toPhaseItems(phases, exercisesByPhase) : List.of();
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
                .roadmapOrder(entity.getRoadmapOrder())
                .specialtyId(specialty == null ? null : specialty.getSpecialtyId())
                .specialtyCode(specialty == null ? null : specialty.getSpecialtyCode())
                .specialtyName(specialty == null ? null : specialty.getSpecialtyName())
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

    private void validateRoadmapOrder(Integer specialtyId, Integer roadmapOrder, Integer currentRoadmapId) {
        if (roadmapOrder == null || roadmapOrder <= 0) {
            throw new BadRequestException("Thu tu lo trinh phai lon hon 0");
        }
        boolean duplicatedOrder = trainingRoadmapRepository
                .findByTrainingSpecialtySpecialtyIdAndIsDeletedFalseOrderByRoadmapOrderAsc(specialtyId)
                .stream()
                .filter(roadmap -> !Objects.equals(roadmap.getRoadmapId(), currentRoadmapId))
                .anyMatch(roadmap -> Objects.equals(roadmap.getRoadmapOrder(), roadmapOrder));
        if (duplicatedOrder) {
            throw new BadRequestException("Thu tu lo trinh khong duoc trung trong cung chuyen nganh");
        }
    }

    private void bumpSpecialtyVersion(TrainingSpecialty specialty) {
        if (specialty == null) {
            return;
        }
        specialty.setVersion((specialty.getVersion() == null ? 1 : specialty.getVersion()) + 1);
        trainingSpecialtyRepository.save(specialty);
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
