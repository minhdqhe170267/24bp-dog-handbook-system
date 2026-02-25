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
 * Nutrition ration for a specific dog breed and standard.
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
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "nutrition_standard_id", nullable = false)
    private NutritionStandard nutritionStandard;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "breed_id", nullable = false)
    private DogBreed dogBreed;

    @Column(name = "daily_food_gram", nullable = false)
    private Integer dailyFoodGram;

    @Column(name = "note")
    private String note;
}
