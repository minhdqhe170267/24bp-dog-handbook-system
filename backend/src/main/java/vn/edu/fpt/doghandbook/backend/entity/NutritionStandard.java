package vn.edu.fpt.doghandbook.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Nutrition standard reference entity.
 */
@Entity
@Table(name = "nutrition_standard")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class NutritionStandard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "standard_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "breed_id", nullable = false)
    private DogBreed dogBreed;

    @Column(name = "ration_code", nullable = false)
    private String rationCode;

    @Column(name = "ration_name", nullable = false)
    private String rationName;

    @Column(name = "description")
    private String description;

    @Column(name = "target_weight_min_kg")
    private Double targetWeightMinKg;

    @Column(name = "target_weight_max_kg")
    private Double targetWeightMaxKg;

    @Column(name = "target_age_min_months")
    private Integer targetAgeMinMonths;

    @Column(name = "target_age_max_months")
    private Integer targetAgeMaxMonths;

    @Column(name = "activity_level")
    private String activityLevel;

    @Column(name = "health_condition")
    private String healthCondition;

    @Column(name = "daily_calories")
    private Integer dailyCalories;

    @Column(name = "protein_grams")
    private Double proteinGrams;

    @Column(name = "fat_grams")
    private Double fatGrams;

    @Column(name = "carb_grams")
    private Double carbGrams;

    @Column(name = "ingredients_list")
    private String ingredientsList;

    @Column(name = "feeding_schedule")
    private String feedingSchedule;

    @Column(name = "special_notes")
    private String specialNotes;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted;
}
