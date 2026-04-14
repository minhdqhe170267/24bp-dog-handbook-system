package vn.edu.fpt.doghandbook.backend.controller;

import jakarta.validation.Valid;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.fpt.doghandbook.backend.dto.request.ContentSuggestionRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.ContentSuggestionResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.service.ContentSuggestionService;

import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/suggestions")
@RequiredArgsConstructor
public class ContentSuggestionController {

    private final ContentSuggestionService contentSuggestionService;

    @GetMapping
    public ApiResponse<PageResponse<ContentSuggestionResponse>> getAll(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size,
            @RequestParam(value = "status", required = false) String status
    ) {
        return ApiResponse.success(contentSuggestionService.getAll(page, size, status));
    }

    @GetMapping("/{id}")
    public ApiResponse<ContentSuggestionResponse> getById(@PathVariable("id") Integer id) {
        return ApiResponse.success(contentSuggestionService.getById(id));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ContentSuggestionResponse>> submit(
            @Valid @RequestBody ContentSuggestionRequest request,
            Authentication authentication
    ) {
        ContentSuggestionResponse response =
                contentSuggestionService.submit(request, extractUserId(authentication));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @PutMapping("/{id}/respond")
    public ApiResponse<ContentSuggestionResponse> respond(
            @PathVariable("id") Integer suggestionId,
            @RequestBody SuggestionRespondRequest request,
            Authentication authentication
    ) {
        Integer reviewerId = extractUserId(authentication);
        return ApiResponse.success(contentSuggestionService.respond(
                suggestionId,
                request.getAdminResponse(),
                request.getStatus(),
                reviewerId,
                request.getLocalUpdatedAt()
        ));
    }

    @GetMapping("/my")
    public ApiResponse<List<ContentSuggestionResponse>> getMySubmissions(Authentication authentication) {
        Integer trainerId = extractUserId(authentication);
        return ApiResponse.success(contentSuggestionService.getMySubmissions(trainerId));
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

    @Getter
    @Setter
    public static class SuggestionRespondRequest {
        private String adminResponse;
        private String status;
        private java.time.LocalDateTime localUpdatedAt;
    }
}
