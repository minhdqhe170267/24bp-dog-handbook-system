package vn.edu.fpt.doghandbook.backend.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import vn.edu.fpt.doghandbook.backend.config.JwtAuthenticationFilter;
import vn.edu.fpt.doghandbook.backend.config.SecurityConfig;
import vn.edu.fpt.doghandbook.backend.dto.response.DashboardStatsResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.TrainerDashboardStatsResponse;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.service.CustomUserDetailsService;
import vn.edu.fpt.doghandbook.backend.service.DashboardService;
import vn.edu.fpt.doghandbook.backend.util.JwtUtil;

import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static vn.edu.fpt.doghandbook.backend.controller.ControllerTestSupport.authenticatedUser;

@WebMvcTest(DashboardController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class DashboardControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DashboardService dashboardService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void getStats_authenticatedReturnsDashboardStats() throws Exception {
        when(dashboardService.getStats()).thenReturn(DashboardStatsResponse.builder()
                .totalBreeds(12)
                .totalExercises(8)
                .pendingReviewsCount(3)
                .recentActivities(List.of())
                .build());

        mockMvc.perform(get("/dashboard/stats")
                        .with(authenticatedUser(1, UserRole.ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalBreeds").value(12))
                .andExpect(jsonPath("$.data.pendingReviewsCount").value(3));
    }

    @Test
    void getStats_unauthenticatedReturns401() throws Exception {
        mockMvc.perform(get("/dashboard/stats"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"));
    }

    @Test
    void getTrainerStats_authenticatedExtractsUserId() throws Exception {
        when(dashboardService.getTrainerStats(7)).thenReturn(TrainerDashboardStatsResponse.builder()
                .assignedDogs(List.of(TrainerDashboardStatsResponse.AssignedDogItem.builder()
                        .dogId(3)
                        .dogCode("DK003")
                        .dogName("Rex")
                        .build()))
                .totalFieldNotes(5)
                .totalReports(2)
                .build());

        mockMvc.perform(get("/dashboard/trainer-stats")
                        .with(authenticatedUser(7, UserRole.TRAINER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.assignedDogs[0].dogCode").value("DK003"))
                .andExpect(jsonPath("$.data.totalFieldNotes").value(5))
                .andExpect(jsonPath("$.data.totalReports").value(2));

        verify(dashboardService).getTrainerStats(7);
    }
}
