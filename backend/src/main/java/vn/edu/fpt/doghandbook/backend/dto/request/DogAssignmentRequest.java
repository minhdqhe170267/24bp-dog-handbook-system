package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import vn.edu.fpt.doghandbook.backend.entity.enums.AssignmentType;
import vn.edu.fpt.doghandbook.backend.validation.ValidEnum;

import java.time.LocalDate;

@Getter
@Setter
public class DogAssignmentRequest {

    @NotNull(message = "Mã chó không được để trống")
    private Integer dogId;

    @NotNull(message = "Mã huấn luyện viên không được để trống")
    private Integer trainerId;

    @ValidEnum(enumClass = AssignmentType.class, message = "Loại phân công không hợp lệ")
    private String assignmentType;

    @NotNull(message = "Ngày bắt đầu không được để trống")
    private LocalDate startDate;

    private LocalDate endDate;

    @Size(max = 500, message = "Ghi chú tối đa 500 ký tự")
    private String notes;
}
