package vn.edu.fpt.doghandbook.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.doghandbook.backend.config.CustomUserDetails;
import vn.edu.fpt.doghandbook.backend.dto.request.HealthRecordRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.HealthRecordResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.service.HealthRecordService;

@RestController
@RequestMapping("/health-records")
@RequiredArgsConstructor
public class HealthRecordController {

    private final HealthRecordService healthRecordService;

    @GetMapping
    public ApiResponse<PageResponse<HealthRecordResponse>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.success(healthRecordService.getAll(page, size));
    }

    @GetMapping("/by-dog/{dogId}")
    public ApiResponse<PageResponse<HealthRecordResponse>> getByDog(
            @PathVariable Integer dogId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.success(healthRecordService.getByDog(dogId, page, size));
    }

    @GetMapping("/{id}")
    public ApiResponse<HealthRecordResponse> getById(@PathVariable Integer id) {
        return ApiResponse.success(healthRecordService.getById(id));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<HealthRecordResponse>> create(
            @Valid @RequestBody HealthRecordRequest request,
            Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        Integer examinerId = userDetails.getUser().getUserId();
        HealthRecordResponse response = healthRecordService.create(request, examinerId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Tạo hồ sơ sức khỏe thành công"));
    }
}
