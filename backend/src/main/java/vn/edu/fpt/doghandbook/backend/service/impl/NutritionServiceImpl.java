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
import vn.edu.fpt.doghandbook.backend.entity.NutritionRation;
import vn.edu.fpt.doghandbook.backend.entity.NutritionStandard;
import vn.edu.fpt.doghandbook.backend.exception.ConflictException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.DogBreedRepository;
import vn.edu.fpt.doghandbook.backend.repository.NutritionRationRepository;
import vn.edu.fpt.doghandbook.backend.repository.NutritionStandardRepository;
import vn.edu.fpt.doghandbook.backend.service.NutritionService;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Nutrition service implementation.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NutritionServiceImpl implements NutritionService {

    private static final Set<String> STANDARD_STATUSES = Set.of("DRAFT", "PENDING", "APPROVED", "PUBLISHED", "REJECTED");
    private static final Set<String> ACTIVITY_LEVELS = Set.of("LOW", "MEDIUM", "HIGH", "VERY_HIGH");
    private static final Set<String> HEALTH_CONDITIONS = Set.of("NORMAL", "RECOVERY", "SPECIAL");
    private static final Set<String> FOOD_CATEGORIES = Set.of("PROTEIN", "CARBOHYDRATE", "FAT", "VITAMIN", "MINERAL", "WATER", "SUPPLEMENT", "OTHER");
    private static final Set<String> MEAL_TIMES = Set.of("BREAKFAST", "LUNCH", "DINNER", "SNACK", "ANY");

    private static final String DEFAULT_STANDARD_STATUS = "DRAFT";
    private static final String DEFAULT_RATION_STATUS = "DRAFT";
    private static final String DEFAULT_HEALTH_CONDITION = "NORMAL";
    private static final String DEFAULT_FOOD_CATEGORY = "OTHER";
    private static final String DEFAULT_MEAL_TIME = "ANY";

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

    private final NutritionRationRepository nutritionRationRepository;
    private final NutritionStandardRepository nutritionStandardRepository;
    private final DogBreedRepository dogBreedRepository;

    @Override
    public List<NutritionRationResponse> getRationsByBreed(Long breedId) {
        validatePositiveId("breedId", breedId);

        return nutritionRationRepository.findByBreedId(breedId)
                .stream()
                .map(this::toRationResponse)
                .toList();
    }

    @Override
    public List<NutritionRationResponse> getRationsByStandard(Long standardId) {
        validatePositiveId("standardId", standardId);

        return nutritionRationRepository.findTrainerByStandardId(standardId)
                .stream()
                .map(this::toRationResponse)
                .toList();
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

        String normalizedActivity = normalizeOptionalEnum(activityLevel, ACTIVITY_LEVELS, "activityLevel");

        return nutritionStandardRepository.findTrainerStandards(
                        normalizeKeyword(keyword),
                        normalizedActivity,
                        weightKg,
                        ageMonths)
                .stream()
                .map(this::toStandardResponse)
                .toList();
    }

    @Override
    public NutritionStandardResponse getNutritionStandard(Long standardId) {
        validatePositiveId("standardId", standardId);

        NutritionStandard standard = nutritionStandardRepository.findTrainerStandardById(standardId)
                .orElseThrow(() -> new ResourceNotFoundException("Nutrition standard not found: " + standardId));

        return toStandardResponse(standard);
    }

    @Override
    public List<NutritionRationResponse> getNutritionStandardRations(Long standardId) {
        getNutritionStandard(standardId);
        return getRationsByStandard(standardId);
    }

    @Override
    public List<NutritionStandardResponse> getCmsNutritionStandards(String keyword, String activityLevel, String status) {
        String normalizedActivity = normalizeOptionalEnum(activityLevel, ACTIVITY_LEVELS, "activityLevel");
        String normalizedStatus = normalizeOptionalEnum(status, STANDARD_STATUSES, "status");

        return nutritionStandardRepository.findCmsStandards(normalizeKeyword(keyword), normalizedActivity, normalizedStatus)
                .stream()
                .map(this::toStandardResponse)
                .toList();
    }

    @Override
    @Transactional
    public NutritionStandardResponse createNutritionStandard(NutritionStandardUpsertRequest request) {
        validateStandardRequest(request);

        String normalizedCode = normalizeCode(request.getRationCode());
        if (nutritionStandardRepository.existsByRationCodeIgnoreCaseAndIsDeletedFalse(normalizedCode)) {
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
        if (nutritionStandardRepository.existsByRationCodeIgnoreCaseAndIsDeletedFalseAndIdNot(normalizedCode, standardId)) {
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

        List<NutritionRation> rationItems = nutritionRationRepository.findActiveByStandardId(standardId);
        if (!rationItems.isEmpty()) {
            rationItems.forEach(item -> item.setIsDeleted(true));
            nutritionRationRepository.saveAll(rationItems);
        }
    }

    @Override
    public List<NutritionRationResponse> getCmsNutritionRations(Long standardId) {
        validatePositiveId("standardId", standardId);
        getCmsStandardEntity(standardId);

        return nutritionRationRepository.findCmsByStandardId(standardId)
                .stream()
                .map(this::toRationResponse)
                .toList();
    }

    @Override
    @Transactional
    public NutritionRationResponse createNutritionRation(NutritionRationUpsertRequest request) {
        validateRationRequest(request);

        NutritionStandard standard = getCmsStandardEntity(request.getStandardId());

        NutritionRation ration = new NutritionRation();
        ration.setNutritionStandard(standard);
        ration.setIsDeleted(false);
        applyRationFields(ration, request);

        NutritionRation saved = nutritionRationRepository.save(ration);
        return toRationResponse(saved);
    }

    @Override
    @Transactional
    public NutritionRationResponse updateNutritionRation(Long rationId, NutritionRationUpsertRequest request) {
        validatePositiveId("rationId", rationId);
        validateRationRequest(request);

        NutritionRation ration = nutritionRationRepository.findActiveById(rationId)
                .orElseThrow(() -> new ResourceNotFoundException("Nutrition ration not found: " + rationId));

        NutritionStandard standard = getCmsStandardEntity(request.getStandardId());
        ration.setNutritionStandard(standard);
        applyRationFields(ration, request);

        NutritionRation saved = nutritionRationRepository.save(ration);
        return toRationResponse(saved);
    }

    @Override
    @Transactional
    public void deleteNutritionRation(Long rationId) {
        validatePositiveId("rationId", rationId);

        NutritionRation ration = nutritionRationRepository.findActiveById(rationId)
                .orElseThrow(() -> new ResourceNotFoundException("Nutrition ration not found: " + rationId));

        ration.setIsDeleted(true);
        nutritionRationRepository.save(ration);
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

        int baseCalories = resolveBaseCalories(standard.getId(), standard.getDailyCalories());
        double baseProtein = resolveBaseMacro(standard.getId(), standard.getProteinGrams(), MacroField.PROTEIN);
        double baseFat = resolveBaseMacro(standard.getId(), standard.getFatGrams(), MacroField.FAT);
        double baseCarb = resolveBaseMacro(standard.getId(), standard.getCarbGrams(), MacroField.CARB);

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
        return nutritionStandardRepository.findCmsStandardById(standardId)
                .orElseThrow(() -> new ResourceNotFoundException("Nutrition standard not found: " + standardId));
    }

    private DogBreed getBreedEntity(Long breedId) {
        validatePositiveId("breedId", breedId);
        return dogBreedRepository.findByIdAndIsDeletedFalse(breedId)
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

    private void validateRationRequest(NutritionRationUpsertRequest request) {
        normalizeOptionalEnum(request.getFoodCategory(), FOOD_CATEGORIES, "foodCategory");
        normalizeRequiredEnum(request.getMealTime(), MEAL_TIMES, "mealTime");
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

    private void applyRationFields(NutritionRation ration, NutritionRationUpsertRequest request) {
        ration.setFoodItemName(cleanText(request.getFoodItemName()));

        String category = normalizeOptionalEnum(request.getFoodCategory(), FOOD_CATEGORIES, "foodCategory");
        ration.setFoodCategory(category == null ? DEFAULT_FOOD_CATEGORY : category);

        ration.setQuantityPerDay(request.getQuantityPerDay());
        ration.setUnit(cleanText(request.getUnit()));

        String mealTime = normalizeOptionalEnum(request.getMealTime(), MEAL_TIMES, "mealTime");
        ration.setMealTime(mealTime == null ? DEFAULT_MEAL_TIME : mealTime);

        ration.setCaloriesKcal(request.getCaloriesKcal());
        ration.setProteinGrams(request.getProteinGrams());
        ration.setFatGrams(request.getFatGrams());
        ration.setCarbGrams(request.getCarbGrams());
        ration.setPreparationNotes(cleanTextOrNull(request.getPreparationNotes()));
        ration.setFeedingInstructions(cleanTextOrNull(request.getFeedingInstructions()));
        ration.setDisplayOrder(request.getDisplayOrder());

        String status = normalizeOptionalEnum(request.getStatus(), STANDARD_STATUSES, "status");
        ration.setStatus(status == null ? DEFAULT_RATION_STATUS : status);
    }

    private int resolveBaseCalories(Long standardId, Integer standardDailyCalories) {
        if (standardDailyCalories != null && standardDailyCalories > 0) {
            return standardDailyCalories;
        }

        double totalCalories = nutritionRationRepository.findCmsByStandardId(standardId)
                .stream()
                .map(NutritionRation::getCaloriesKcal)
                .filter(value -> value != null && value > 0)
                .reduce(0.0, Double::sum);

        if (totalCalories <= 0) {
            throw new IllegalArgumentException("dailyCalories is missing and ration calories cannot be derived");
        }

        return (int) Math.round(totalCalories);
    }

    private double resolveBaseMacro(Long standardId, Double standardMacro, MacroField macroField) {
        if (standardMacro != null && standardMacro >= 0) {
            return standardMacro;
        }

        return nutritionRationRepository.findCmsByStandardId(standardId)
                .stream()
                .map(ration -> macroField.extract(ration))
                .filter(value -> value != null && value >= 0)
                .reduce(0.0, Double::sum);
    }

    private NutritionRationResponse toRationResponse(NutritionRation ration) {
        NutritionStandard standard = ration.getNutritionStandard();
        DogBreed breed = standard != null ? standard.getDogBreed() : null;

        return NutritionRationResponse.builder()
                .rationId(ration.getId())
                .standardId(standard != null ? standard.getId() : null)
                .breedId(breed != null ? breed.getId() : null)
                .breedName(breed != null ? breed.getBreedName() : null)
                .rationCode(standard != null ? standard.getRationCode() : null)
                .rationName(standard != null ? standard.getRationName() : null)
                .foodItemName(ration.getFoodItemName())
                .foodCategory(ration.getFoodCategory())
                .quantityPerDay(ration.getQuantityPerDay())
                .unit(ration.getUnit())
                .mealTime(ration.getMealTime())
                .caloriesKcal(ration.getCaloriesKcal())
                .proteinGrams(ration.getProteinGrams())
                .fatGrams(ration.getFatGrams())
                .carbGrams(ration.getCarbGrams())
                .preparationNotes(ration.getPreparationNotes())
                .feedingInstructions(ration.getFeedingInstructions())
                .displayOrder(ration.getDisplayOrder())
                .status(ration.getStatus())
                .standard(toStandardResponse(standard))
                .build();
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

    private void validatePositiveId(String fieldName, Long value) {
        if (value == null || value <= 0) {
            throw new IllegalArgumentException(fieldName + " must be greater than 0");
        }
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

    private Double roundTo2(Double value) {
        if (value == null) {
            return null;
        }
        return Math.round(value * 100.0) / 100.0;
    }

    private enum MacroField {
        PROTEIN {
            @Override
            Double extract(NutritionRation ration) {
                return ration.getProteinGrams();
            }
        },
        FAT {
            @Override
            Double extract(NutritionRation ration) {
                return ration.getFatGrams();
            }
        },
        CARB {
            @Override
            Double extract(NutritionRation ration) {
                return ration.getCarbGrams();
            }
        };

        abstract Double extract(NutritionRation ration);
    }
}
