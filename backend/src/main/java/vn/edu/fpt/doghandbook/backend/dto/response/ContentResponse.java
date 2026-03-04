package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ContentResponse {

    private Integer contentId;
    private String title;
    private String contentType;
    private String body;
    private String summary;
    private String status;
    private Integer authorId;
    private String authorName;
    private LocalDateTime publishedAt;
    private Integer version;
    private String tags;
    private List<MediaItem> mediaFiles;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Getter
    @Setter
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class MediaItem {

        private Integer mediaId;
        private String filename;
        private String mediaType;
        private String fileUrl;
        private Long fileSizeBytes;
        private String mimeType;
        private String altText;
        private Integer displayOrder;
    }
}
