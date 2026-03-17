package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentType;
import vn.edu.fpt.doghandbook.backend.validation.ValidEnum;

@Getter
@Setter
public class ContentRequest {

    @NotBlank(message = "title is required")
    @Size(max = 200, message = "title must not exceed 200 characters")
    private String title;

    @NotBlank(message = "contentType is required")
    @ValidEnum(enumClass = ContentType.class, message = "contentType không hợp lệ")
    private String contentType;

    @NotBlank(message = "body is required")
    private String body;

    @Size(max = 500, message = "summary must not exceed 500 characters")
    private String summary;

    @Size(max = 255, message = "tags must not exceed 255 characters")
    private String tags;

    @ValidEnum(enumClass = ContentStatus.class, message = "status không hợp lệ")
    private String status;
}
