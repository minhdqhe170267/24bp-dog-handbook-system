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
public class SearchHistoryResponse {

    private Integer searchId;

    private String searchKeyword;

    private String searchContext;

    private Integer resultCount;

    private LocalDateTime searchedAt;
}
