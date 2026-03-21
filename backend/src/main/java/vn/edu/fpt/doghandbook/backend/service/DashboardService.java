package vn.edu.fpt.doghandbook.backend.service;

import vn.edu.fpt.doghandbook.backend.dto.response.DashboardStatsResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.TrainerDashboardStatsResponse;

public interface DashboardService {

    DashboardStatsResponse getStats();

    TrainerDashboardStatsResponse getTrainerStats(Integer trainerId);
}
