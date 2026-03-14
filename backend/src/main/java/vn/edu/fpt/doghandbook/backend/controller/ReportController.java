package vn.edu.fpt.doghandbook.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.doghandbook.backend.dto.request.OperationReportRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.OperationReportResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.service.OperationReportService;

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
            @RequestParam Integer trainerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
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
            @RequestParam Integer trainerId) {
        return ApiResponse.success(operationReportService.create(request, trainerId));
    }

    @PutMapping("/{id}")
    public ApiResponse<OperationReportResponse> update(
            @PathVariable Integer id,
            @Valid @RequestBody OperationReportRequest request,
            @RequestParam Integer trainerId) {
        return ApiResponse.success(operationReportService.update(id, request, trainerId));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(
            @PathVariable Integer id,
            @RequestParam Integer trainerId) {
        operationReportService.delete(id, trainerId);
        return ApiResponse.success(null);
    }

    @GetMapping("/{id}/export")
    public ApiResponse<OperationReportResponse> export(@PathVariable Integer id) {
        return ApiResponse.success(operationReportService.getById(id));
    }
}
