package vn.edu.fpt.doghandbook.backend.controller;

import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/sync")
public class SyncController {

    @GetMapping("/pull")
    public ApiResponse<?> pullData() {
        return ApiResponse.success(Map.of(
                "breeds", List.of(
                        Map.of("breedId", 1, "breedName", "Berger Đức", "status", "PUBLISHED"),
                        Map.of("breedId", 2, "breedName", "Malinois", "status", "PUBLISHED"),
                        Map.of("breedId", 3, "breedName", "Rottweiler", "status", "PUBLISHED")
                ),
                "exercises", List.of(
                        Map.of("exerciseId", 1, "exerciseName", "Ngồi theo lệnh", "difficultyLevel", "BASIC"),
                        Map.of("exerciseId", 2, "exerciseName", "Nằm theo lệnh", "difficultyLevel", "BASIC"),
                        Map.of("exerciseId", 3, "exerciseName", "Tuần tra cơ bản", "difficultyLevel", "INTERMEDIATE")
                ),
                "diseases", List.of(
                        Map.of("diseaseId", 1, "diseaseName", "Parvo", "severityLevel", "CRITICAL"),
                        Map.of("diseaseId", 2, "diseaseName", "Viêm dạ dày ruột", "severityLevel", "MEDIUM"),
                        Map.of("diseaseId", 3, "diseaseName", "Viêm da", "severityLevel", "LOW")
                ),
                "syncTimestamp", "2026-02-25T10:00:00"
        ));
    }
}
