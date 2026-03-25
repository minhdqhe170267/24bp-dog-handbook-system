package vn.edu.fpt.doghandbook.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.fpt.doghandbook.backend.dto.request.FirstAidGuideRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.FirstAidGuideResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.service.FirstAidGuideService;
import vn.edu.fpt.doghandbook.backend.util.AuthenticationUtils;

@RestController
@RequestMapping("/first-aid-guides")
@RequiredArgsConstructor
public class FirstAidController {

    private final FirstAidGuideService firstAidGuideService;

    @GetMapping
    public ApiResponse<PageResponse<FirstAidGuideResponse>> getAll(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size,
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "status", required = false) String status,
            Authentication authentication
    ) {
        String effectiveStatus = AuthenticationUtils.hasRole(authentication, UserRole.TRAINER)
                ? ContentStatus.PUBLISHED.name()
                : status;
        return ApiResponse.success(firstAidGuideService.getAll(page, size, search, effectiveStatus));
    }

    @GetMapping("/{id}")
    public ApiResponse<FirstAidGuideResponse> getById(@PathVariable("id") Integer id, Authentication authentication) {
        FirstAidGuideResponse response = firstAidGuideService.getById(id);
        if (AuthenticationUtils.hasRole(authentication, UserRole.TRAINER)
                && !ContentStatus.PUBLISHED.name().equalsIgnoreCase(response.getStatus())) {
            throw new ResourceNotFoundException("FirstAidGuide", "id", id);
        }
        return ApiResponse.success(response);
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiResponse<FirstAidGuideResponse>> createJson(
            @Valid @RequestBody FirstAidGuideRequest request,
            Authentication authentication
    ) {
        FirstAidGuideResponse response = firstAidGuideService.create(
                request, AuthenticationUtils.extractUserId(authentication), null
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<FirstAidGuideResponse>> createMultipart(
            @Valid @RequestPart("data") FirstAidGuideRequest request,
            @RequestPart(value = "image", required = false) MultipartFile image,
            Authentication authentication
    ) {
        FirstAidGuideResponse response = firstAidGuideService.create(
                request, AuthenticationUtils.extractUserId(authentication), image
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<FirstAidGuideResponse> updateJson(
            @PathVariable("id") Integer id,
            @Valid @RequestBody FirstAidGuideRequest request,
            Authentication authentication
    ) {
        return ApiResponse.success(
                firstAidGuideService.update(id, request, AuthenticationUtils.extractUserId(authentication), null)
        );
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<FirstAidGuideResponse> updateMultipart(
            @PathVariable("id") Integer id,
            @Valid @RequestPart("data") FirstAidGuideRequest request,
            @RequestPart(value = "image", required = false) MultipartFile image,
            Authentication authentication
    ) {
        return ApiResponse.success(
                firstAidGuideService.update(id, request, AuthenticationUtils.extractUserId(authentication), image)
        );
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable("id") Integer id) {
        firstAidGuideService.delete(id);
        return ApiResponse.success(null, "Deleted successfully");
    }
}
