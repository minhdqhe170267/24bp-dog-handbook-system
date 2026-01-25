package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.*;
import vn.edu.fpt.doghandbook.backend.entity.ActivityLevel;
import vn.edu.fpt.doghandbook.backend.entity.DogCategory;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NutritionPlanResponse {

    private Long id;
    private String name;
    private String description;
    private DogCategory dogCategory;
    private Double minWeight;
    private Double maxWeight;
    private Integer minAgeMonths;
    private Integer maxAgeMonths;
    private ActivityLevel activityLevel;
    private Integer dailyCalories;
    private Integer mealsPerDay;
    private String specialNotes;
    private LocalDateTime createdAt;
}
