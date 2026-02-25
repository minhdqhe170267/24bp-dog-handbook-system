package vn.edu.fpt.doghandbook.backend.controller;

import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/exercises")
public class ExerciseController {

    @GetMapping
    public ApiResponse<?> getAllExercises() {
        List<Map<String, Object>> exercises = List.of(
                Map.of("exerciseId", 1, "exerciseName", "Ngồi theo lệnh",
                        "difficultyLevel", "BASIC", "durationMinutes", 15, "status", "PUBLISHED"),
                Map.of("exerciseId", 2, "exerciseName", "Nằm theo lệnh",
                        "difficultyLevel", "BASIC", "durationMinutes", 15, "status", "PUBLISHED"),
                Map.of("exerciseId", 3, "exerciseName", "Tuần tra cơ bản",
                        "difficultyLevel", "INTERMEDIATE", "durationMinutes", 45, "status", "PUBLISHED")
        );
        return ApiResponse.success(PageResponse.builder()
                .content(exercises)
                .page(0).size(10).totalElements(3).totalPages(1)
                .build());
    }

    @GetMapping("/{id}")
    public ApiResponse<?> getExerciseById(@PathVariable int id) {
        return ApiResponse.success(Map.ofEntries(
                Map.entry("exerciseId", 1),
                Map.entry("exerciseName", "Ngồi theo lệnh"),
                Map.entry("description", "Bài tập cơ bản yêu cầu chó ngồi và giữ tư thế theo lệnh của huấn luyện viên"),
                Map.entry("difficultyLevel", "BASIC"),
                Map.entry("methodId", 1),
                Map.entry("instructions", "1. Đứng trước chó. 2. Ra lệnh 'Ngồi'. 3. Ấn nhẹ phần hông xuống. 4. Thưởng khi thực hiện đúng."),
                Map.entry("durationMinutes", 15),
                Map.entry("safetyPrecautions", "Không ép chó quá mức. Dừng nếu chó tỏ ra căng thẳng."),
                Map.entry("requiredEquipment", "Dây dắt, phần thưởng"),
                Map.entry("status", "PUBLISHED")
        ));
    }
}
