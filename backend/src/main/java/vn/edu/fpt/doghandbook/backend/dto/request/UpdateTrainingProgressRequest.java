package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import vn.edu.fpt.doghandbook.backend.entity.enums.EnrollmentStatus;
import vn.edu.fpt.doghandbook.backend.validation.ValidEnum;

@Getter
@Setter
public class UpdateTrainingProgressRequest {

    @ValidEnum(enumClass = EnrollmentStatus.class, message = "Trạng thái tiến độ không hợp lệ")
    private String status;

    @Size(max = 5000, message = "Ghi chú tối đa 5000 ký tự")
    private String notes;
}
