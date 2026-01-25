package vn.edu.fpt.doghandbook.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

/**
 * Kế hoạch dinh dưỡng theo tiêu chuẩn BQP (Bộ Quốc Phòng)
 */
@Entity
@Table(name = "nutrition_plans")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NutritionPlan extends BaseEntity {

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /**
     * Loại chó áp dụng: PUPPY, ADULT, SENIOR, WORKING, PREGNANT
     */
    @Column(name = "dog_category")
    @Enumerated(EnumType.STRING)
    private DogCategory dogCategory;

    /**
     * Cân nặng tối thiểu (kg)
     */
    @Column(name = "min_weight")
    private Double minWeight;

    /**
     * Cân nặng tối đa (kg)
     */
    @Column(name = "max_weight")
    private Double maxWeight;

    /**
     * Tuổi tối thiểu (tháng)
     */
    @Column(name = "min_age_months")
    private Integer minAgeMonths;

    /**
     * Tuổi tối đa (tháng)
     */
    @Column(name = "max_age_months")
    private Integer maxAgeMonths;

    /**
     * Mức độ hoạt động: LOW, MEDIUM, HIGH, INTENSIVE
     */
    @Column(name = "activity_level")
    @Enumerated(EnumType.STRING)
    private ActivityLevel activityLevel;

    /**
     * Tổng calories/ngày
     */
    @Column(name = "daily_calories")
    private Integer dailyCalories;

    /**
     * Số bữa ăn/ngày
     */
    @Column(name = "meals_per_day")
    private Integer mealsPerDay;

    /**
     * Ghi chú đặc biệt
     */
    @Column(name = "special_notes", columnDefinition = "TEXT")
    private String specialNotes;

    /**
     * Trạng thái: DRAFT, PENDING_REVIEW, APPROVED, ARCHIVED
     */
    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ContentStatus status = ContentStatus.DRAFT;

    @OneToMany(mappedBy = "nutritionPlan", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<FoodRation> foodRations = new ArrayList<>();

    public void addFoodRation(FoodRation ration) {
        foodRations.add(ration);
        ration.setNutritionPlan(this);
    }

    public void removeFoodRation(FoodRation ration) {
        foodRations.remove(ration);
        ration.setNutritionPlan(null);
    }
}
