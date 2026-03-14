package vn.edu.fpt.doghandbook.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.doghandbook.backend.config.CustomUserDetails;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.service.SearchService;

@RestController
@RequestMapping("/search")
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;

    @GetMapping
    public ApiResponse<?> search(
            @RequestParam String keyword,
            @RequestParam(required = false) String context,
            Authentication authentication) {
        Integer userId = extractUserId(authentication);
        return ApiResponse.success(searchService.search(keyword, context, userId));
    }

    @GetMapping("/history")
    public ApiResponse<?> getHistory(Authentication authentication) {
        Integer userId = extractUserId(authentication);
        return ApiResponse.success(searchService.getHistory(userId));
    }

    @GetMapping("/suggestions")
    public ApiResponse<?> getSuggestions(
            Authentication authentication,
            @RequestParam(defaultValue = "") String keyword) {
        Integer userId = extractUserId(authentication);
        return ApiResponse.success(searchService.getSuggestions(userId, keyword));
    }

    private Integer extractUserId(Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        return userDetails.getUser().getUserId();
    }
}
