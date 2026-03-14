package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class FieldNoteResponse {

    private Integer noteId;
    private Integer trainerId;
    private String trainerName;
    private Integer dogId;
    private String dogName;
    private String dogCode;
    private String title;
    private String content;
    private String photoUrls;
    private LocalDateTime recordingDate;
    private String location;
    private Integer linkedContentId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
