package vn.edu.fpt.doghandbook.backend.service;

import vn.edu.fpt.doghandbook.backend.dto.response.DashboardStatsResponse;

public interface DashboardService {

    DashboardStatsResponse getStats();
}
