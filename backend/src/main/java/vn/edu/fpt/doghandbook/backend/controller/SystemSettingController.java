package vn.edu.fpt.doghandbook.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.doghandbook.backend.dto.request.SystemSettingBatchRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.SystemSettingUpdateRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SystemSettingResponse;
import vn.edu.fpt.doghandbook.backend.service.SystemSettingService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/system-settings")
@RequiredArgsConstructor
public class SystemSettingController {

    private final SystemSettingService systemSettingService;

    @GetMapping
    public ApiResponse<Map<String, List<SystemSettingResponse>>> getAll() {
        return ApiResponse.success(systemSettingService.getAllGrouped());
    }

    @GetMapping("/{key}")
    public ApiResponse<SystemSettingResponse> getByKey(@PathVariable String key) {
        return ApiResponse.success(systemSettingService.getByKey(key));
    }

    @PutMapping("/{key}")
    public ApiResponse<SystemSettingResponse> update(
            @PathVariable String key,
            @Valid @RequestBody SystemSettingUpdateRequest request) {
        return ApiResponse.success(
                systemSettingService.update(key, request.getValue()),
                "Cập nhật cài đặt thành công");
    }

    @PutMapping("/batch")
    public ApiResponse<List<SystemSettingResponse>> updateBatch(
            @Valid @RequestBody SystemSettingBatchRequest request) {
        return ApiResponse.success(
                systemSettingService.updateBatch(request.getSettings()),
                "Cập nhật hàng loạt thành công");
    }

    @PostMapping("/reset-defaults")
    public ApiResponse<List<SystemSettingResponse>> resetDefaults() {
        return ApiResponse.success(
                systemSettingService.resetDefaults(),
                "Đã khôi phục tất cả về giá trị mặc định");
    }
}
