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
import vn.edu.fpt.doghandbook.backend.dto.request.ContentRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.ContentResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.service.ContentService;
import vn.edu.fpt.doghandbook.backend.util.AuthenticationUtils;

@RestController
@RequestMapping("/contents")
@RequiredArgsConstructor
public class ContentController {

    private final ContentService contentService;

    @GetMapping
    public ApiResponse<PageResponse<ContentResponse>> getAll(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size,
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "contentType", required = false) String contentType,
            @RequestParam(value = "type", required = false) String legacyType,
            @RequestParam(value = "status", required = false) String status,
            Authentication authentication
    ) {
        String effectiveType = contentType != null ? contentType : legacyType;
        String effectiveStatus = AuthenticationUtils.hasRole(authentication, UserRole.TRAINER)
                ? ContentStatus.PUBLISHED.name()
                : status;
        return ApiResponse.success(contentService.getAll(page, size, search, effectiveType, effectiveStatus));
    }

    @GetMapping("/{id}")
    public ApiResponse<ContentResponse> getById(@PathVariable("id") Integer id, Authentication authentication) {
        ContentResponse response = contentService.getById(id);
        if (AuthenticationUtils.hasRole(authentication, UserRole.TRAINER)
                && !ContentStatus.PUBLISHED.name().equalsIgnoreCase(response.getStatus())) {
            throw new ResourceNotFoundException("Content", "id", id);
        }
        return ApiResponse.success(response);
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ContentResponse>> create(
            @Valid @RequestBody ContentRequest request,
            Authentication authentication
    ) {
        ContentResponse response = contentService.create(request, AuthenticationUtils.extractUserId(authentication));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @PutMapping("/{id}")
    public ApiResponse<ContentResponse> update(
            @PathVariable("id") Integer id,
            @Valid @RequestBody ContentRequest request,
            Authentication authentication
    ) {
        return ApiResponse.success(contentService.update(id, request, AuthenticationUtils.extractUserId(authentication)));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable("id") Integer id) {
        contentService.delete(id);
        return ApiResponse.success(null);
    }

    @PutMapping("/{id}/submit")
    public ApiResponse<ContentResponse> submitForReview(@PathVariable("id") Integer id) {
        return ApiResponse.success(contentService.submitForReview(id));
    }

    @PutMapping("/{id}/publish")
    public ApiResponse<ContentResponse> publish(@PathVariable("id") Integer id) {
        return ApiResponse.success(contentService.publish(id));
    }

    @PutMapping("/{id}/unpublish")
    public ApiResponse<ContentResponse> unpublish(@PathVariable("id") Integer id) {
        return ApiResponse.success(contentService.unpublish(id));
    }
}
