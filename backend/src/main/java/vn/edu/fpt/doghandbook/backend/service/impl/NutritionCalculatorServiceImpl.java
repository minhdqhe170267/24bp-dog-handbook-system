package vn.edu.fpt.doghandbook.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import vn.edu.fpt.doghandbook.backend.dto.request.NutritionCalculateRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.NutritionCalculateResponse;
import vn.edu.fpt.doghandbook.backend.entity.DogBreed;
import vn.edu.fpt.doghandbook.backend.entity.NutritionStandard;
import vn.edu.fpt.doghandbook.backend.entity.enums.ActivityLevel;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.repository.DogBreedRepository;
import vn.edu.fpt.doghandbook.backend.repository.NutritionStandardRepository;
import vn.edu.fpt.doghandbook.backend.service.NutritionCalculatorService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class NutritionCalculatorServiceImpl implements NutritionCalculatorService {

    private final DogBreedRepository dogBreedRepository;
    private final NutritionStandardRepository nutritionStandardRepository;

    @Override
    public NutritionCalculateResponse calculate(NutritionCalculateRequest request) {
        DogBreed breed = dogBreedRepository.findByBreedIdAndIsDeletedFalse(request.getBreedId())
                .orElseThrow(() -> new BadRequestException("Giống chó không tồn tại"));

        BigDecimal standardMin;
        BigDecimal standardMax;
        String gender = request.getGender() == null ? null : request.getGender().trim().toUpperCase(Locale.ROOT);
        if ("MALE".equals(gender)) {
            standardMin = breed.getWeightMaleMinKg();
            standardMax = breed.getWeightMaleMaxKg();
        } else {
            standardMin = breed.getWeightFemaleMinKg();
            standardMax = breed.getWeightFemaleMaxKg();
        }

        if (standardMin == null || standardMax == null || standardMin.compareTo(BigDecimal.ZERO) <= 0
                || standardMax.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Không có dữ liệu cân nặng chuẩn cho giống chó này");
        }

        String weightStatus;
        BigDecimal deviation;
        BigDecimal weight = request.getWeightKg();
        BigDecimal standardMid = standardMin.add(standardMax).divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);

        if (weight.compareTo(standardMin) < 0) {
            weightStatus = "UNDERWEIGHT";
            deviation = weight.subtract(standardMin)
                    .divide(standardMin, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
        } else if (weight.compareTo(standardMax) > 0) {
            weightStatus = "OVERWEIGHT";
            deviation = weight.subtract(standardMax)
                    .divide(standardMax, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
        } else {
            weightStatus = "NORMAL";
            deviation = BigDecimal.ZERO;
        }

        double activityMultiplier;
        String activity = request.getActivityLevel() == null
                ? ""
                : request.getActivityLevel().trim().toUpperCase(Locale.ROOT);
        switch (activity) {
            case "LOW" -> activityMultiplier = 1.0;
            case "MEDIUM" -> activityMultiplier = 1.1;
            case "HIGH" -> activityMultiplier = 1.23;
            case "VERY_HIGH" -> activityMultiplier = 1.4;
            default -> throw new BadRequestException("Mức độ hoạt động không hợp lệ");
        }

        double ageFactor;
        Integer ageMonths = request.getAgeMonths();
        if (ageMonths <= 4) {
            ageFactor = 2.0;
        } else if (ageMonths <= 12) {
            ageFactor = 1.5;
        } else if (ageMonths <= 84) {
            ageFactor = 1.0;
        } else {
            ageFactor = 0.85;
        }

        double baseCalories = 70 * Math.pow(weight.doubleValue(), 0.75);
        double dailyCal = baseCalories * activityMultiplier * ageFactor;

        if ("UNDERWEIGHT".equals(weightStatus)) {
            dailyCal *= 1.15;
        } else if ("OVERWEIGHT".equals(weightStatus)) {
            dailyCal *= 0.85;
        }

        double proteinG = dailyCal * 0.30 / 4;
        double fatG = dailyCal * 0.20 / 9;
        double carbG = dailyCal * 0.50 / 4;

        StringBuilder recommendation = new StringBuilder();
        switch (weightStatus) {
            case "NORMAL" -> recommendation.append("Cân nặng trong khoảng chuẩn cho giống ")
                    .append(breed.getBreedName())
                    .append(". Duy trì khẩu phần hiện tại.");
            case "UNDERWEIGHT" -> recommendation.append("Cân nặng dưới chuẩn ")
                    .append(Math.abs(deviation.doubleValue()))
                    .append("%. Tăng khẩu phần 15%, bổ sung protein. Kiểm tra lại sau 2 tuần.");
            default -> recommendation.append("Cân nặng vượt chuẩn ")
                    .append(deviation.doubleValue())
                    .append("%. Giảm khẩu phần 15%, tăng bài tập cardio. Kiểm tra lại sau 2 tuần.");
        }

        if (ageMonths <= 12) {
            recommendation.append(" Chó con cần chia 3-4 bữa/ngày.");
        }
        if (ageMonths > 84) {
            recommendation.append(" Chó già nên chia 2-3 bữa nhỏ, thức ăn mềm.");
        }

        ActivityLevel level;
        try {
            level = ActivityLevel.valueOf(activity);
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Mức độ hoạt động không hợp lệ");
        }

        List<NutritionStandard> matched = nutritionStandardRepository
                .findMatchingStandards(request.getBreedId(), level, request.getAgeMonths());

        NutritionCalculateResponse.SuggestedRation suggestedRation = null;
        if (!matched.isEmpty()) {
            NutritionStandard best = matched.get(0);
            suggestedRation = NutritionCalculateResponse.SuggestedRation.builder()
                    .standardId(best.getStandardId())
                    .rationCode(best.getRationCode())
                    .rationName(best.getRationName())
                    .build();
        }

        String formula = String.format(
                Locale.ROOT,
                "70 × %.1f^0.75 × %.2f × %.2f = %.0f kcal",
                weight.doubleValue(),
                activityMultiplier,
                ageFactor,
                dailyCal
        );

        return NutritionCalculateResponse.builder()
                .dailyCalories(BigDecimal.valueOf(dailyCal).setScale(0, RoundingMode.HALF_UP))
                .proteinG(BigDecimal.valueOf(proteinG).setScale(1, RoundingMode.HALF_UP))
                .fatG(BigDecimal.valueOf(fatG).setScale(1, RoundingMode.HALF_UP))
                .carbG(BigDecimal.valueOf(carbG).setScale(1, RoundingMode.HALF_UP))
                .weightStatus(weightStatus)
                .deviationPercent(deviation.setScale(1, RoundingMode.HALF_UP))
                .recommendation(recommendation.toString())
                .suggestedRation(suggestedRation)
                .formula(formula)
                .build();
    }
}
