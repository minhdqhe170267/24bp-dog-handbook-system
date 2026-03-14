package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class FieldNoteRequest {

    @NotBlank
    private String title;

    @NotBlank
    private String content;

    private Integer dogId;
    private String photoUrls;
    private String location;
    private Integer linkedContentId;
    private LocalDateTime recordingDate;
}
