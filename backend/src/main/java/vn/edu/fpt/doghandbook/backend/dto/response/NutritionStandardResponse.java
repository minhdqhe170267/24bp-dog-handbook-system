package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * DTO for nutrition standard response.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NutritionStandardResponse {

    private Long id;
    private String code;
    private String description;
    private Double minWeight;
    private Double maxWeight;
    private Integer minAgeMonth;
    private Integer maxAgeMonth;
}
