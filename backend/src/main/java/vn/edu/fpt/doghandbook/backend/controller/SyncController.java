package vn.edu.fpt.doghandbook.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.fpt.doghandbook.backend.dto.request.SyncPushRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncQueueResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncStatusResponse;
import vn.edu.fpt.doghandbook.backend.service.SyncService;
import vn.edu.fpt.doghandbook.backend.util.AuthenticationUtils;

import java.util.List;

@RestController
@RequestMapping("/sync")
@RequiredArgsConstructor
public class SyncController {

    private final SyncService syncService;

    @PostMapping("/push")
    public ApiResponse<SyncQueueResponse> pushToQueue(
            @Valid @RequestBody SyncPushRequest request,
            Authentication authentication) {
        Integer userId = AuthenticationUtils.extractUserId(authentication);
        return ApiResponse.success(syncService.pushToQueue(request, userId));
    }

    @PostMapping("/process")
    public ApiResponse<List<SyncQueueResponse>> processPending(Authentication authentication) {
        Integer userId = AuthenticationUtils.extractUserId(authentication);
        return ApiResponse.success(syncService.processPending(userId));
    }

    @GetMapping("/status")
    public ApiResponse<SyncStatusResponse> getStatus(Authentication authentication) {
        Integer userId = AuthenticationUtils.extractUserId(authentication);
        return ApiResponse.success(syncService.getStatus(userId));
    }
}
