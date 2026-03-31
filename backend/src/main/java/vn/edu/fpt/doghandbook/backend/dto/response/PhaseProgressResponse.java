package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Builder
public class PhaseProgressResponse {

    private String phaseName;
    private Integer phaseOrder;
    private Integer totalExercises;
    private Integer completedExercises;
    private List<ExerciseProgressResponse> exercises;
}
