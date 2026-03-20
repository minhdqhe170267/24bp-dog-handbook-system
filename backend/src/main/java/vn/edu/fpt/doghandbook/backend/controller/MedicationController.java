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
import vn.edu.fpt.doghandbook.backend.dto.request.MedicationRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.MedicationResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.service.MedicationService;
import vn.edu.fpt.doghandbook.backend.util.AuthenticationUtils;

@RestController
@RequestMapping("/medications")
@RequiredArgsConstructor
public class MedicationController {

    private final MedicationService medicationService;

    @GetMapping
    public ApiResponse<PageResponse<MedicationResponse>> getAll(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size,
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "status", required = false) String status,
            Authentication authentication
    ) {
        String effectiveStatus = AuthenticationUtils.hasRole(authentication, UserRole.TRAINER)
                ? ContentStatus.PUBLISHED.name()
                : status;
        return ApiResponse.success(medicationService.getAll(page, size, search, effectiveStatus));
    }

    @GetMapping("/{id}")
    public ApiResponse<MedicationResponse> getById(@PathVariable("id") Integer id, Authentication authentication) {
        MedicationResponse response = medicationService.getById(id);
        if (AuthenticationUtils.hasRole(authentication, UserRole.TRAINER)
                && !ContentStatus.PUBLISHED.name().equalsIgnoreCase(response.getStatus())) {
            throw new ResourceNotFoundException("Medication", "id", id);
        }
        return ApiResponse.success(response);
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MedicationResponse>> create(
            @Valid @RequestBody MedicationRequest request,
            Authentication authentication
    ) {
        MedicationResponse response = medicationService.create(request, AuthenticationUtils.extractUserId(authentication));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @PutMapping("/{id}")
    public ApiResponse<MedicationResponse> update(
            @PathVariable("id") Integer id,
            @Valid @RequestBody MedicationRequest request,
            Authentication authentication
    ) {
        return ApiResponse.success(
                medicationService.update(id, request, AuthenticationUtils.extractUserId(authentication))
        );
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable("id") Integer id) {
        medicationService.delete(id);
        return ApiResponse.success(null, "Deleted successfully");
    }
}
