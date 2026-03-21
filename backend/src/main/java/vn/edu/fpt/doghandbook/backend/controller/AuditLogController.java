package vn.edu.fpt.doghandbook.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.AuditLogResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.AuditLogStatsResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.service.AuditLogService;

@RestController
@RequestMapping("/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    public ApiResponse<PageResponse<AuditLogResponse>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String actionType,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) Integer userId,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        return ApiResponse.success(
                auditLogService.getAll(page, size, actionType, entityType, userId, from, to));
    }

    @GetMapping("/{id}")
    public ApiResponse<AuditLogResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(auditLogService.getById(id));
    }

    @GetMapping("/stats")
    public ApiResponse<AuditLogStatsResponse> getStats() {
        return ApiResponse.success(auditLogService.getStats());
    }
}
