package vn.edu.fpt.doghandbook.backend.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import vn.edu.fpt.doghandbook.backend.config.JwtAuthenticationFilter;
import vn.edu.fpt.doghandbook.backend.config.SecurityConfig;
import vn.edu.fpt.doghandbook.backend.dto.response.AuditLogResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.AuditLogStatsResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.service.AuditLogService;
import vn.edu.fpt.doghandbook.backend.service.CustomUserDetailsService;
import vn.edu.fpt.doghandbook.backend.util.JwtUtil;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static vn.edu.fpt.doghandbook.backend.controller.ControllerTestSupport.authenticatedUser;

@WebMvcTest(AuditLogController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class AuditLogControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuditLogService auditLogService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void getAll_adminReturnsPagedAuditLogs() throws Exception {
        PageResponse<AuditLogResponse> page = PageResponse.<AuditLogResponse>builder()
                .content(List.of(AuditLogResponse.builder()
                        .logId(1L)
                        .username("admin01")
                        .actionType("LOGIN")
                        .description("Login successful")
                        .actionTimestamp(LocalDateTime.of(2026, 3, 21, 10, 0))
                        .build()))
                .page(0)
                .size(20)
                .totalElements(1)
                .totalPages(1)
                .build();
        when(auditLogService.getAll(0, 20, "LOGIN", "USER", 7, "2026-03-01", "2026-03-21")).thenReturn(page);

        mockMvc.perform(get("/audit-logs")
                        .with(authenticatedUser(1, UserRole.ADMIN))
                        .param("actionType", "LOGIN")
                        .param("entityType", "USER")
                        .param("userId", "7")
                        .param("from", "2026-03-01")
                        .param("to", "2026-03-21"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].username").value("admin01"));

        verify(auditLogService).getAll(0, 20, "LOGIN", "USER", 7, "2026-03-01", "2026-03-21");
    }

    @Test
    void getAll_trainerReturns403() throws Exception {
        mockMvc.perform(get("/audit-logs")
                        .with(authenticatedUser(7, UserRole.TRAINER)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));

        verifyNoInteractions(auditLogService);
    }

    @Test
    void getById_adminReturnsSingleAuditLog() throws Exception {
        when(auditLogService.getById(15L)).thenReturn(AuditLogResponse.builder()
                .logId(15L)
                .actionType("UPDATE")
                .description("Setting updated")
                .build());

        mockMvc.perform(get("/audit-logs/15")
                        .with(authenticatedUser(1, UserRole.ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.logId").value(15))
                .andExpect(jsonPath("$.data.actionType").value("UPDATE"));
    }

    @Test
    void getStats_adminReturnsAggregatedMetrics() throws Exception {
        when(auditLogService.getStats()).thenReturn(AuditLogStatsResponse.builder()
                .totalLogs(20)
                .todayLogs(4)
                .thisWeekLogs(12)
                .actionTypeCounts(Map.of("LOGIN", 5L))
                .dailyCounts(List.of(AuditLogStatsResponse.DailyCount.builder()
                        .date("2026-03-21")
                        .count(4L)
                        .build()))
                .build());

        mockMvc.perform(get("/audit-logs/stats")
                        .with(authenticatedUser(1, UserRole.ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalLogs").value(20))
                .andExpect(jsonPath("$.data.todayLogs").value(4))
                .andExpect(jsonPath("$.data.actionTypeCounts.LOGIN").value(5));
    }
}
