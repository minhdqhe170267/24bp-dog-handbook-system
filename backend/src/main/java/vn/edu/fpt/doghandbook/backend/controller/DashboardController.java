package vn.edu.fpt.doghandbook.backend.controller;

import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/dashboard")
public class DashboardController {

    @GetMapping("/stats")
    public ApiResponse<?> getStats() {
        return ApiResponse.success(Map.of(
                "totalBreeds", 12,
                "totalExercises", 25,
                "totalDogs", 40,
                "totalUsers", 15,
                "pendingReviews", 3
        ));
    }

    @GetMapping("/trainer-stats")
    public ApiResponse<?> getTrainerStats() {
        return ApiResponse.success(Map.of(
                "assignedDogs", List.of(
                        Map.of("dogId", 1, "dogName", "Rex", "breedName", "Berger Đức"),
                        Map.of("dogId", 2, "dogName", "Max", "breedName", "Malinois")
                ),
                "totalFieldNotes", 15,
                "totalReports", 8
        ));
    }
}
