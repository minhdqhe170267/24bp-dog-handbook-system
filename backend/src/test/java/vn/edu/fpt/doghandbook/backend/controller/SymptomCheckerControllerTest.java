package vn.edu.fpt.doghandbook.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import vn.edu.fpt.doghandbook.backend.config.JwtAuthenticationFilter;
import vn.edu.fpt.doghandbook.backend.config.SecurityConfig;
import vn.edu.fpt.doghandbook.backend.dto.request.SymptomCheckerRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.SymptomCheckerResponse;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.service.CustomUserDetailsService;
import vn.edu.fpt.doghandbook.backend.service.SymptomCheckerService;
import vn.edu.fpt.doghandbook.backend.util.JwtUtil;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static vn.edu.fpt.doghandbook.backend.controller.ControllerTestSupport.authenticatedUser;
import static vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.TRAINER;

@WebMvcTest(SymptomCheckerController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class SymptomCheckerControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private SymptomCheckerService symptomCheckerService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void check_authenticatedValidRequest_returns200() throws Exception {
        SymptomCheckerRequest request = new SymptomCheckerRequest();
        request.setSymptomIds(List.of(1, 2));
        request.setAgeMonths(24);

        when(symptomCheckerService.check(any(SymptomCheckerRequest.class))).thenReturn(sampleResponse());

        mockMvc.perform(post("/symptom-checker/check")
                        .with(authenticatedUser(7, TRAINER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.urgencyLevel").value("HIGH"))
                .andExpect(jsonPath("$.data.totalSymptomsChecked").value(2))
                .andExpect(jsonPath("$.data.possibleDiseases[0].diseaseName").value("Parvo"));

        verify(symptomCheckerService).check(any(SymptomCheckerRequest.class));
    }

    @Test
    void check_unauthenticated_returns401() throws Exception {
        SymptomCheckerRequest request = new SymptomCheckerRequest();
        request.setSymptomIds(List.of(1));

        mockMvc.perform(post("/symptom-checker/check")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"));
    }

    @Test
    void check_emptySymptomIds_returns400() throws Exception {
        SymptomCheckerRequest request = new SymptomCheckerRequest();
        request.setSymptomIds(List.of());

        mockMvc.perform(post("/symptom-checker/check")
                        .with(authenticatedUser(7, TRAINER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void check_serviceRejectsRequest_returns400() throws Exception {
        SymptomCheckerRequest request = new SymptomCheckerRequest();
        request.setSymptomIds(List.of(99));

        when(symptomCheckerService.check(any(SymptomCheckerRequest.class)))
                .thenThrow(new BadRequestException("Khong tim thay trieu chung"));

        mockMvc.perform(post("/symptom-checker/check")
                        .with(authenticatedUser(7, TRAINER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BAD_REQUEST"));
    }

    private SymptomCheckerResponse sampleResponse() {
        return SymptomCheckerResponse.builder()
                .urgencyLevel("HIGH")
                .recommendation("Theo doi sat")
                .totalSymptomsChecked(2)
                .possibleDiseases(List.of(
                        SymptomCheckerResponse.DiagnosisResult.builder()
                                .diseaseId(1)
                                .diseaseName("Parvo")
                                .severityLevel("CRITICAL")
                                .matchPercentage(75.0)
                                .matchedSymptoms(2)
                                .totalDiseaseSymptoms(3)
                                .matchedSymptomNames(List.of("Vomiting", "Diarrhea"))
                                .missingSymptomNames(List.of("Fever"))
                                .build()
                ))
                .build();
    }
}
