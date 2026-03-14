package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MediaUpdateRequest {

    @Size(max = 255, message = "altText must not exceed 255 characters")
    private String altText;

    @Min(value = 1, message = "displayOrder must be greater than 0")
    private Integer displayOrder;
}
