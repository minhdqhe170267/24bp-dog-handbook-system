package vn.edu.fpt.doghandbook.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.fpt.doghandbook.backend.dto.request.NutritionCalculatorVerifyRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.NutritionRationUpsertRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.NutritionStandardUpsertRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.NutritionCalculatorVerifyResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.NutritionRationResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.NutritionStandardResponse;
import vn.edu.fpt.doghandbook.backend.entity.DogBreed;
import vn.edu.fpt.doghandbook.backend.entity.NutritionStandard;
import vn.edu.fpt.doghandbook.backend.exception.ConflictException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.DogBreedRepository;
import vn.edu.fpt.doghandbook.backend.repository.NutritionStandardRepository;
import vn.edu.fpt.doghandbook.backend.service.NutritionService;

import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NutritionServiceImpl implements NutritionService {

    private static final Set<String> STANDARD_STATUSES = Set.of("DRAFT", "PENDING", "APPROVED", "PUBLISHED", "REJECTED");
    private static final Set<String> ACTIVITY_LEVELS = Set.of("LOW", "MEDIUM", "HIGH", "VERY_HIGH");
    private static final Set<String> HEALTH_CONDITIONS = Set.of("NORMAL", "RECOVERY", "SPECIAL");

    private static final String DEFAULT_STANDARD_STATUS = "DRAFT";
    private static final String DEFAULT_HEALTH_CONDITION = "NORMAL";

    private static final Map<String, Double> ACTIVITY_MULTIPLIERS = Map.of(
            "LOW", 0.90,
            "MEDIUM", 1.00,
            "HIGH", 1.15,
            "VERY_HIGH", 1.30
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
    public NutritionStandardResponse createNutritionStandard(NutritionStandardUpsertRequest request) {
        validateStandardRequest(request);

        String normalizedCode = normalizeCode(request.getRationCode());
        boolean codeExists = nutritionStandardRepository.findAll()
                .stream()
                .anyMatch(item -> item.getRationCode() != null && item.getRationCode().equalsIgnoreCase(normalizedCode));
        if (codeExists) {
            throw new ConflictException("rationCode already exists: " + normalizedCode);
        }

        DogBreed breed = getBreedEntity(request.getBreedId());

        NutritionStandard standard = new NutritionStandard();
        applyStandardFields(standard, request, breed);
        standard.setIsDeleted(false);

        NutritionStandard saved = nutritionStandardRepository.save(standard);
        return toStandardResponse(saved);
    }

    @Override
    @Transactional
    public NutritionStandardResponse updateNutritionStandard(Long standardId, NutritionStandardUpsertRequest request) {
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
        DogBreed breed = getBreedEntity(request.getBreedId());

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
    public NutritionCalculatorVerifyResponse verifyNutritionCalculation(NutritionCalculatorVerifyRequest request) {
        validatePositiveId("standardId", request.getStandardId());

        NutritionStandard standard = getCmsStandardEntity(request.getStandardId());

        String activityLevel = normalizeOptionalEnum(request.getActivityLevel(), ACTIVITY_LEVELS, "activityLevel");
        if (activityLevel == null) {
            activityLevel = normalizeOptionalEnum(standard.getActivityLevel(), ACTIVITY_LEVELS, "activityLevel");
        }
        if (activityLevel == null) {
            activityLevel = "MEDIUM";
        }

        String healthCondition = normalizeOptionalEnum(request.getHealthCondition(), HEALTH_CONDITIONS, "healthCondition");
        if (healthCondition == null) {
            healthCondition = normalizeOptionalEnum(standard.getHealthCondition(), HEALTH_CONDITIONS, "healthCondition");
        }
        if (healthCondition == null) {
            healthCondition = DEFAULT_HEALTH_CONDITION;
        }

        int baseCalories = resolveRequiredInt(standard.getDailyCalories(), "dailyCalories is required");
        double baseProtein = resolveRequiredDouble(standard.getProteinGrams(), "proteinGrams is required");
        double baseFat = resolveRequiredDouble(standard.getFatGrams(), "fatGrams is required");
        double baseCarb = resolveRequiredDouble(standard.getCarbGrams(), "carbGrams is required");

        double activityMultiplier = ACTIVITY_MULTIPLIERS.getOrDefault(activityLevel, 1.0);
        double healthMultiplier = HEALTH_MULTIPLIERS.getOrDefault(healthCondition, 1.0);
        double adjustPercent = request.getKcalAdjustPercent() == null ? 0.0 : request.getKcalAdjustPercent();

        double finalFactor = activityMultiplier * healthMultiplier * (1 + adjustPercent / 100.0);
        int finalCalories = Math.max(1, (int) Math.round(baseCalories * finalFactor));
        double macroFactor = finalCalories / (double) baseCalories;

        return NutritionCalculatorVerifyResponse.builder()
                .standardId(standard.getId())
                .rationCode(standard.getRationCode())
                .rationName(standard.getRationName())
                .baseDailyCalories(baseCalories)
                .finalDailyCalories(finalCalories)
                .baseProteinGrams(roundTo2(baseProtein))
                .baseFatGrams(roundTo2(baseFat))
                .baseCarbGrams(roundTo2(baseCarb))
                .finalProteinGrams(roundTo2(baseProtein * macroFactor))
                .finalFatGrams(roundTo2(baseFat * macroFactor))
                .finalCarbGrams(roundTo2(baseCarb * macroFactor))
                .activityMultiplier(activityMultiplier)
                .healthMultiplier(healthMultiplier)
                .kcalAdjustPercent(roundTo2(adjustPercent))
                .feedingSchedule(standard.getFeedingSchedule())
                .build();
    }

    private NutritionStandard getCmsStandardEntity(Long standardId) {
        return nutritionStandardRepository.findById(toIntegerId(standardId, "standardId"))
                .orElseThrow(() -> new ResourceNotFoundException("Nutrition standard not found: " + standardId));
    }

    private DogBreed getBreedEntity(Long breedId) {
        return dogBreedRepository.findById(toIntegerId(breedId, "breedId"))
                .orElseThrow(() -> new ResourceNotFoundException("Dog breed not found: " + breedId));
    }

    private void validateStandardRequest(NutritionStandardUpsertRequest request) {
        if (request.getTargetWeightMinKg() > request.getTargetWeightMaxKg()) {
            throw new IllegalArgumentException("targetWeightMinKg must be less than or equal to targetWeightMaxKg");
        }
        if (request.getTargetAgeMinMonths() > request.getTargetAgeMaxMonths()) {
            throw new IllegalArgumentException("targetAgeMinMonths must be less than or equal to targetAgeMaxMonths");
        }

        normalizeRequiredEnum(request.getActivityLevel(), ACTIVITY_LEVELS, "activityLevel");
        normalizeOptionalEnum(request.getHealthCondition(), HEALTH_CONDITIONS, "healthCondition");
        normalizeOptionalEnum(request.getStatus(), STANDARD_STATUSES, "status");
    }

    private void applyStandardFields(NutritionStandard standard, NutritionStandardUpsertRequest request, DogBreed breed) {
        standard.setDogBreed(breed);
        standard.setRationCode(normalizeCode(request.getRationCode()));
        standard.setRationName(cleanText(request.getRationName()));
        standard.setDescription(cleanTextOrNull(request.getDescription()));
        standard.setTargetWeightMinKg(request.getTargetWeightMinKg());
        standard.setTargetWeightMaxKg(request.getTargetWeightMaxKg());
        standard.setTargetAgeMinMonths(request.getTargetAgeMinMonths());
        standard.setTargetAgeMaxMonths(request.getTargetAgeMaxMonths());
        standard.setActivityLevel(normalizeRequiredEnum(request.getActivityLevel(), ACTIVITY_LEVELS, "activityLevel"));

        String healthCondition = normalizeOptionalEnum(request.getHealthCondition(), HEALTH_CONDITIONS, "healthCondition");
        standard.setHealthCondition(healthCondition == null ? DEFAULT_HEALTH_CONDITION : healthCondition);

        standard.setDailyCalories(request.getDailyCalories());
        standard.setProteinGrams(request.getProteinGrams());
        standard.setFatGrams(request.getFatGrams());
        standard.setCarbGrams(request.getCarbGrams());
        standard.setIngredientsList(cleanTextOrNull(request.getIngredientsList()));
        standard.setFeedingSchedule(cleanTextOrNull(request.getFeedingSchedule()));
        standard.setSpecialNotes(cleanTextOrNull(request.getSpecialNotes()));

        String status = normalizeOptionalEnum(request.getStatus(), STANDARD_STATUSES, "status");
        standard.setStatus(status == null ? DEFAULT_STANDARD_STATUS : status);
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

    private int resolveRequiredInt(Integer value, String message) {
        if (value == null || value <= 0) {
            throw new IllegalArgumentException(message);
        }
        return value;
    }

    private double resolveRequiredDouble(Double value, String message) {
        if (value == null || value < 0) {
            throw new IllegalArgumentException(message);
        }
        return value;
    }

    private NutritionStandardResponse toStandardResponse(NutritionStandard standard) {
        if (standard == null) {
            return null;
        }

        DogBreed breed = standard.getDogBreed();

        return NutritionStandardResponse.builder()
                .standardId(standard.getId())
                .breedId(breed != null ? breed.getId() : null)
                .breedName(breed != null ? breed.getBreedName() : null)
                .rationCode(standard.getRationCode())
                .rationName(standard.getRationName())
                .description(standard.getDescription())
                .targetWeightMinKg(standard.getTargetWeightMinKg())
                .targetWeightMaxKg(standard.getTargetWeightMaxKg())
                .targetAgeMinMonths(standard.getTargetAgeMinMonths())
                .targetAgeMaxMonths(standard.getTargetAgeMaxMonths())
                .activityLevel(standard.getActivityLevel())
                .healthCondition(standard.getHealthCondition())
                .dailyCalories(standard.getDailyCalories())
                .proteinGrams(standard.getProteinGrams())
                .fatGrams(standard.getFatGrams())
                .carbGrams(standard.getCarbGrams())
                .ingredientsList(standard.getIngredientsList())
                .feedingSchedule(standard.getFeedingSchedule())
                .specialNotes(standard.getSpecialNotes())
                .status(standard.getStatus())
                .build();
    }

    private Double roundTo2(Double value) {
        if (value == null) {
            return null;
        }
        return Math.round(value * 100.0) / 100.0;
    }
}
