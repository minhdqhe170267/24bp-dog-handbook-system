package vn.edu.fpt.doghandbook.backend.service;

import vn.edu.fpt.doghandbook.backend.dto.request.ApprovalRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.ContentRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ApprovalRecordResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.ContentResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;

import java.util.List;

public interface ContentService {

    // Content CRUD
    PageResponse<ContentResponse> getAll(int page, int size, String search, String type, String status);

    ContentResponse getById(Integer id);

    ContentResponse create(ContentRequest request, Integer authorId);

    ContentResponse update(Integer id, ContentRequest request);

    void delete(Integer id);

    ContentResponse submitForReview(Integer contentId);

    ContentResponse publish(Integer contentId);

    // Approval
    ApprovalRecordResponse reviewContent(Integer contentId, ApprovalRequest request, Integer reviewerId);

    List<ApprovalRecordResponse> getApprovalHistory(Integer contentId);

    PageResponse<ContentResponse> getPendingReviews(int page, int size);
}
