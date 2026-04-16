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
import vn.edu.fpt.doghandbook.backend.dto.request.DogWeightRecordRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.DogWeightRecordResponse;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.service.CustomUserDetailsService;
import vn.edu.fpt.doghandbook.backend.service.DogWeightRecordService;
import vn.edu.fpt.doghandbook.backend.util.JwtUtil;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static vn.edu.fpt.doghandbook.backend.controller.ControllerTestSupport.authenticatedUser;
import static vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.CONTENT_EDITOR;
import static vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.TRAINER;

@WebMvcTest(DogWeightRecordController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class DogWeightRecordControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DogWeightRecordService dogWeightRecordService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void create_trainerRole_returns201AndPassesUserId() throws Exception {
        when(dogWeightRecordService.create(any(DogWeightRecordRequest.class), eq(7))).thenReturn(sampleResponse());

        mockMvc.perform(post("/dog-weight-records")
                        .with(authenticatedUser(7, TRAINER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequestJson(5)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.assessmentId").value(1))
                .andExpect(jsonPath("$.data.status").value("NORMAL"));

        verify(dogWeightRecordService).create(any(DogWeightRecordRequest.class), eq(7));
    }

    @Test
    void create_contentEditorRole_returns403() throws Exception {
        mockMvc.perform(post("/dog-weight-records")
                        .with(authenticatedUser(2, CONTENT_EDITOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequestJson(5)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));

        verify(dogWeightRecordService, never()).create(any(), any());
    }

    @Test
    void create_invalidPayload_returns400() throws Exception {
        DogWeightRecordRequest request = new DogWeightRecordRequest();
        request.setDogId(5);

        mockMvc.perform(post("/dog-weight-records")
                        .with(authenticatedUser(7, TRAINER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"dogId\":5}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void create_missingDog_returns404() throws Exception {
        when(dogWeightRecordService.create(any(DogWeightRecordRequest.class), eq(7)))
                .thenThrow(new ResourceNotFoundException("Dog", "id", 99));

        mockMvc.perform(post("/dog-weight-records")
                        .with(authenticatedUser(7, TRAINER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequestJson(99)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));
    }

    private String validRequestJson(int dogId) {
        return """
                {
                  "dogId": %d,
                  "recordedWeightKg": 28.5,
                  "standardMinKg": 26.0,
                  "standardMaxKg": 30.0,
                  "status": "NORMAL",
                  "deviationPercent": 0.0,
                  "recommendation": "Maintain current diet",
                  "followUpWeeks": 4,
                  "assessedAt": "2026-04-08T09:00:00"
                }
                """.formatted(dogId);
    }

    private DogWeightRecordResponse sampleResponse() {
        return DogWeightRecordResponse.builder()
                .assessmentId(1)
                .dogId(5)
                .dogName("Rex")
                .dogCode("DOG001")
                .assessorId(7)
                .assessorName("Trainer Seven")
                .recordedWeightKg(new BigDecimal("28.5"))
                .standardMinKg(new BigDecimal("26.0"))
                .standardMaxKg(new BigDecimal("30.0"))
                .status("NORMAL")
                .deviationPercent(new BigDecimal("0.0"))
                .recommendation("Maintain current diet")
                .followUpWeeks(4)
                .assessedAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }
}
