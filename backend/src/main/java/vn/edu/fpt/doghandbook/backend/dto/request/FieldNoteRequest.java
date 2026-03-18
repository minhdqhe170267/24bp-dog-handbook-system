package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class FieldNoteRequest {

    @NotBlank(message = "Tiêu đề không được để trống")
    @Size(max = 200, message = "Tiêu đề tối đa 200 ký tự")
    private String title;

    @NotBlank(message = "Nội dung không được để trống")
    @Size(max = 50000, message = "Nội dung tối đa 50000 ký tự")
    private String content;

    private Integer dogId;

    @Size(max = 5000, message = "URL ảnh tối đa 5000 ký tự")
    private String photoUrls;

    @Size(max = 200, message = "Địa điểm tối đa 200 ký tự")
    private String location;

    private Integer linkedContentId;
    private LocalDateTime recordingDate;
    private LocalDateTime localUpdatedAt;
}
