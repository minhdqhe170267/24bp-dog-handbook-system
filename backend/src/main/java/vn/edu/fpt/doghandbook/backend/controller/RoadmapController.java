package vn.edu.fpt.doghandbook.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.fpt.doghandbook.backend.dto.request.TrainingRoadmapRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.TrainingRoadmapResponse;
import vn.edu.fpt.doghandbook.backend.service.TrainingService;
import vn.edu.fpt.doghandbook.backend.util.AuthenticationUtils;

@RestController
@RequestMapping("/roadmaps")
@RequiredArgsConstructor
public class RoadmapController {

    private final TrainingService trainingService;

    @GetMapping
    public ApiResponse<PageResponse<TrainingRoadmapResponse>> getAllRoadmaps(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size,
            @RequestParam(value = "specialtyId", required = false) Integer specialtyId) {
        return ApiResponse.success(trainingService.getAllRoadmaps(page, size, specialtyId));
    }

    @GetMapping("/{id}")
    public ApiResponse<TrainingRoadmapResponse> getRoadmapById(@PathVariable("id") Integer id) {
        return ApiResponse.success(trainingService.getRoadmapById(id));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TrainingRoadmapResponse>> createRoadmap(
            @Valid @RequestBody TrainingRoadmapRequest request,
            Authentication authentication) {
        TrainingRoadmapResponse response = trainingService.createRoadmap(
                request,
                AuthenticationUtils.extractUserId(authentication)
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @PutMapping("/{id}")
    public ApiResponse<TrainingRoadmapResponse> updateRoadmap(
            @PathVariable("id") Integer id,
            @Valid @RequestBody TrainingRoadmapRequest request) {
        return ApiResponse.success(trainingService.updateRoadmap(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteRoadmap(@PathVariable("id") Integer id) {
        trainingService.deleteRoadmap(id);
        return ApiResponse.success(null, "Xóa thành công");
    }
}
