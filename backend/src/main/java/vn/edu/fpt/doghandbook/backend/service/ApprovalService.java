package vn.edu.fpt.doghandbook.backend.service;

import vn.edu.fpt.doghandbook.backend.dto.request.ApprovalRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ApprovalRecordResponse;
import vn.edu.fpt.doghandbook.backend.entity.enums.ApprovableEntityType;

import java.util.List;
import java.util.Map;

public interface ApprovalService {

    void submitForReview(ApprovableEntityType entityType, Integer entityId);

    ApprovalRecordResponse review(ApprovableEntityType entityType, Integer entityId,
                                  ApprovalRequest request, Integer reviewerId);

    void publish(ApprovableEntityType entityType, Integer entityId);

    void unpublish(ApprovableEntityType entityType, Integer entityId);

    List<ApprovalRecordResponse> getApprovalHistory(ApprovableEntityType entityType, Integer entityId);

    List<Map<String, Object>> getPendingReviews(ApprovableEntityType entityType, int page, int size);
}
