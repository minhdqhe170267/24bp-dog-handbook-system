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
import vn.edu.fpt.doghandbook.backend.dto.request.HealthRecordRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.HealthRecordResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.service.CustomUserDetailsService;
import vn.edu.fpt.doghandbook.backend.service.HealthRecordService;
import vn.edu.fpt.doghandbook.backend.util.JwtUtil;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static vn.edu.fpt.doghandbook.backend.controller.ControllerTestSupport.authenticatedUser;
import static vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.ADMIN;
import static vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.TRAINER;

@WebMvcTest(HealthRecordController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class HealthRecordControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private HealthRecordService healthRecordService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void getAll_authenticated_returns200() throws Exception {
        when(healthRecordService.getAll(0, 10)).thenReturn(samplePage());

        mockMvc.perform(get("/health-records")
                        .with(authenticatedUser(1, TRAINER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].dogCode").value("DOG001"));
    }

    @Test
    void getAll_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/health-records"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"));
    }

    @Test
    void getByDog_authenticated_returns200() throws Exception {
        when(healthRecordService.getByDog(5, 0, 10)).thenReturn(samplePage());

        mockMvc.perform(get("/health-records/by-dog/5")
                        .with(authenticatedUser(1, TRAINER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].dogId").value(5));
    }

    @Test
    void getById_found_returns200() throws Exception {
        when(healthRecordService.getById(1)).thenReturn(sampleResponse());

        mockMvc.perform(get("/health-records/1")
                        .with(authenticatedUser(1, TRAINER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.recordId").value(1))
                .andExpect(jsonPath("$.data.examinerName").value("Trainer One"));
    }

    @Test
    void getById_notFound_returns404() throws Exception {
        when(healthRecordService.getById(99)).thenThrow(new ResourceNotFoundException("HealthRecord", "id", 99));

        mockMvc.perform(get("/health-records/99")
                        .with(authenticatedUser(1, TRAINER)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));
    }

    @Test
    void create_trainerRole_returns201AndPassesUserId() throws Exception {
        when(healthRecordService.create(any(HealthRecordRequest.class), eq(7))).thenReturn(sampleResponse());

        mockMvc.perform(post("/health-records")
                        .with(authenticatedUser(7, TRAINER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequestJson()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.recordId").value(1))
                .andExpect(jsonPath("$.data.diagnosis").value("Mild dehydration"));

        verify(healthRecordService).create(any(HealthRecordRequest.class), eq(7));
    }

    @Test
    void create_invalidPayload_returns400() throws Exception {
        mockMvc.perform(post("/health-records")
                        .with(authenticatedUser(7, TRAINER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void update_adminRole_returns200() throws Exception {
        HealthRecordResponse updated = sampleResponse();
        updated.setDiagnosis("Recovered");
        when(healthRecordService.update(eq(1), any(HealthRecordRequest.class), eq(1))).thenReturn(updated);

        mockMvc.perform(put("/health-records/1")
                        .with(authenticatedUser(1, ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequestJson()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.diagnosis").value("Recovered"));
    }

    @Test
    void update_notFound_returns404() throws Exception {
        when(healthRecordService.update(eq(99), any(HealthRecordRequest.class), eq(1)))
                .thenThrow(new ResourceNotFoundException("HealthRecord", "id", 99));

        mockMvc.perform(put("/health-records/99")
                        .with(authenticatedUser(1, ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequestJson()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));
    }

    private String validRequestJson() {
        return """
                {
                  "dogId": 5,
                  "weightKg": 28.5,
                  "temperatureC": 38.6,
                  "fecesStatus": "NORMAL",
                  "appetiteLevel": "DECREASED",
                  "activityLevel": "LOW",
                  "observedSymptoms": "Vomiting",
                  "diagnosis": "Mild dehydration",
                  "treatmentGiven": "Oral rehydration",
                  "nextCheckupDate": "2026-04-15",
                  "notes": "Monitor appetite",
                  "localUpdatedAt": "2026-04-08T10:00:00"
                }
                """;
    }

    private HealthRecordResponse sampleResponse() {
        return HealthRecordResponse.builder()
                .recordId(1)
                .dogId(5)
                .dogName("Rex")
                .dogCode("DOG001")
                .examinerId(7)
                .examinerName("Trainer One")
                .examinationDate(LocalDateTime.now())
                .weightKg(new BigDecimal("28.5"))
                .temperatureC(new BigDecimal("38.6"))
                .fecesStatus("NORMAL")
                .appetiteLevel("DECREASED")
                .activityLevel("LOW")
                .observedSymptoms("Vomiting")
                .diagnosis("Mild dehydration")
                .treatmentGiven("Oral rehydration")
                .nextCheckupDate(LocalDate.of(2026, 4, 15))
                .notes("Monitor appetite")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    private PageResponse<HealthRecordResponse> samplePage() {
        return PageResponse.<HealthRecordResponse>builder()
                .content(List.of(sampleResponse()))
                .page(0)
                .size(10)
                .totalElements(1)
                .totalPages(1)
                .build();
    }
}
