package vn.edu.fpt.doghandbook.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.fpt.doghandbook.backend.dto.request.RationCalculatorRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.NutritionPlanResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.RationCalculatorResponse;
import vn.edu.fpt.doghandbook.backend.entity.*;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.FoodItemRepository;
import vn.edu.fpt.doghandbook.backend.repository.FoodRationRepository;
import vn.edu.fpt.doghandbook.backend.repository.NutritionPlanRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NutritionService {

    private final NutritionPlanRepository nutritionPlanRepository;
    private final FoodItemRepository foodItemRepository;
    private final FoodRationRepository foodRationRepository;

    /**
     * Lấy tất cả kế hoạch dinh dưỡng đã duyệt (cho Trainer)
     */
    public List<NutritionPlanResponse> getAllApprovedPlans() {
        return nutritionPlanRepository.findByStatus(ContentStatus.APPROVED)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Lấy chi tiết kế hoạch theo ID
     */
    public NutritionPlanResponse getPlanById(Long id) {
        NutritionPlan plan = nutritionPlanRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Nutrition plan not found with id: " + id));
        return toResponse(plan);
    }

    /**
     * Tìm kiếm kế hoạch theo tên
     */
    public List<NutritionPlanResponse> searchByName(String keyword) {
        return nutritionPlanRepository.findByNameContainingIgnoreCaseAndStatus(keyword, ContentStatus.APPROVED)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Lọc kế hoạch theo tiêu chí
     */
    public List<NutritionPlanResponse> filterPlans(DogCategory dogCategory, ActivityLevel activityLevel) {
        return nutritionPlanRepository.findByFilters(ContentStatus.APPROVED, dogCategory, activityLevel)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Tính khẩu phần ăn theo thông tin chó
     * Công thức cơ bản: Calories = RER * Activity Factor
     * RER (Resting Energy Requirement) = 70 * (weight in kg)^0.75
     */
    public RationCalculatorResponse calculateRation(RationCalculatorRequest request) {
        // Tính RER (Resting Energy Requirement)
        double rer = 70 * Math.pow(request.getWeight(), 0.75);
        
        // Activity factor theo mức độ hoạt động
        double activityFactor = getActivityFactor(request.getActivityLevel());
        
        // Tổng calories cần thiết/ngày
        double dailyCalories = rer * activityFactor;
        
        // Điều chỉnh theo tuổi
        dailyCalories = adjustForAge(dailyCalories, request.getAgeMonths());
        
        // Tìm kế hoạch phù hợp
        List<NutritionPlan> suitablePlans = nutritionPlanRepository.findSuitablePlans(
                request.getWeight(), request.getAgeMonths());
        
        return RationCalculatorResponse.builder()
                .dailyCalories((int) Math.round(dailyCalories))
                .recommendedMealsPerDay(getRecommendedMeals(request.getAgeMonths()))
                .caloriesPerMeal((int) Math.round(dailyCalories / getRecommendedMeals(request.getAgeMonths())))
                .proteinGrams(calculateProtein(dailyCalories, request.getActivityLevel()))
                .fatGrams(calculateFat(dailyCalories))
                .carbGrams(calculateCarbs(dailyCalories))
                .suitablePlans(suitablePlans.stream().map(this::toResponse).collect(Collectors.toList()))
                .notes(generateNotes(request))
                .build();
    }

    private double getActivityFactor(ActivityLevel level) {
        return switch (level) {
            case LOW -> 1.2;
            case MEDIUM -> 1.4;
            case HIGH -> 1.6;
            case INTENSIVE -> 2.0;
        };
    }

    private double adjustForAge(double calories, int ageMonths) {
        if (ageMonths < 4) {
            return calories * 3.0; // Chó con cần nhiều năng lượng
        } else if (ageMonths < 12) {
            return calories * 2.0;
        } else if (ageMonths > 84) { // > 7 năm
            return calories * 0.8; // Chó già cần ít hơn
        }
        return calories;
    }

    private int getRecommendedMeals(int ageMonths) {
        if (ageMonths < 4) return 4;
        if (ageMonths < 12) return 3;
        return 2;
    }

    private int calculateProtein(double dailyCalories, ActivityLevel level) {
        // Protein: 25-35% calories, 4 cal/gram
        double proteinPercent = level == ActivityLevel.INTENSIVE ? 0.35 : 0.25;
        return (int) Math.round((dailyCalories * proteinPercent) / 4);
    }

    private int calculateFat(double dailyCalories) {
        // Fat: 15-20% calories, 9 cal/gram
        return (int) Math.round((dailyCalories * 0.15) / 9);
    }

    private int calculateCarbs(double dailyCalories) {
        // Carbs: phần còn lại, 4 cal/gram
        return (int) Math.round((dailyCalories * 0.50) / 4);
    }

    private String generateNotes(RationCalculatorRequest request) {
        StringBuilder notes = new StringBuilder();
        if (request.getAgeMonths() < 12) {
            notes.append("Chó con cần chia nhỏ bữa ăn và bổ sung canxi. ");
        }
        if (request.getActivityLevel() == ActivityLevel.INTENSIVE) {
            notes.append("Chó huấn luyện cường độ cao cần bổ sung protein và nước. ");
        }
        return notes.toString().trim();
    }

    private NutritionPlanResponse toResponse(NutritionPlan plan) {
        return NutritionPlanResponse.builder()
                .id(plan.getId())
                .name(plan.getName())
                .description(plan.getDescription())
                .dogCategory(plan.getDogCategory())
                .minWeight(plan.getMinWeight())
                .maxWeight(plan.getMaxWeight())
                .minAgeMonths(plan.getMinAgeMonths())
                .maxAgeMonths(plan.getMaxAgeMonths())
                .activityLevel(plan.getActivityLevel())
                .dailyCalories(plan.getDailyCalories())
                .mealsPerDay(plan.getMealsPerDay())
                .specialNotes(plan.getSpecialNotes())
                .createdAt(plan.getCreatedAt())
                .build();
    }
}
