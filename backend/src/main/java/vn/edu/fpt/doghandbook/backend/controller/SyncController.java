package vn.edu.fpt.doghandbook.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncResponse;
import vn.edu.fpt.doghandbook.backend.service.SyncService;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/sync")
@RequiredArgsConstructor
public class SyncController {

    
    private final SyncService syncService;

    @GetMapping("/content")
    public ApiResponse<SyncResponse> getUpdatedContent(
            @RequestParam(value = "lastSyncAt", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime lastSyncAt
    ) {
        return ApiResponse.success(syncService.getUpdatedContent(lastSyncAt));
    }

    @GetMapping("/pull")
    public ApiResponse<SyncResponse> pullData(
            @RequestParam(value = "lastSyncAt", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime lastSyncAt
    ) {
        return ApiResponse.success(syncService.getUpdatedContent(lastSyncAt));
    }
}
