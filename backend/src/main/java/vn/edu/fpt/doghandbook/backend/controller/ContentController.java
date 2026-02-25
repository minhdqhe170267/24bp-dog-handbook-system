package vn.edu.fpt.doghandbook.backend.controller;

import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/contents")
public class ContentController {

    @GetMapping
    public ApiResponse<?> getAllContents() {
        List<Map<String, Object>> contents = List.of(
                Map.of("contentId", 1, "title", "Hướng dẫn chăm sóc Berger",
                        "contentType", "BREED_INFO", "status", "PUBLISHED",
                        "createdBy", "editor01", "viewCount", 152),
                Map.of("contentId", 2, "title", "Bài tập tuần tra nâng cao",
                        "contentType", "TRAINING_GUIDE", "status", "DRAFT",
                        "createdBy", "editor01", "viewCount", 0)
        );
        return ApiResponse.success(PageResponse.builder()
                .content(contents)
                .page(0).size(10).totalElements(2).totalPages(1)
                .build());
    }
}
