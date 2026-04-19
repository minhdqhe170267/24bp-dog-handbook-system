package vn.edu.fpt.doghandbook.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.fpt.doghandbook.backend.dto.request.BreedRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.BreedCompareResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.BreedResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.DevelopmentStageResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.entity.DevelopmentStage;
import vn.edu.fpt.doghandbook.backend.entity.DogBreed;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.SizeClassification;
import vn.edu.fpt.doghandbook.backend.entity.enums.TrainabilityLevel;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.DevelopmentStageRepository;
import vn.edu.fpt.doghandbook.backend.repository.DogBreedRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.BreedService;
import vn.edu.fpt.doghandbook.backend.service.CloudinaryService;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class BreedServiceImpl implements BreedService {

    private final DogBreedRepository dogBreedRepository;
    private final DevelopmentStageRepository developmentStageRepository;
    private final UserRepository userRepository;
    private final CloudinaryService cloudinaryService;

    private static final Map<TrainabilityLevel, Integer> TRAINABILITY_RANK = Map.of(
            TrainabilityLevel.LOW, 1,
            TrainabilityLevel.MEDIUM, 2,
            TrainabilityLevel.HIGH, 3,
            TrainabilityLevel.VERY_HIGH, 4
    );

    @Override
    @Transactional(readOnly = true)
    public PageResponse<BreedResponse> getAll(int page, int size, String search) {
        Pageable pageable = PageRequest.of(page, size);
        Page<DogBreed> breedPage;

        if (search == null || search.isBlank()) {
            breedPage = dogBreedRepository.findByIsDeletedFalse(pageable);
        } else {
            breedPage = dogBreedRepository.findByBreedNameContainingIgnoreCaseAndIsDeletedFalse(search, pageable);
        }

        List<BreedResponse> responses = breedPage.getContent().stream()
                .map(this::toBreedResponse)
                .toList();

        return PageResponse.<BreedResponse>builder()
                .content(responses)
                .page(breedPage.getNumber())
                .size(breedPage.getSize())
                .totalElements(breedPage.getTotalElements())
                .totalPages(breedPage.getTotalPages())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public BreedResponse getById(Integer id) {
        DogBreed breed = dogBreedRepository.findByBreedIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Giống chó", "id", id));
        return toBreedResponse(breed);
    }

    @Override
    public BreedResponse create(BreedRequest request, Integer createdByUserId, MultipartFile image) {
        if (dogBreedRepository.existsByBreedNameAndIsDeletedFalse(request.getBreedName())) {
            throw new BadRequestException("Giống chó '" + request.getBreedName() + "' đã tồn tại");
        }

        User createdBy = userRepository.findById(createdByUserId).orElse(null);
        String imageUrl = resolveImageUrl(image);
        String normalizedLifespanYears = normalizeAndValidateLifespanYears(request.getLifespanYears());

        DogBreed breed = DogBreed.builder()
                .breedName(request.getBreedName())
                .origin(request.getOrigin())
                .description(request.getDescription())
                .sizeClassification(parseSizeClassification(request.getSizeClassification()))
                .weightMaleMinKg(request.getWeightMaleMinKg())
                .weightMaleMaxKg(request.getWeightMaleMaxKg())
                .weightFemaleMinKg(request.getWeightFemaleMinKg())
                .weightFemaleMaxKg(request.getWeightFemaleMaxKg())
                .avgHeightCm(request.getAvgHeightCm())
                .lifespanYears(normalizedLifespanYears)
                .trainabilityLevel(parseTrainabilityLevel(request.getTrainabilityLevel()))
                .operationalCapabilities(request.getOperationalCapabilities())
                .metadata(request.getMetadata())
                .imageUrl(imageUrl)
                .status(ContentStatus.DRAFT)
                .createdBy(createdBy)
                .isDeleted(false)
                .build();

        return toBreedResponse(dogBreedRepository.save(breed));
    }

    @Override
    public BreedResponse update(Integer id, BreedRequest request, MultipartFile image) {
        DogBreed breed = dogBreedRepository.findByBreedIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Giống chó", "id", id));

        if (breed.getStatus() == ContentStatus.PUBLISHED) {
            throw new BadRequestException("Nội dung đã xuất bản phải gỡ xuất bản trước khi sửa");
        }

        if (!breed.getBreedName().equals(request.getBreedName())
                && dogBreedRepository.existsByBreedNameAndIsDeletedFalse(request.getBreedName())) {
            throw new BadRequestException("Giống chó '" + request.getBreedName() + "' đã tồn tại");
        }

        breed.setBreedName(request.getBreedName());
        breed.setOrigin(request.getOrigin());
        breed.setDescription(request.getDescription());
        breed.setSizeClassification(parseSizeClassification(request.getSizeClassification()));
        breed.setWeightMaleMinKg(request.getWeightMaleMinKg());
        breed.setWeightMaleMaxKg(request.getWeightMaleMaxKg());
        breed.setWeightFemaleMinKg(request.getWeightFemaleMinKg());
        breed.setWeightFemaleMaxKg(request.getWeightFemaleMaxKg());
        breed.setAvgHeightCm(request.getAvgHeightCm());
        breed.setLifespanYears(normalizeAndValidateLifespanYears(request.getLifespanYears()));
        breed.setTrainabilityLevel(parseTrainabilityLevel(request.getTrainabilityLevel()));
        breed.setOperationalCapabilities(request.getOperationalCapabilities());
        breed.setMetadata(request.getMetadata());
        String newImageUrl = resolveImageUrl(image);
        if (newImageUrl != null) {
            breed.setImageUrl(newImageUrl);
        }

        if (breed.getStatus() == ContentStatus.REJECTED) {
            breed.setStatus(ContentStatus.DRAFT);
        }

        return toBreedResponse(dogBreedRepository.save(breed));
    }

    @Override
    public void delete(Integer id) {
        DogBreed breed = dogBreedRepository.findByBreedIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Giống chó", "id", id));
        if (breed.getStatus() == ContentStatus.PUBLISHED) {
            throw new BadRequestException("Nội dung đã xuất bản phải gỡ xuất bản trước khi xóa");
        }
        breed.setIsDeleted(true);
        breed.setDeletedAt(LocalDateTime.now());
        dogBreedRepository.save(breed);
    }

    @Override
    @Transactional(readOnly = true)
    public BreedCompareResponse compare(List<Integer> breedIds) {
        List<DogBreed> breeds = dogBreedRepository.findByBreedIdInAndIsDeletedFalse(breedIds);
        if (breeds.size() < 2) {
            throw new BadRequestException("Cần ít nhất 2 giống chó hợp lệ");
        }

        List<BreedResponse> responses = breeds.stream().map(this::toBreedResponse).toList();

        String heaviestBreed = breeds.stream()
                .filter(b -> b.getWeightMaleMaxKg() != null)
                .max(Comparator.comparing(DogBreed::getWeightMaleMaxKg))
                .map(DogBreed::getBreedName)
                .orElse(null);

        String lightestBreed = breeds.stream()
                .filter(b -> b.getWeightFemaleMinKg() != null)
                .min(Comparator.comparing(DogBreed::getWeightFemaleMinKg))
                .map(DogBreed::getBreedName)
                .orElse(null);

        String mostTrainable = breeds.stream()
                .filter(b -> b.getTrainabilityLevel() != null)
                .max(Comparator.comparingInt(b -> TRAINABILITY_RANK.getOrDefault(b.getTrainabilityLevel(), 0)))
                .map(DogBreed::getBreedName)
                .orElse(null);

        String longestLifespan = breeds.stream()
                .filter(b -> b.getLifespanYears() != null)
                .max(Comparator.comparingInt(b -> parseMaxLifespan(b.getLifespanYears())))
                .map(DogBreed::getBreedName)
                .orElse(null);

        BreedCompareResponse.ComparisonSummary summary = BreedCompareResponse.ComparisonSummary.builder()
                .heaviestBreed(heaviestBreed)
                .lightestBreed(lightestBreed)
                .mostTrainable(mostTrainable)
                .longestLifespan(longestLifespan)
                .build();

        return BreedCompareResponse.builder()
                .breeds(responses)
                .summary(summary)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<DevelopmentStageResponse> getDevelopmentStages(Integer breedId) {
        List<DevelopmentStage> stages;
        if (breedId == null) {
            stages = developmentStageRepository.findByIsDeletedFalseOrderByDogBreedBreedIdAscStageOrderAsc();
        } else {
            dogBreedRepository.findByBreedIdAndIsDeletedFalse(breedId)
                    .orElseThrow(() -> new ResourceNotFoundException("Giống chó", "id", breedId));
            stages = developmentStageRepository.findByDogBreedBreedIdAndIsDeletedFalseOrderByStageOrder(breedId);
        }

        return stages
                .stream()
                .map(this::toDevelopmentStageResponse)
                .toList();
    }

    private String resolveImageUrl(MultipartFile image) {
        if (image != null && !image.isEmpty()) {
            return cloudinaryService.upload(image, "image").secureUrl();
        }
        return null;
    }

    private String normalizeAndValidateLifespanYears(String lifespanYears) {
        if (lifespanYears == null || lifespanYears.isBlank()) {
            return null;
        }

        String normalized = lifespanYears.trim();
        int years;
        try {
            years = Integer.parseInt(normalized);
        } catch (NumberFormatException ex) {
            throw new BadRequestException("Tuổi thọ phải là số năm hợp lệ, ví dụ 10");
        }

        if (years < 1 || years > 30) {
            throw new BadRequestException("Tuổi thọ phải nằm trong khoảng 1-30 năm");
        }
        return String.valueOf(years);
    }

    // ── Helpers ──────────────────────────────────────────────

    private BreedResponse toBreedResponse(DogBreed entity) {
        return BreedResponse.builder()
                .breedId(entity.getBreedId())
                .breedName(entity.getBreedName())
                .origin(entity.getOrigin())
                .description(entity.getDescription())
                .sizeClassification(entity.getSizeClassification() != null
                        ? entity.getSizeClassification().name() : null)
                .weightMaleMinKg(entity.getWeightMaleMinKg())
                .weightMaleMaxKg(entity.getWeightMaleMaxKg())
                .weightFemaleMinKg(entity.getWeightFemaleMinKg())
                .weightFemaleMaxKg(entity.getWeightFemaleMaxKg())
                .avgHeightCm(entity.getAvgHeightCm())
                .lifespanYears(entity.getLifespanYears())
                .trainabilityLevel(entity.getTrainabilityLevel() != null
                        ? entity.getTrainabilityLevel().name() : null)
                .operationalCapabilities(entity.getOperationalCapabilities())
                .metadata(entity.getMetadata())
                .imageUrl(entity.getImageUrl())
                .status(entity.getStatus() != null ? entity.getStatus().name() : null)
                .createdByName(entity.getCreatedBy() != null ? entity.getCreatedBy().getFullName() : null)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private DevelopmentStageResponse toDevelopmentStageResponse(DevelopmentStage stage) {
        return DevelopmentStageResponse.builder()
                .stageId(stage.getStageId())
                .breedId(stage.getDogBreed() != null ? stage.getDogBreed().getBreedId() : null)
                .breedName(stage.getDogBreed() != null ? stage.getDogBreed().getBreedName() : null)
                .stageName(stage.getStageName())
                .ageMinMonths(stage.getAgeMinMonths())
                .ageMaxMonths(stage.getAgeMaxMonths())
                .stageOrder(stage.getStageOrder())
                .physicalMilestones(stage.getPhysicalMilestones())
                .behavioralMilestones(stage.getBehavioralMilestones())
                .trainingNotes(stage.getTrainingNotes())
                .nutritionNotes(stage.getNutritionNotes())
                .status(stage.getStatus() != null ? stage.getStatus().name() : null)
                .createdAt(stage.getCreatedAt())
                .build();
    }

    private SizeClassification parseSizeClassification(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return SizeClassification.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Kích thước không hợp lệ: " + value);
        }
    }

    private TrainabilityLevel parseTrainabilityLevel(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return TrainabilityLevel.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Mức độ huấn luyện không hợp lệ: " + value);
        }
    }

    private int parseMaxLifespan(String lifespanYears) {
        if (lifespanYears == null || lifespanYears.isBlank()) return 0;
        try {
            String[] parts = lifespanYears.split("-");
            return Integer.parseInt(parts[parts.length - 1].trim());
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
