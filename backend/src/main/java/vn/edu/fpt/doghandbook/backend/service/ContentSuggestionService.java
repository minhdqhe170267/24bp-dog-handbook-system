package vn.edu.fpt.doghandbook.backend.service;

import vn.edu.fpt.doghandbook.backend.dto.request.ContentSuggestionRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ContentSuggestionResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;

import java.time.LocalDateTime;
import java.util.List;

public interface ContentSuggestionService {

    PageResponse<ContentSuggestionResponse> getAll(int page, int size, String status);

    ContentSuggestionResponse getById(Integer id);

    ContentSuggestionResponse submit(ContentSuggestionRequest request, Integer trainerId);

    ContentSuggestionResponse respond(Integer suggestionId, String adminResponse, String newStatus,
                                       Integer reviewerId, LocalDateTime localUpdatedAt);

    List<ContentSuggestionResponse> getMySubmissions(Integer trainerId);
}
