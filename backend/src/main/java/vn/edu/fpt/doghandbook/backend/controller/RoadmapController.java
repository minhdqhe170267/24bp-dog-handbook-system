package vn.edu.fpt.doghandbook.backend.controller;

import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/roadmaps")
public class RoadmapController {

    @GetMapping
    public ApiResponse<?> getAllRoadmaps() {
        List<Map<String, Object>> roadmaps = List.of(
                Map.of("roadmapId", 1, "roadmapName", "Lộ trình tuần tra Berger 24 tuần",
                        "breedId", 1, "totalDurationWeeks", 24,
                        "targetRole", "Tuần tra", "status", "PUBLISHED"),
                Map.of("roadmapId", 2, "roadmapName", "Lộ trình phát hiện ma túy 32 tuần",
                        "totalDurationWeeks", 32,
                        "targetRole", "Phát hiện ma túy", "status", "PUBLISHED")
        );
        return ApiResponse.success(PageResponse.builder()
                .content(roadmaps)
                .page(0).size(10).totalElements(2).totalPages(1)
                .build());
    }
}
