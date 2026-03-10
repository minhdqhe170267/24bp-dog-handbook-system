package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class DogAssignmentRequest {

    @NotNull(message = "Mã chó không được để trống")
    private Integer dogId;

    @NotNull(message = "Mã huấn luyện viên không được để trống")
    private Integer trainerId;

    private String assignmentType;

    @NotNull(message = "Ngày bắt đầu không được để trống")
    private LocalDate startDate;

    private LocalDate endDate;

    private String notes;
}
