package vn.edu.fpt.doghandbook.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.doghandbook.backend.config.CustomUserDetails;
import vn.edu.fpt.doghandbook.backend.dto.request.BreedCompareRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.BreedRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.BreedCompareResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.BreedResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.DevelopmentStageResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.service.BreedService;

import java.util.List;

@RestController
@RequestMapping("/breeds")
@RequiredArgsConstructor
public class BreedController {

    private final BreedService breedService;

    @GetMapping
    public ApiResponse<PageResponse<BreedResponse>> getAllBreeds(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search) {
        return ApiResponse.success(breedService.getAll(page, size, search));
    }

    @GetMapping("/{id}")
    public ApiResponse<BreedResponse> getBreedById(@PathVariable Integer id) {
        return ApiResponse.success(breedService.getById(id));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<BreedResponse>> createBreed(
            @Valid @RequestBody BreedRequest request,
            Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        Integer userId = userDetails.getUser().getUserId();
        BreedResponse response = breedService.create(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response, "Tạo giống chó thành công"));
    }

    @PutMapping("/{id}")
    public ApiResponse<BreedResponse> updateBreed(
            @PathVariable Integer id,
            @Valid @RequestBody BreedRequest request) {
        return ApiResponse.success(breedService.update(id, request), "Cập nhật giống chó thành công");
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteBreed(@PathVariable Integer id) {
        breedService.delete(id);
        return ApiResponse.success(null, "Xóa giống chó thành công");
    }

    @PostMapping("/compare")
    public ApiResponse<BreedCompareResponse> compareBreeds(
            @Valid @RequestBody BreedCompareRequest request) {
        return ApiResponse.success(breedService.compare(request.getBreedIds()));
    }

    @GetMapping("/{id}/development-stages")
    public ApiResponse<List<DevelopmentStageResponse>> getDevelopmentStages(@PathVariable Integer id) {
        return ApiResponse.success(breedService.getDevelopmentStages(id));
    }
}
