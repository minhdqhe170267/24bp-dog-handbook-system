package vn.edu.fpt.doghandbook.backend.service;

import vn.edu.fpt.doghandbook.backend.dto.request.ContentRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ContentResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.UnifiedContentResponse;

public interface ContentService {

    PageResponse<ContentResponse> getAll(int page, int size, String search, String type, String status);

    PageResponse<UnifiedContentResponse> getAllUnified(int page, int size, String search, String entityType, String status);

    ContentResponse getById(Integer id);

    ContentResponse create(ContentRequest request, Integer authorId);

    ContentResponse update(Integer id, ContentRequest request, Integer actorId);

    void delete(Integer id);
}
