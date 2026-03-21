package vn.edu.fpt.doghandbook.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.doghandbook.backend.dto.request.OperationReportRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.OperationReportResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.service.OperationReportService;
import vn.edu.fpt.doghandbook.backend.util.AuthenticationUtils;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/reports")
@RequiredArgsConstructor
public class ReportController {

    private final OperationReportService operationReportService;

    @GetMapping
    public ApiResponse<PageResponse<OperationReportResponse>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String type) {
        return ApiResponse.success(operationReportService.getAll(page, size, type));
    }

    @GetMapping("/my")
    public ApiResponse<PageResponse<OperationReportResponse>> getByTrainer(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication authentication) {
        Integer trainerId = AuthenticationUtils.extractUserId(authentication);
        return ApiResponse.success(operationReportService.getByTrainer(trainerId, page, size));
    }

    @GetMapping("/{id}")
    public ApiResponse<OperationReportResponse> getById(@PathVariable Integer id) {
        return ApiResponse.success(operationReportService.getById(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<OperationReportResponse> create(
            @Valid @RequestBody OperationReportRequest request,
            Authentication authentication) {
        Integer trainerId = AuthenticationUtils.extractUserId(authentication);
        return ApiResponse.success(operationReportService.create(request, trainerId));
    }

    @PutMapping("/{id}")
    public ApiResponse<OperationReportResponse> update(
            @PathVariable Integer id,
            @Valid @RequestBody OperationReportRequest request,
            Authentication authentication) {
        Integer trainerId = AuthenticationUtils.extractUserId(authentication);
        return ApiResponse.success(operationReportService.update(id, request, trainerId));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(
            @PathVariable Integer id,
            Authentication authentication) {
        Integer trainerId = AuthenticationUtils.extractUserId(authentication);
        operationReportService.delete(id, trainerId);
        return ApiResponse.success(null);
    }

    @GetMapping("/{id}/export")
    public ApiResponse<Map<String, Object>> export(@PathVariable Integer id) {
        OperationReportResponse report = operationReportService.getById(id);
        Map<String, Object> exportData = new HashMap<>();
        exportData.put("report", report);
        exportData.put("exportedAt", LocalDateTime.now().toString());
        exportData.put("format", "JSON_FOR_CLIENT_PDF");
        return ApiResponse.success(exportData);
    }
}
