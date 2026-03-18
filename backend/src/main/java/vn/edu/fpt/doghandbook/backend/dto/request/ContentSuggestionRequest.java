package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import vn.edu.fpt.doghandbook.backend.entity.enums.SuggestionType;
import vn.edu.fpt.doghandbook.backend.validation.ValidEnum;

import java.time.LocalDateTime;

@Getter
@Setter
public class ContentSuggestionRequest {

    @Size(max = 36, message = "Local ID tối đa 36 ký tự")
    private String localId;

    @NotNull(message = "Loại đề xuất không được để trống")
    @ValidEnum(enumClass = SuggestionType.class, message = "Loại đề xuất không hợp lệ")
    private String suggestionType;

    private Integer relatedExerciseId;

    @NotBlank(message = "Tiêu đề không được để trống")
    @Size(max = 200, message = "Tiêu đề tối đa 200 ký tự")
    private String title;

    @NotBlank(message = "Mô tả không được để trống")
    @Size(max = 5000, message = "Mô tả tối đa 5000 ký tự")
    private String description;

    private LocalDateTime localUpdatedAt;
}
