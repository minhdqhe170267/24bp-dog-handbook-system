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
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.service.ContentService;

import java.util.Locale;

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
            @RequestParam(value = "type", required = false) String type,
            @RequestParam(value = "status", required = false) String status
    ) {
        return ApiResponse.success(contentService.getAll(page, size, search, type, status));
    }

    @GetMapping("/{id}")
    public ApiResponse<ContentResponse> getById(@PathVariable("id") Integer id) {
        return ApiResponse.success(contentService.getById(id));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ContentResponse>> create(
            @Valid @RequestBody ContentRequest request,
            Authentication authentication
    ) {
        ContentResponse response = contentService.create(request, extractUserId(authentication));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @PutMapping("/{id}")
    public ApiResponse<ContentResponse> update(
            @PathVariable("id") Integer id,
            @Valid @RequestBody ContentRequest request
    ) {
        return ApiResponse.success(contentService.update(id, request));
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

    private Integer extractUserId(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new BadRequestException("Unable to resolve authenticated user");
        }

        Object principal = authentication.getPrincipal();

        try {
            Object value = principal.getClass().getMethod("getUserId").invoke(principal);
            if (value instanceof Number number) {
                return number.intValue();
            }
        } catch (ReflectiveOperationException ignored) {
        }

        if (principal instanceof Number number) {
            return number.intValue();
        }

        if (principal instanceof String text) {
            try {
                return Integer.valueOf(text.trim());
            } catch (NumberFormatException ignored) {
                if ("anonymousUser".equals(text.toLowerCase(Locale.ROOT))) {
                    throw new BadRequestException("Unable to resolve authenticated user");
                }
            }
        }

        throw new BadRequestException("Unable to resolve userId from authentication principal");
    }
}
