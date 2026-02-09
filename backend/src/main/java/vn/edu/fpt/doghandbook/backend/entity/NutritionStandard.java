package vn.edu.fpt.doghandbook.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Nutrition standard defining age and weight ranges.
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
    private Long id;

    @Column(name = "code", nullable = false)
    private String code;


    @Column(name = "description")
    private String description;

    @Column(name = "min_weight")
    private Double minWeight;

    @Column(name = "max_weight")
    private Double maxWeight;

    @Column(name = "min_age_month")
    private Integer minAgeMonth;

    @Column(name = "max_age_month")
    private Integer maxAgeMonth;
}
