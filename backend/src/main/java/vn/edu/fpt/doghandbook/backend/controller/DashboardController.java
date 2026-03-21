package vn.edu.fpt.doghandbook.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.DashboardStatsResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.TrainerDashboardStatsResponse;
import vn.edu.fpt.doghandbook.backend.service.DashboardService;
import vn.edu.fpt.doghandbook.backend.util.AuthenticationUtils;

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
    public ApiResponse<TrainerDashboardStatsResponse> getTrainerStats(Authentication authentication) {
        Integer trainerId = AuthenticationUtils.extractUserId(authentication);
        return ApiResponse.success(dashboardService.getTrainerStats(trainerId));
    }
}
