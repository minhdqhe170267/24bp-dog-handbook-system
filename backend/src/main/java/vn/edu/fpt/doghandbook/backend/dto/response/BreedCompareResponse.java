package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class BreedCompareResponse {

    private List<BreedResponse> breeds;
    private ComparisonSummary summary;

    @Getter
    @Setter
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ComparisonSummary {
        private String heaviestBreed;
        private String lightestBreed;
        private String mostTrainable;
        private String longestLifespan;
    }
}
