package vn.edu.fpt.doghandbook.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.fpt.doghandbook.backend.dto.request.ConflictResolveRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.SyncPushRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncConflictDetailResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncConflictListResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncPushBatchResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncPushItemResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncQueueResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncStatusResponse;
import vn.edu.fpt.doghandbook.backend.entity.enums.ConflictStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.service.SyncService;
import vn.edu.fpt.doghandbook.backend.util.AuthenticationUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/sync")
@RequiredArgsConstructor
public class SyncController {

    private final SyncService syncService;

    @GetMapping("/pull")
    public ApiResponse<SyncResponse> pull(
            @RequestParam(name = "since", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime since,
            Authentication authentication) {
        Integer userId = AuthenticationUtils.extractUserId(authentication);
        return ApiResponse.success(syncService.getUpdatedContent(since, userId));
    }

    @PostMapping("/push")
    public ApiResponse<SyncPushBatchResponse> pushBatch(
            @RequestBody List<@Valid SyncPushRequest> items,
            Authentication authentication) {
        Integer userId = AuthenticationUtils.extractUserId(authentication);
        return ApiResponse.success(syncService.pushBatch(items, userId));
    }

    @PostMapping("/push/single")
    public ApiResponse<SyncQueueResponse> pushToQueue(
            @Valid @RequestBody SyncPushRequest request,
            Authentication authentication) {
        Integer userId = AuthenticationUtils.extractUserId(authentication);
        return ApiResponse.success(syncService.pushToQueue(request, userId));
    }

    @PostMapping("/process")
    public ApiResponse<List<SyncPushItemResponse>> processPending(Authentication authentication) {
        Integer userId = AuthenticationUtils.extractUserId(authentication);
        return ApiResponse.success(syncService.processPending(userId));
    }

    @GetMapping("/status")
    public ApiResponse<SyncStatusResponse> getStatus(Authentication authentication) {
        Integer userId = AuthenticationUtils.extractUserId(authentication);
        return ApiResponse.success(syncService.getStatus(userId));
    }

    // ── Conflict Resolution Endpoints ──

    @GetMapping("/conflicts")
    public ApiResponse<PageResponse<SyncConflictListResponse>> getConflicts(
            @RequestParam(defaultValue = "PENDING") ConflictStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {
        requireAdminOrReviewer(authentication);
        Pageable pageable = PageRequest.of(page, size);
        return ApiResponse.success(syncService.getConflicts(status, pageable));
    }

    @GetMapping("/conflicts/{id}")
    public ApiResponse<SyncConflictDetailResponse> getConflictDetail(
            @PathVariable Integer id,
            Authentication authentication) {
        // ADMIN, REVIEWER, and TRAINER can view conflict detail
        AuthenticationUtils.extractUserId(authentication);
        return ApiResponse.success(syncService.getConflictDetail(id));
    }

    @PutMapping("/conflicts/{id}/resolve")
    public ApiResponse<SyncConflictDetailResponse> resolveConflict(
            @PathVariable Integer id,
            @Valid @RequestBody ConflictResolveRequest request,
            Authentication authentication) {
        requireAdminOrReviewer(authentication);
        Integer adminUserId = AuthenticationUtils.extractUserId(authentication);
        return ApiResponse.success(syncService.resolveConflict(id, request, adminUserId));
    }

    @GetMapping("/conflicts/count")
    public ApiResponse<Map<String, Long>> getConflictCount(Authentication authentication) {
        requireAdminOrReviewer(authentication);
        return ApiResponse.success(Map.of("pending", syncService.getPendingConflictCount()));
    }

    @GetMapping("/my-conflicts")
    public ApiResponse<List<SyncConflictListResponse>> getMyConflicts(Authentication authentication) {
        Integer trainerId = AuthenticationUtils.extractUserId(authentication);
        return ApiResponse.success(syncService.getTrainerConflicts(trainerId));
    }

    @GetMapping("/my-conflicts/resolved")
    public ApiResponse<List<SyncConflictDetailResponse>> getMyResolvedConflicts(Authentication authentication) {
        Integer trainerId = AuthenticationUtils.extractUserId(authentication);
        return ApiResponse.success(syncService.getResolvedConflictsForTrainer(trainerId));
    }

    private void requireAdminOrReviewer(Authentication authentication) {
        if (!AuthenticationUtils.hasRole(authentication, UserRole.ADMIN)
                && !AuthenticationUtils.hasRole(authentication, UserRole.REVIEWER)) {
            throw new BadRequestException("Chỉ ADMIN hoặc REVIEWER mới có quyền thực hiện thao tác này");
        }
    }
}
