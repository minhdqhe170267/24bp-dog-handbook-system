package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ContentRequest {

    @NotBlank
    private String title;

    @NotNull
    private String contentType;

    @NotBlank
    private String body;

    private String summary;
    private String tags;
}
