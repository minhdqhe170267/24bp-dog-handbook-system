package vn.edu.fpt.doghandbook.backend.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import vn.edu.fpt.doghandbook.backend.config.JwtAuthenticationFilter;
import vn.edu.fpt.doghandbook.backend.config.SecurityConfig;
import vn.edu.fpt.doghandbook.backend.dto.request.HealthSessionRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.SessionFollowUpRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.FollowUpItemResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.HealthSessionResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.service.CustomUserDetailsService;
import vn.edu.fpt.doghandbook.backend.service.HealthSessionService;
import vn.edu.fpt.doghandbook.backend.util.JwtUtil;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static vn.edu.fpt.doghandbook.backend.controller.ControllerTestSupport.authenticatedUser;
import static vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.ADMIN;
import static vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.CONTENT_EDITOR;
import static vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.TRAINER;

@WebMvcTest(HealthSessionController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class HealthSessionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private HealthSessionService healthSessionService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void create_trainerRole_returns201AndPassesUserId() throws Exception {
        when(healthSessionService.create(any(HealthSessionRequest.class), eq(7))).thenReturn(sampleResponse());

        mockMvc.perform(post("/health-sessions")
                        .with(authenticatedUser(7, TRAINER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createRequestJson()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.sessionId").value(1))
                .andExpect(jsonPath("$.data.issueSummary").value("Vomiting and lethargy"));

        verify(healthSessionService).create(any(HealthSessionRequest.class), eq(7));
    }

    @Test
    void create_invalidPayload_returns400() throws Exception {
        mockMvc.perform(post("/health-sessions")
                        .with(authenticatedUser(7, TRAINER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"dogId\":5}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void getById_found_returns200() throws Exception {
        when(healthSessionService.getById(1)).thenReturn(sampleResponse());

        mockMvc.perform(get("/health-sessions/1")
                        .with(authenticatedUser(7, TRAINER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sessionId").value(1))
                .andExpect(jsonPath("$.data.followUps[0].statusUpdate").value("IMPROVED"));
    }

    @Test
    void getById_notFound_returns404() throws Exception {
        when(healthSessionService.getById(99)).thenThrow(new ResourceNotFoundException("HealthSession", "id", 99));

        mockMvc.perform(get("/health-sessions/99")
                        .with(authenticatedUser(7, TRAINER)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));
    }

    @Test
    void getByTrainer_my_returns200AndUsesUserId() throws Exception {
        when(healthSessionService.getByTrainer(7, 0, 10)).thenReturn(samplePage());

        mockMvc.perform(get("/health-sessions/my")
                        .with(authenticatedUser(7, TRAINER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].trainerId").value(7));

        verify(healthSessionService).getByTrainer(7, 0, 10);
    }

    @Test
    void getByDog_adminRole_returns200() throws Exception {
        when(healthSessionService.getByDog(5, 0, 10)).thenReturn(samplePage());

        mockMvc.perform(get("/health-sessions/by-dog/5")
                        .with(authenticatedUser(1, ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].dogId").value(5));
    }

    @Test
    void addFollowUp_trainerRole_returns201AndInjectsSessionId() throws Exception {
        when(healthSessionService.addFollowUp(any(SessionFollowUpRequest.class), eq(7))).thenReturn(sampleResponse());

        mockMvc.perform(post("/health-sessions/1/follow-up")
                        .with(authenticatedUser(7, TRAINER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(followUpRequestJson()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.followUps[0].nextAction").value("Continue monitoring"));

        verify(healthSessionService).addFollowUp(
                argThat(request -> request.getSessionId() == 1 && "IMPROVED".equals(request.getStatusUpdate())),
                eq(7)
        );
    }

    @Test
    void addFollowUp_invalidPayload_returns400() throws Exception {
        mockMvc.perform(post("/health-sessions/1/follow-up")
                        .with(authenticatedUser(7, TRAINER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"notes\":\"missing status\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void resolve_adminRole_returns200AndPassesActorId() throws Exception {
        when(healthSessionService.resolve(eq(1), eq("Recovered"), eq(1), any(LocalDateTime.class)))
                .thenReturn(sampleResponse());

        mockMvc.perform(put("/health-sessions/1/resolve")
                        .with(authenticatedUser(1, ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(resolveRequestJson()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));

        verify(healthSessionService).resolve(eq(1), eq("Recovered"), eq(1), any(LocalDateTime.class));
    }

    @Test
    void resolve_contentEditorRole_returns403() throws Exception {
        mockMvc.perform(put("/health-sessions/1/resolve")
                        .with(authenticatedUser(2, CONTENT_EDITOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(resolveRequestJson()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));

        verify(healthSessionService, never()).resolve(any(), any(), any(), any());
    }

    private String createRequestJson() {
        return """
                {
                  "dogId": 5,
                  "issueSummary": "Vomiting and lethargy",
                  "initialDiagnosisId": 2,
                  "severity": "HIGH",
                  "followUpDate": "2026-04-10",
                  "localUpdatedAt": "2026-04-08T11:00:00"
                }
                """;
    }

    private String followUpRequestJson() {
        return """
                {
                  "sessionId": 1,
                  "statusUpdate": "IMPROVED",
                  "notes": "Responding well",
                  "weightKg": 28.2,
                  "temperatureC": 38.4,
                  "nextAction": "Continue monitoring",
                  "localUpdatedAt": "2026-04-08T12:00:00"
                }
                """;
    }

    private String resolveRequestJson() {
        return """
                {
                  "resolutionNotes": "Recovered",
                  "localUpdatedAt": "2026-04-08T13:00:00"
                }
                """;
    }

    private HealthSessionResponse sampleResponse() {
        return HealthSessionResponse.builder()
                .sessionId(1)
                .dogId(5)
                .dogName("Rex")
                .dogCode("DOG001")
                .trainerId(7)
                .trainerName("Trainer One")
                .issueSummary("Vomiting and lethargy")
                .initialDiagnosisId(2)
                .status("ACTIVE")
                .severity("HIGH")
                .startedAt(LocalDateTime.now())
                .lastUpdateAt(LocalDateTime.now())
                .followUpDate(LocalDate.of(2026, 4, 10))
                .followUps(List.of(
                        FollowUpItemResponse.builder()
                                .followupId(11)
                                .followupDate(LocalDateTime.now())
                                .statusUpdate("IMPROVED")
                                .notes("Responding well")
                                .weightKg(new BigDecimal("28.2"))
                                .temperatureC(new BigDecimal("38.4"))
                                .nextAction("Continue monitoring")
                                .build()
                ))
                .build();
    }

    private PageResponse<HealthSessionResponse> samplePage() {
        return PageResponse.<HealthSessionResponse>builder()
                .content(List.of(sampleResponse()))
                .page(0)
                .size(10)
                .totalElements(1)
                .totalPages(1)
                .build();
    }
}
