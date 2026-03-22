package vn.edu.fpt.doghandbook.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.fpt.doghandbook.backend.dto.request.ApprovalRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.ApprovalRecordResponse;
import vn.edu.fpt.doghandbook.backend.entity.enums.ApprovableEntityType;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.service.ApprovalService;
import vn.edu.fpt.doghandbook.backend.util.AuthenticationUtils;

import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/approvals")
@RequiredArgsConstructor
public class ApprovalController {

    private final ApprovalService approvalService;

    @PutMapping("/{entityType}/{entityId}/submit")
    public ApiResponse<Void> submitForReview(
            @PathVariable("entityType") String entityType,
            @PathVariable("entityId") Integer entityId,
            Authentication authentication
    ) {
        approvalService.submitForReview(parseEntityType(entityType), entityId,
                AuthenticationUtils.extractUserId(authentication));
        return ApiResponse.success(null, "Đã gửi duyệt thành công");
    }

    @PostMapping("/{entityType}/{entityId}/review")
    public ResponseEntity<ApiResponse<ApprovalRecordResponse>> review(
            @PathVariable("entityType") String entityType,
            @PathVariable("entityId") Integer entityId,
            @Valid @RequestBody ApprovalRequest request,
            Authentication authentication
    ) {
        ApprovalRecordResponse response = approvalService.review(
                parseEntityType(entityType), entityId, request,
                AuthenticationUtils.extractUserId(authentication));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @PutMapping("/{entityType}/{entityId}/publish")
    public ApiResponse<Void> publish(
            @PathVariable("entityType") String entityType,
            @PathVariable("entityId") Integer entityId,
            Authentication authentication
    ) {
        approvalService.publish(parseEntityType(entityType), entityId,
                AuthenticationUtils.extractUserId(authentication));
        return ApiResponse.success(null, "Đã xuất bản thành công");
    }

    @PutMapping("/{entityType}/{entityId}/unpublish")
    public ApiResponse<Void> unpublish(
            @PathVariable("entityType") String entityType,
            @PathVariable("entityId") Integer entityId,
            Authentication authentication
    ) {
        approvalService.unpublish(parseEntityType(entityType), entityId,
                AuthenticationUtils.extractUserId(authentication));
        return ApiResponse.success(null, "Đã gỡ xuất bản thành công");
    }

    @GetMapping("/{entityType}/{entityId}/history")
    public ApiResponse<List<ApprovalRecordResponse>> getApprovalHistory(
            @PathVariable("entityType") String entityType,
            @PathVariable("entityId") Integer entityId
    ) {
        return ApiResponse.success(
                approvalService.getApprovalHistory(parseEntityType(entityType), entityId));
    }

    @GetMapping("/pending")
    public ApiResponse<List<Map<String, Object>>> getPendingReviews(
            @RequestParam("entityType") String entityType,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size
    ) {
        return ApiResponse.success(
                approvalService.getPendingReviews(parseEntityType(entityType), page, size));
    }

    private ApprovableEntityType parseEntityType(String value) {
        if (value == null || value.isBlank()) {
            throw new BadRequestException("entityType là bắt buộc");
        }
        try {
            return ApprovableEntityType.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("entityType không hợp lệ: " + value);
        }
    }
}
