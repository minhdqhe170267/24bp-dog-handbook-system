package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class TrainingPhaseRequest {

    private Integer phaseId;

    @NotBlank(message = "Tên giai đoạn không được để trống")
    @Size(max = 100, message = "Tên giai đoạn tối đa 100 ký tự")
    private String phaseName;

    @Min(value = 1, message = "Thứ tự giai đoạn phải >= 1")
    private Integer phaseOrder;

    @Min(value = 1, message = "Thời gian giai đoạn phải >= 1 tuần")
    @Max(value = 52, message = "Thời gian giai đoạn phải <= 52 tuần")
    private Integer phaseDurationWeeks;

    @Size(max = 5000, message = "Mục tiêu giai đoạn tối đa 5000 ký tự")
    private String phaseObjectives;

    @Size(max = 5000, message = "Tiêu chí đánh giá tối đa 5000 ký tự")
    private String assessmentCriteria;

    private List<Integer> exerciseIds;
}
