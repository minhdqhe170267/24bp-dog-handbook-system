package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class EnrollDogRequest {

    @NotNull(message = "dogId không được để trống")
    @Positive(message = "dogId phải > 0")
    private Integer dogId;

    @NotNull(message = "roadmapId không được để trống")
    @Positive(message = "roadmapId phải > 0")
    private Integer roadmapId;

    @NotNull(message = "assignedTrainerId không được để trống")
    @Positive(message = "assignedTrainerId phải > 0")
    private Integer assignedTrainerId;

    @Size(max = 5000, message = "Ghi chú tối đa 5000 ký tự")
    private String notes;
}
