package vn.edu.fpt.doghandbook.backend.service.impl;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.fpt.doghandbook.backend.dto.request.NutritionStandardRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.NutritionStandardResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.entity.DogBreed;
import vn.edu.fpt.doghandbook.backend.entity.NutritionStandard;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ConflictException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.DogBreedRepository;
import vn.edu.fpt.doghandbook.backend.repository.NutritionStandardRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.NutritionService;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NutritionServiceImpl implements NutritionService {

    private static final String DEFAULT_HEALTH_CONDITION = "NORMAL";
    private static final String BREED_ALL_LABEL = "Tất cả giống";

    private final NutritionStandardRepository nutritionStandardRepository;
    private final DogBreedRepository dogBreedRepository;
    private final UserRepository userRepository;

    @Override
    public PageResponse<NutritionStandardResponse> getAll(int page, int size, String search) {
        if (page < 0) {
            throw new IllegalArgumentException("page must be greater than or equal to 0");
        }
        if (size <= 0) {
            throw new IllegalArgumentException("size must be greater than 0");
        }

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<NutritionStandard> entityPage;

        if (search == null || search.isBlank()) {
            entityPage = nutritionStandardRepository.findByIsDeletedFalse(pageable);
        } else {
            entityPage = nutritionStandardRepository
                    .findByRationNameContainingIgnoreCaseAndIsDeletedFalse(search.trim(), pageable);
        }

        return toPageResponse(entityPage);
    }

    @Override
    public NutritionStandardResponse getById(Integer id) {
        NutritionStandard entity = getActiveEntityById(id);
        return toResponse(entity);
    }

    @Override
    public List<NutritionStandardResponse> getByBreedId(Integer breedId) {
        if (breedId == null || breedId <= 0) {
            throw new IllegalArgumentException("breedId must be greater than 0");
        }

        return nutritionStandardRepository.findByBreedBreedIdAndIsDeletedFalse(breedId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public NutritionStandardResponse create(NutritionStandardRequest request, Integer createdByUserId) {
        String rationCode = normalizeRequired(request.getRationCode(), "rationCode");
        if (nutritionStandardRepository.existsByRationCodeAndIsDeletedFalse(rationCode)) {
            throw new ConflictException("rationCode already exists: " + rationCode);
        }

        User createdBy = getUserById(createdByUserId);
        DogBreed breed = getBreedIfPresent(request.getBreedId());

        NutritionStandard entity = new NutritionStandard();
        applyRequest(entity, request, breed);
        entity.setCreatedBy(createdBy);
        entity.setStatusEnum(ContentStatus.DRAFT);
        entity.setIsDeleted(false);
        entity.setDeletedAt(null);

        return toResponse(nutritionStandardRepository.save(entity));
    }

    @Override
    @Transactional
    public NutritionStandardResponse update(Integer id, NutritionStandardRequest request) {
        NutritionStandard entity = getActiveEntityById(id);

        if (entity.getStatusEnum() == ContentStatus.PUBLISHED) {
            throw new BadRequestException("Nội dung đã xuất bản phải gỡ xuất bản trước khi sửa");
        }

        String newCode = normalizeRequired(request.getRationCode(), "rationCode");
        String currentCode = entity.getRationCode();

        if (currentCode == null || !currentCode.equalsIgnoreCase(newCode)) {
            if (nutritionStandardRepository.existsByRationCodeAndIsDeletedFalse(newCode)) {
                throw new ConflictException("rationCode already exists: " + newCode);
            }
        }

        DogBreed breed = getBreedIfPresent(request.getBreedId());
        applyRequest(entity, request, breed);

        if (entity.getStatusEnum() == ContentStatus.REJECTED) {
            entity.setStatusEnum(ContentStatus.DRAFT);
        }

        return toResponse(nutritionStandardRepository.save(entity));
    }

    @Override
    @Transactional
    public void delete(Integer id) {
        NutritionStandard entity = getActiveEntityById(id);
        if (entity.getStatusEnum() == ContentStatus.PUBLISHED) {
            throw new BadRequestException("Nội dung đã xuất bản phải gỡ xuất bản trước khi xóa");
        }
        entity.setIsDeleted(true);
        entity.setDeletedAt(LocalDateTime.now());
        nutritionStandardRepository.save(entity);
    }

    private NutritionStandard getActiveEntityById(Integer id) {
        if (id == null || id <= 0) {
            throw new IllegalArgumentException("id must be greater than 0");
        }

        NutritionStandard entity = nutritionStandardRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Nutrition standard not found: " + id));

        if (Boolean.TRUE.equals(entity.getIsDeleted())) {
            throw new ResourceNotFoundException("Nutrition standard not found: " + id);
        }
        return entity;
    }

    private User getUserById(Integer userId) {
        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("createdByUserId must be greater than 0");
        }

        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
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

    private void applyRequest(NutritionStandard entity, NutritionStandardRequest request, DogBreed breed) {
        entity.setRationCode(normalizeRequired(request.getRationCode(), "rationCode"));
        entity.setRationName(normalizeRequired(request.getRationName(), "rationName"));
        entity.setDescription(trimToNull(request.getDescription()));
        entity.setDogBreed(breed);
        entity.setTargetAgeMinMonths(request.getTargetAgeMinMonths());
        entity.setTargetAgeMaxMonths(request.getTargetAgeMaxMonths());
        entity.setActivityLevel(normalizeRequired(request.getActivityLevel(), "activityLevel"));

        String healthCondition = trimToNull(request.getHealthCondition());
        entity.setHealthCondition(healthCondition == null ? DEFAULT_HEALTH_CONDITION : healthCondition.toUpperCase());

        entity.setMetadata(trimToNull(request.getMetadata()));
        entity.setSpecialNotes(trimToNull(request.getSpecialNotes()));
    }

    private PageResponse<NutritionStandardResponse> toPageResponse(Page<NutritionStandard> entityPage) {
        Page<NutritionStandardResponse> dtoPage = entityPage.map(this::toResponse);
        return PageResponse.<NutritionStandardResponse>builder()
                .content(dtoPage.getContent())
                .page(dtoPage.getNumber())
                .size(dtoPage.getSize())
                .totalElements(dtoPage.getTotalElements())
                .totalPages(dtoPage.getTotalPages())
                .build();
    }

    private NutritionStandardResponse toResponse(NutritionStandard entity) {
        DogBreed breed = entity.getDogBreed();
        User createdBy = entity.getCreatedBy();

        return NutritionStandardResponse.builder()
                .standardId(entity.getStandardId())
                .rationCode(entity.getRationCode())
                .rationName(entity.getRationName())
                .description(entity.getDescription())
                .breedId(breed != null ? breed.getBreedId() : null)
                .breedName(breed != null ? breed.getBreedName() : BREED_ALL_LABEL)
                .targetAgeMinMonths(entity.getTargetAgeMinMonths())
                .targetAgeMaxMonths(entity.getTargetAgeMaxMonths())
                .activityLevel(entity.getActivityLevel())
                .healthCondition(entity.getHealthCondition())
                .metadata(entity.getMetadata())
                .specialNotes(entity.getSpecialNotes())
                .status(entity.getStatus())
                .createdByName(resolveUserFullName(createdBy))
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
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
