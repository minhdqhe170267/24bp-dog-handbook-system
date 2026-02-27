package vn.edu.fpt.doghandbook.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.fpt.doghandbook.backend.dto.request.NutritionCalculateRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.NutritionRationUpsertRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.NutritionStandardRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.NutritionCalculateResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.NutritionRationResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.NutritionStandardResponse;
import vn.edu.fpt.doghandbook.backend.entity.DogBreed;
import vn.edu.fpt.doghandbook.backend.entity.NutritionStandard;
import vn.edu.fpt.doghandbook.backend.exception.ConflictException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.DogBreedRepository;
import vn.edu.fpt.doghandbook.backend.repository.NutritionStandardRepository;
import vn.edu.fpt.doghandbook.backend.service.NutritionService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NutritionServiceImpl implements NutritionService {

    private static final Set<String> STANDARD_STATUSES = Set.of("DRAFT", "PENDING", "APPROVED", "PUBLISHED", "REJECTED");
    private static final Set<String> PUBLIC_STATUSES = Set.of("APPROVED", "PUBLISHED");
    private static final Set<String> ACTIVITY_LEVELS = Set.of("LOW", "MEDIUM", "HIGH", "VERY_HIGH");
    private static final Set<String> HEALTH_CONDITIONS = Set.of("NORMAL", "RECOVERY", "SPECIAL");
    private static final Set<String> GENDERS = Set.of("MALE", "FEMALE");

    private static final String DEFAULT_STANDARD_STATUS = "DRAFT";
    private static final String DEFAULT_HEALTH_CONDITION = "NORMAL";
    private static final String DEFAULT_ACTIVITY_LEVEL = "MEDIUM";

    private static final Map<String, Double> ACTIVITY_MULTIPLIERS = Map.of(
            "LOW", 0.90,
            "MEDIUM", 1.00,
            "HIGH", 1.23,
            "VERY_HIGH", 1.40
    );

    private static final Map<String, Double> HEALTH_MULTIPLIERS = Map.of(
            "NORMAL", 1.00,
            "RECOVERY", 1.08,
            "SPECIAL", 1.05
    );

    private final NutritionStandardRepository nutritionStandardRepository;
    private final DogBreedRepository dogBreedRepository;

    @Override
    public List<NutritionRationResponse> getRationsByBreed(Long breedId) {
        validatePositiveId("breedId", breedId);
        return List.of();
    }

    @Override
    public List<NutritionRationResponse> getRationsByStandard(Long standardId) {
        validatePositiveId("standardId", standardId);
        return List.of();
    }

    @Override
    public List<NutritionStandardResponse> getNutritionStandards(
            String keyword,
            String activityLevel,
            Double weightKg,
            Integer ageMonths) {

        if (weightKg != null && weightKg <= 0) {
            throw new IllegalArgumentException("weightKg must be greater than 0");
        }
        if (ageMonths != null && ageMonths < 0) {
            throw new IllegalArgumentException("ageMonths must be 0 or greater");
        }

        String normalizedKeyword = normalizeKeyword(keyword);
        String normalizedActivity = normalizeOptionalEnum(activityLevel, ACTIVITY_LEVELS, "activityLevel");

        return nutritionStandardRepository.findAll()
                .stream()
                .filter(standard -> {
                    String standardStatus = standard.getStatus();
                    if (standardStatus == null
                            || (!"APPROVED".equalsIgnoreCase(standardStatus) && !"PUBLISHED".equalsIgnoreCase(standardStatus))) {
                        return false;
                    }

                    if (normalizedKeyword != null) {
                        boolean keywordMatches = containsIgnoreCase(standard.getRationCode(), normalizedKeyword)
                                || containsIgnoreCase(standard.getRationName(), normalizedKeyword);
                        if (!keywordMatches) {
                            return false;
                        }
                    }

                    if (normalizedActivity != null) {
                        String standardActivity = standard.getActivityLevel();
                        if (standardActivity == null || !normalizedActivity.equalsIgnoreCase(standardActivity)) {
                            return false;
                        }
                    }

                    if (weightKg != null) {
                        Double minWeight = standard.getTargetWeightMinKg();
                        Double maxWeight = standard.getTargetWeightMaxKg();
                        if ((minWeight != null && minWeight > weightKg) || (maxWeight != null && maxWeight < weightKg)) {
                            return false;
                        }
                    }

                    if (ageMonths != null) {
                        Integer minAge = standard.getTargetAgeMinMonths();
                        Integer maxAge = standard.getTargetAgeMaxMonths();
                        if ((minAge != null && minAge > ageMonths) || (maxAge != null && maxAge < ageMonths)) {
                            return false;
                        }
                    }

                    return true;
                })
                .map(this::toStandardResponse)
                .toList();
    }

    @Override
    public NutritionStandardResponse getNutritionStandard(Long standardId) {
        validatePositiveId("standardId", standardId);

        NutritionStandard standard = nutritionStandardRepository.findById(toIntegerId(standardId, "standardId"))
                .filter(item -> {
                    String status = item.getStatus();
                    return status != null
                            && ("APPROVED".equalsIgnoreCase(status) || "PUBLISHED".equalsIgnoreCase(status));
                })
                .orElseThrow(() -> new ResourceNotFoundException("Nutrition standard not found: " + standardId));

        return toStandardResponse(standard);
    }

    @Override
    public List<NutritionRationResponse> getNutritionStandardRations(Long standardId) {
        getNutritionStandard(standardId);
        return List.of();
    }

    @Override
    public List<NutritionStandardResponse> getCmsNutritionStandards(String keyword, String activityLevel, String status) {
        String normalizedKeyword = normalizeKeyword(keyword);
        String normalizedActivity = normalizeOptionalEnum(activityLevel, ACTIVITY_LEVELS, "activityLevel");
        String normalizedStatus = normalizeOptionalEnum(status, STANDARD_STATUSES, "status");

        return nutritionStandardRepository.findAll()
                .stream()
                .filter(standard -> {
                    if (normalizedKeyword != null) {
                        boolean keywordMatches = containsIgnoreCase(standard.getRationCode(), normalizedKeyword)
                                || containsIgnoreCase(standard.getRationName(), normalizedKeyword);
                        if (!keywordMatches) {
                            return false;
                        }
                    }

                    if (normalizedActivity != null) {
                        String standardActivity = standard.getActivityLevel();
                        if (standardActivity == null || !normalizedActivity.equalsIgnoreCase(standardActivity)) {
                            return false;
                        }
                    }

                    if (normalizedStatus != null) {
                        String standardStatus = standard.getStatus();
                        if (standardStatus == null || !normalizedStatus.equalsIgnoreCase(standardStatus)) {
                            return false;
                        }
                    }
                    return true;
                })
                .map(this::toStandardResponse)
                .toList();
    }

    @Override
    @Transactional
    public NutritionStandardResponse createNutritionStandard(NutritionStandardRequest request) {
        validateStandardRequest(request);

        String normalizedCode = normalizeCode(request.getRationCode());
        boolean codeExists = nutritionStandardRepository.findAll()
                .stream()
                .anyMatch(item -> item.getRationCode() != null && item.getRationCode().equalsIgnoreCase(normalizedCode));
        if (codeExists) {
            throw new ConflictException("rationCode already exists: " + normalizedCode);
        }

        DogBreed breed = request.getBreedId() == null ? null : getBreedEntity(request.getBreedId());

        NutritionStandard standard = new NutritionStandard();
        applyStandardFields(standard, request, breed);
        standard.setIsDeleted(false);

        NutritionStandard saved = nutritionStandardRepository.save(standard);
        return toStandardResponse(saved);
    }

    @Override
    @Transactional
    public NutritionStandardResponse updateNutritionStandard(Long standardId, NutritionStandardRequest request) {
        validatePositiveId("standardId", standardId);
        validateStandardRequest(request);

        String normalizedCode = normalizeCode(request.getRationCode());
        boolean codeExists = nutritionStandardRepository.findAll()
                .stream()
                .anyMatch(item -> item.getRationCode() != null
                        && item.getRationCode().equalsIgnoreCase(normalizedCode)
                        && !standardId.equals(item.getId()));
        if (codeExists) {
            throw new ConflictException("rationCode already exists: " + normalizedCode);
        }

        NutritionStandard standard = getCmsStandardEntity(standardId);
        DogBreed breed = request.getBreedId() == null ? null : getBreedEntity(request.getBreedId());

        applyStandardFields(standard, request, breed);
        NutritionStandard saved = nutritionStandardRepository.save(standard);
        return toStandardResponse(saved);
    }

    @Override
    @Transactional
    public void deleteNutritionStandard(Long standardId) {
        validatePositiveId("standardId", standardId);
        NutritionStandard standard = getCmsStandardEntity(standardId);
        standard.setIsDeleted(true);
        nutritionStandardRepository.save(standard);
    }

    @Override
    public List<NutritionRationResponse> getCmsNutritionRations(Long standardId) {
        validatePositiveId("standardId", standardId);
        getCmsStandardEntity(standardId);
        return List.of();
    }

    @Override
    @Transactional
    public NutritionRationResponse createNutritionRation(NutritionRationUpsertRequest request) {
        throw new UnsupportedOperationException("nutrition_ration table is removed from schema v3");
    }

    @Override
    @Transactional
    public NutritionRationResponse updateNutritionRation(Long rationId, NutritionRationUpsertRequest request) {
        throw new UnsupportedOperationException("nutrition_ration table is removed from schema v3");
    }

    @Override
    @Transactional
    public void deleteNutritionRation(Long rationId) {
        throw new UnsupportedOperationException("nutrition_ration table is removed from schema v3");
    }

    @Override
    public NutritionCalculateResponse calculateNutrition(NutritionCalculateRequest request) {
        if (request.getBreedId() == null || request.getBreedId() <= 0) {
            throw new IllegalArgumentException("breedId must be greater than 0");
        }

        DogBreed breed = getBreedEntity(request.getBreedId());
        String activityLevel = normalizeRequiredEnum(request.getActivityLevel(), ACTIVITY_LEVELS, "activityLevel");
        String healthCondition = normalizeOptionalEnum(request.getHealthCondition(), HEALTH_CONDITIONS, "healthCondition");
        if (healthCondition == null) {
            healthCondition = DEFAULT_HEALTH_CONDITION;
        }
        String gender = normalizeRequiredEnum(request.getGender(), GENDERS, "gender");

        double weight = request.getWeightKg().doubleValue();
        double rer = 70.0 * Math.pow(weight, 0.75);
        double activityMultiplier = ACTIVITY_MULTIPLIERS.getOrDefault(activityLevel, 1.0);
        double healthMultiplier = HEALTH_MULTIPLIERS.getOrDefault(healthCondition, 1.0);
        double dailyCalories = rer * activityMultiplier * healthMultiplier;

        BigDecimal calories = roundTo2(dailyCalories);
        BigDecimal proteinG = roundTo2((dailyCalories * 0.30) / 4.0);
        BigDecimal fatG = roundTo2((dailyCalories * 0.20) / 9.0);
        BigDecimal carbG = roundTo2((dailyCalories * 0.50) / 4.0);

        WeightAssessmentResult weightAssessment = assessWeightStatus(breed, gender, request.getWeightKg());
        NutritionStandard suggested = findSuggestedRation(
                request.getBreedId(),
                request.getAgeMonths(),
                activityLevel,
                healthCondition
        );

        NutritionCalculateResponse.SuggestedRation suggestedRation = suggested == null
                ? null
                : NutritionCalculateResponse.SuggestedRation.builder()
                .standardId(suggested.getStandardId())
                .rationCode(suggested.getRationCode())
                .rationName(suggested.getRationName())
                .build();

        String formula = String.format(
                Locale.ROOT,
                "70 × %s^0.75 × %.2f × %.2f",
                request.getWeightKg().stripTrailingZeros().toPlainString(),
                activityMultiplier,
                healthMultiplier
        );

        return NutritionCalculateResponse.builder()
                .dailyCalories(calories)
                .proteinG(proteinG)
                .fatG(fatG)
                .carbG(carbG)
                .weightStatus(weightAssessment.weightStatus())
                .deviationPercent(weightAssessment.deviationPercent())
                .recommendation(buildRecommendation(weightAssessment.weightStatus()))
                .suggestedRation(suggestedRation)
                .formula(formula)
                .build();
    }

    private NutritionStandard getCmsStandardEntity(Long standardId) {
        return nutritionStandardRepository.findById(toIntegerId(standardId, "standardId"))
                .orElseThrow(() -> new ResourceNotFoundException("Nutrition standard not found: " + standardId));
    }

    private DogBreed getBreedEntity(Integer breedId) {
        if (breedId == null || breedId <= 0) {
            throw new IllegalArgumentException("breedId must be greater than 0");
        }
        return dogBreedRepository.findById(breedId)
                .orElseThrow(() -> new ResourceNotFoundException("Dog breed not found: " + breedId));
    }

    private void validateStandardRequest(NutritionStandardRequest request) {
        if (request.getTargetAgeMinMonths() != null
                && request.getTargetAgeMaxMonths() != null
                && request.getTargetAgeMinMonths() > request.getTargetAgeMaxMonths()) {
            throw new IllegalArgumentException("targetAgeMinMonths must be less than or equal to targetAgeMaxMonths");
        }

        normalizeRequiredEnum(request.getActivityLevel(), ACTIVITY_LEVELS, "activityLevel");
        normalizeOptionalEnum(request.getHealthCondition(), HEALTH_CONDITIONS, "healthCondition");
    }

    private void applyStandardFields(NutritionStandard standard, NutritionStandardRequest request, DogBreed breed) {
        standard.setDogBreed(breed);
        standard.setRationCode(normalizeCode(request.getRationCode()));
        standard.setRationName(cleanText(request.getRationName()));
        standard.setDescription(cleanTextOrNull(request.getDescription()));
        standard.setTargetAgeMinMonths(request.getTargetAgeMinMonths());
        standard.setTargetAgeMaxMonths(request.getTargetAgeMaxMonths());
        standard.setActivityLevel(normalizeRequiredEnum(request.getActivityLevel(), ACTIVITY_LEVELS, "activityLevel"));

        String healthCondition = normalizeOptionalEnum(request.getHealthCondition(), HEALTH_CONDITIONS, "healthCondition");
        standard.setHealthCondition(healthCondition == null ? DEFAULT_HEALTH_CONDITION : healthCondition);

        standard.setMetadata(cleanTextOrNull(request.getMetadata()));
        standard.setSpecialNotes(cleanTextOrNull(request.getSpecialNotes()));

        if (standard.getStatus() == null) {
            standard.setStatus(DEFAULT_STANDARD_STATUS);
        }
    }

    private void validatePositiveId(String fieldName, Long value) {
        if (value == null || value <= 0) {
            throw new IllegalArgumentException(fieldName + " must be greater than 0");
        }
    }

    private Integer toIntegerId(Long value, String fieldName) {
        validatePositiveId(fieldName, value);
        if (value > Integer.MAX_VALUE) {
            throw new IllegalArgumentException(fieldName + " exceeds Integer range");
        }
        return value.intValue();
    }

    private String normalizeKeyword(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String normalizeCode(String value) {
        String cleaned = cleanText(value);
        return cleaned.toUpperCase();
    }

    private String cleanText(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Text value must not be blank");
        }
        return value.trim();
    }

    private String cleanTextOrNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String normalizeOptionalEnum(String value, Set<String> allowedValues, String fieldName) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim().toUpperCase();
        if (!allowedValues.contains(normalized)) {
            throw new IllegalArgumentException(fieldName + " is invalid");
        }
        return normalized;
    }

    private String normalizeRequiredEnum(String value, Set<String> allowedValues, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + " is required");
        }
        return normalizeOptionalEnum(value, allowedValues, fieldName);
    }

    private boolean containsIgnoreCase(String source, String keyword) {
        if (source == null || keyword == null) {
            return false;
        }
        return source.toUpperCase().contains(keyword.toUpperCase());
    }

    private NutritionStandardResponse toStandardResponse(NutritionStandard standard) {
        if (standard == null) {
            return null;
        }

        DogBreed breed = standard.getDogBreed();
        String createdByName = standard.getCreatedBy() == null ? null : standard.getCreatedBy().getFullName();

        return NutritionStandardResponse.builder()
                .standardId(standard.getStandardId())
                .rationCode(standard.getRationCode())
                .rationName(standard.getRationName())
                .description(standard.getDescription())
                .breedId(breed != null ? breed.getBreedId() : null)
                .breedName(breed != null ? breed.getBreedName() : null)
                .targetAgeMinMonths(standard.getTargetAgeMinMonths())
                .targetAgeMaxMonths(standard.getTargetAgeMaxMonths())
                .activityLevel(standard.getActivityLevel())
                .healthCondition(standard.getHealthCondition())
                .metadata(standard.getMetadata())
                .specialNotes(standard.getSpecialNotes())
                .status(standard.getStatus())
                .createdByName(createdByName)
                .createdAt(standard.getCreatedAt())
                .updatedAt(standard.getUpdatedAt())
                .build();
    }

    private NutritionStandard findSuggestedRation(Integer breedId, Integer ageMonths, String activityLevel, String healthCondition) {
        return nutritionStandardRepository.findAll()
                .stream()
                .filter(standard -> standard.getStatus() != null && PUBLIC_STATUSES.contains(standard.getStatus().toUpperCase(Locale.ROOT)))
                .filter(standard -> {
                    DogBreed dogBreed = standard.getDogBreed();
                    return dogBreed == null || dogBreed.getBreedId().equals(breedId);
                })
                .filter(standard -> matchesOptionalAge(standard, ageMonths))
                .filter(standard -> activityLevel.equalsIgnoreCase(defaultIfBlank(standard.getActivityLevel(), DEFAULT_ACTIVITY_LEVEL)))
                .filter(standard -> healthCondition.equalsIgnoreCase(defaultIfBlank(standard.getHealthCondition(), DEFAULT_HEALTH_CONDITION)))
                .min(Comparator.comparingInt(standard -> standard.getStandardId() == null ? Integer.MAX_VALUE : standard.getStandardId()))
                .orElse(null);
    }

    private boolean matchesOptionalAge(NutritionStandard standard, Integer ageMonths) {
        Integer minAge = standard.getTargetAgeMinMonths();
        Integer maxAge = standard.getTargetAgeMaxMonths();
        if (ageMonths == null) {
            return true;
        }
        if (minAge != null && ageMonths < minAge) {
            return false;
        }
        return maxAge == null || ageMonths <= maxAge;
    }

    private WeightAssessmentResult assessWeightStatus(DogBreed breed, String gender, BigDecimal weightKg) {
        BigDecimal min = "MALE".equals(gender) ? breed.getWeightMaleMinKg() : breed.getWeightFemaleMinKg();
        BigDecimal max = "MALE".equals(gender) ? breed.getWeightMaleMaxKg() : breed.getWeightFemaleMaxKg();

        if (min != null && weightKg.compareTo(min) < 0) {
            BigDecimal deviation = min.subtract(weightKg)
                    .divide(min, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
            return new WeightAssessmentResult("UNDERWEIGHT", roundTo2(deviation));
        }

        if (max != null && weightKg.compareTo(max) > 0) {
            BigDecimal deviation = weightKg.subtract(max)
                    .divide(max, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
            return new WeightAssessmentResult("OVERWEIGHT", roundTo2(deviation));
        }

        return new WeightAssessmentResult("NORMAL", BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
    }

    private String buildRecommendation(String weightStatus) {
        if ("UNDERWEIGHT".equals(weightStatus)) {
            return "Tăng năng lượng khẩu phần và theo dõi cân nặng mỗi tuần.";
        }
        if ("OVERWEIGHT".equals(weightStatus)) {
            return "Giảm năng lượng khẩu phần, tăng vận động và tái đánh giá sau 2 tuần.";
        }
        return "Cân nặng trong chuẩn, duy trì khẩu phần hiện tại.";
    }

    private BigDecimal roundTo2(Double value) {
        if (value == null) {
            return null;
        }
        return roundTo2(BigDecimal.valueOf(value));
    }

    private BigDecimal roundTo2(BigDecimal value) {
        if (value == null) {
            return null;
        }
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private String defaultIfBlank(String value, String defaultValue) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        return value;
    }

    private record WeightAssessmentResult(String weightStatus, BigDecimal deviationPercent) {
    }
}
