package vn.edu.fpt.doghandbook.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.DashboardStatsResponse;
import vn.edu.fpt.doghandbook.backend.service.DashboardService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/stats")
    public ApiResponse<DashboardStatsResponse> getStats() {
        return ApiResponse.success(dashboardService.getStats());
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
