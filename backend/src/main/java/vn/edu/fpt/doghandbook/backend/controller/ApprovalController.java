package vn.edu.fpt.doghandbook.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.fpt.doghandbook.backend.dto.request.ApprovalRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.ApprovalRecordResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.ContentResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.service.ContentService;
import vn.edu.fpt.doghandbook.backend.util.AuthenticationUtils;

import java.util.List;

@RestController
@RequestMapping("/contents")
@RequiredArgsConstructor
public class ApprovalController {

    private final ContentService contentService;

    @PostMapping("/{id}/review")
    public ResponseEntity<ApiResponse<ApprovalRecordResponse>> reviewContent(
            @PathVariable("id") Integer contentId,
            @Valid @RequestBody ApprovalRequest request,
            Authentication authentication
    ) {
        ApprovalRecordResponse response =
                contentService.reviewContent(contentId, request, AuthenticationUtils.extractUserId(authentication));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @GetMapping("/{id}/approval-history")
    public ApiResponse<List<ApprovalRecordResponse>> getApprovalHistory(@PathVariable("id") Integer contentId) {
        return ApiResponse.success(contentService.getApprovalHistory(contentId));
    }

    @GetMapping("/pending-reviews")
    public ApiResponse<PageResponse<ContentResponse>> getPendingReviews(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size
    ) {
        return ApiResponse.success(contentService.getPendingReviews(page, size));
    }
}
