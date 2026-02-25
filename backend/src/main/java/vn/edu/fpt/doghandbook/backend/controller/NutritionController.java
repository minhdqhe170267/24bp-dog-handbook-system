package vn.edu.fpt.doghandbook.backend.controller;

import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/nutrition-standards")
public class NutritionController {

    @GetMapping
    public ApiResponse<?> getAllStandards() {
        List<Map<String, Object>> standards = List.of(
                Map.of("standardId", 1, "rationCode", "BS-001",
                        "rationName", "Khẩu phần Berger trưởng thành",
                        "activityLevel", "HIGH",
                        "metadata", Map.of("dailyCalories", 2100, "proteinG", 115,
                                "ingredients", List.of("Thịt gà", "Gạo", "Rau xanh")),
                        "status", "PUBLISHED"),
                Map.of("standardId", 2, "rationCode", "MS-001",
                        "rationName", "Khẩu phần Malinois hoạt động cao",
                        "activityLevel", "VERY_HIGH",
                        "metadata", Map.of("dailyCalories", 2400, "proteinG", 130,
                                "ingredients", List.of("Thịt bò", "Khoai lang", "Trứng")),
                        "status", "PUBLISHED")
        );
        return ApiResponse.success(PageResponse.builder()
                .content(standards)
                .page(0).size(10).totalElements(2).totalPages(1)
                .build());
    }

    @PostMapping("/calculate")
    public ApiResponse<?> calculateNutrition(@RequestBody Map<String, Object> request) {
        return ApiResponse.success(Map.of(
                "dailyCalories", 2150,
                "proteinG", 118,
                "fatG", 75,
                "carbG", 195,
                "weightStatus", "NORMAL",
                "recommendation", "Cân nặng trong chuẩn. Duy trì khẩu phần hiện tại.",
                "suggestedRation", Map.of("standardId", 1, "rationName", "Khẩu phần Berger trưởng thành")
        ));
    }
}
