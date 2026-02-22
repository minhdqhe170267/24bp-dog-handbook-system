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
 * Nutrition ration item for a nutrition standard.
 */
@Entity
@Table(name = "nutrition_ration")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class NutritionRation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ration_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "standard_id", nullable = false)
    private NutritionStandard nutritionStandard;

    @Column(name = "food_item_name", nullable = false)
    private String foodItemName;

    @Column(name = "food_category")
    private String foodCategory;

    @Column(name = "quantity_per_day", nullable = false)
    private Double quantityPerDay;

    @Column(name = "unit", nullable = false)
    private String unit;

    @Column(name = "meal_time", nullable = false)
    private String mealTime;

    @Column(name = "calories_kcal")
    private Double caloriesKcal;

    @Column(name = "protein_grams")
    private Double proteinGrams;

    @Column(name = "fat_grams")
    private Double fatGrams;

    @Column(name = "carb_grams")
    private Double carbGrams;

    @Column(name = "preparation_notes")
    private String preparationNotes;

    @Column(name = "feeding_instructions")
    private String feedingInstructions;

    @Column(name = "display_order")
    private Integer displayOrder;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted;
}
