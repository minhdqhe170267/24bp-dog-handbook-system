package vn.edu.fpt.doghandbook.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.doghandbook.backend.config.CustomUserDetails;
import vn.edu.fpt.doghandbook.backend.dto.request.DiseaseRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.DiseaseResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.service.DiseaseService;

@RestController
@RequestMapping("/diseases")
@RequiredArgsConstructor
public class DiseaseController {

        private final DiseaseService diseaseService;

        @GetMapping
        public ApiResponse<PageResponse<DiseaseResponse>> getAllDiseases(
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "10") int size,
                        @RequestParam(required = false) String search) {
                return ApiResponse.success(diseaseService.getAll(page, size, search));
        }

        @GetMapping("/{id}")
        public ApiResponse<DiseaseResponse> getDiseaseById(@PathVariable Integer id) {
                return ApiResponse.success(diseaseService.getById(id));
        }

        @PostMapping
        public ResponseEntity<ApiResponse<DiseaseResponse>> createDisease(
                        @Valid @RequestBody DiseaseRequest request,
                        Authentication authentication) {
                CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
                Integer userId = userDetails.getUser().getUserId();
                DiseaseResponse response = diseaseService.create(request, userId);
                return ResponseEntity.status(HttpStatus.CREATED)
                                .body(ApiResponse.success(response, "Tạo bệnh thành công"));
        }

        @PutMapping("/{id}")
        public ApiResponse<DiseaseResponse> updateDisease(
                        @PathVariable Integer id,
                        @Valid @RequestBody DiseaseRequest request) {
                return ApiResponse.success(diseaseService.update(id, request), "Cập nhật bệnh thành công");
        }

        @DeleteMapping("/{id}")
        public ApiResponse<Void> deleteDisease(@PathVariable Integer id) {
                diseaseService.delete(id);
                return ApiResponse.success(null, "Xóa bệnh thành công");
        }
}