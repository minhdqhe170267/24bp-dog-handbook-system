package vn.edu.fpt.doghandbook.backend.controller;

import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/breeds")
public class BreedController {

    @GetMapping
    public ApiResponse<?> getAllBreeds() {
        List<Map<String, Object>> breeds = List.of(
                Map.of("breedId", 1, "breedName", "Berger Đức", "sizeClassification", "LARGE",
                        "weightMaleMinKg", 30, "weightMaleMaxKg", 40, "trainabilityLevel", "VERY_HIGH", "status", "PUBLISHED"),
                Map.of("breedId", 2, "breedName", "Malinois", "sizeClassification", "LARGE",
                        "weightMaleMinKg", 29, "weightMaleMaxKg", 34, "trainabilityLevel", "VERY_HIGH", "status", "PUBLISHED"),
                Map.of("breedId", 3, "breedName", "Rottweiler", "sizeClassification", "LARGE",
                        "weightMaleMinKg", 50, "weightMaleMaxKg", 60, "trainabilityLevel", "HIGH", "status", "PUBLISHED")
        );
        return ApiResponse.success(PageResponse.builder()
                .content(breeds)
                .page(0).size(10).totalElements(3).totalPages(1)
                .build());
    }

    @GetMapping("/{id}")
    public ApiResponse<?> getBreedById(@PathVariable int id) {
        return ApiResponse.success(Map.ofEntries(
                Map.entry("breedId", 1),
                Map.entry("breedName", "Berger Đức"),
                Map.entry("origin", "Đức"),
                Map.entry("description", "Chó cảnh sát, quân sự đa năng nổi tiếng thế giới. Thông minh, trung thành và dễ huấn luyện."),
                Map.entry("sizeClassification", "LARGE"),
                Map.entry("weightMaleMinKg", 30),
                Map.entry("weightMaleMaxKg", 40),
                Map.entry("weightFemaleMinKg", 22),
                Map.entry("weightFemaleMaxKg", 32),
                Map.entry("avgHeightCm", 62.5),
                Map.entry("lifespanYears", "9-13"),
                Map.entry("trainabilityLevel", "VERY_HIGH"),
                Map.entry("operationalCapabilities", "Tuần tra, phát hiện ma túy, tìm kiếm cứu nạn"),
                Map.entry("imageUrl", "https://example.com/breeds/berger.jpg"),
                Map.entry("status", "PUBLISHED")
        ));
    }

    @PostMapping("/compare")
    public ApiResponse<?> compareBreeds(@RequestBody Map<String, Object> request) {
        return ApiResponse.success(List.of(
                Map.of("breedId", 1, "breedName", "Berger Đức", "trainabilityLevel", "VERY_HIGH",
                        "weightMaleMinKg", 30, "weightMaleMaxKg", 40),
                Map.of("breedId", 2, "breedName", "Malinois", "trainabilityLevel", "VERY_HIGH",
                        "weightMaleMinKg", 29, "weightMaleMaxKg", 34)
        ));
    }
}
