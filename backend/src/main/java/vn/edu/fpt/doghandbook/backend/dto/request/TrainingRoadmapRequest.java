package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TrainingRoadmapRequest {

    @NotBlank(message = "Tên lộ trình không được để trống")
    @Size(max = 200, message = "Tên lộ trình tối đa 200 ký tự")
    private String roadmapName;

    private Integer breedId;

    @Size(max = 100, message = "Vai trò mục tiêu tối đa 100 ký tự")
    private String targetRole;

    @Size(max = 5000, message = "Mô tả tối đa 5000 ký tự")
    private String description;

    @Min(value = 1, message = "Tổng thời gian phải >= 1 tuần")
    @Max(value = 104, message = "Tổng thời gian phải <= 104 tuần")
    private Integer totalDurationWeeks;

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
}
