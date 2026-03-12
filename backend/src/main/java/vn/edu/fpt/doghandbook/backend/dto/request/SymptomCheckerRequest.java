package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class SymptomCheckerRequest {

    @NotNull(message = "Danh sách triệu chứng không được để trống")
    @Size(min = 1, message = "Cần ít nhất 1 triệu chứng")
    private List<Integer> symptomIds;

    private Integer breedId;
    private Integer ageMonths;
}
