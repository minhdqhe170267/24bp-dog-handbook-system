package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * DTO for nutrition ration response.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NutritionRationResponse {

    private Long id;
    private Long breedId;
    private String breedName;
    private Integer dailyFoodGram;
    private String note;
    private NutritionStandardResponse standard;
}
