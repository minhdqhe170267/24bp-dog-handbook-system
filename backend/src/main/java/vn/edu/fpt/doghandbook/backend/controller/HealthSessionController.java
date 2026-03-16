package vn.edu.fpt.doghandbook.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.doghandbook.backend.config.CustomUserDetails;
import vn.edu.fpt.doghandbook.backend.dto.request.HealthSessionRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.SessionFollowUpRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.HealthSessionResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.service.HealthSessionService;

import java.util.Map;

@RestController
@RequestMapping("/health-sessions")
@RequiredArgsConstructor
public class HealthSessionController {

    private final HealthSessionService healthSessionService;

    @PostMapping
    public ResponseEntity<ApiResponse<HealthSessionResponse>> create(
            @Valid @RequestBody HealthSessionRequest request,
            Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        Integer trainerId = userDetails.getUser().getUserId();
        HealthSessionResponse response = healthSessionService.create(request, trainerId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response));
    }

    @GetMapping("/{id}")
    public ApiResponse<HealthSessionResponse> getById(@PathVariable Integer id) {
        return ApiResponse.success(healthSessionService.getById(id));
    }

    @GetMapping("/my")
    public ApiResponse<PageResponse<HealthSessionResponse>> getByTrainer(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        Integer trainerId = userDetails.getUser().getUserId();
        return ApiResponse.success(healthSessionService.getByTrainer(trainerId, page, size));
    }

    @GetMapping("/by-dog/{dogId}")
    public ApiResponse<PageResponse<HealthSessionResponse>> getByDog(
            @PathVariable Integer dogId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.success(healthSessionService.getByDog(dogId, page, size));
    }

    @PostMapping("/{id}/follow-up")
    public ResponseEntity<ApiResponse<HealthSessionResponse>> addFollowUp(
            @PathVariable Integer id,
            @Valid @RequestBody SessionFollowUpRequest request,
            Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        Integer trainerId = userDetails.getUser().getUserId();
        request.setSessionId(id);
        HealthSessionResponse response = healthSessionService.addFollowUp(request, trainerId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response));
    }

    @PutMapping("/{id}/resolve")
    public ApiResponse<HealthSessionResponse> resolve(
            @PathVariable Integer id,
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        Integer trainerId = userDetails.getUser().getUserId();
        String resolutionNotes = body.get("resolutionNotes");
        return ApiResponse.success(healthSessionService.resolve(id, resolutionNotes, trainerId));
    }
}
