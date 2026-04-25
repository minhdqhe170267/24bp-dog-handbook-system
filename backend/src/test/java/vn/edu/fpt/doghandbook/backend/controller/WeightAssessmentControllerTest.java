package vn.edu.fpt.doghandbook.backend.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import vn.edu.fpt.doghandbook.backend.config.JwtAuthenticationFilter;
import vn.edu.fpt.doghandbook.backend.config.SecurityConfig;
import vn.edu.fpt.doghandbook.backend.dto.response.WeightAssessmentResponse;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.service.CustomUserDetailsService;
import vn.edu.fpt.doghandbook.backend.service.WeightAssessmentService;
import vn.edu.fpt.doghandbook.backend.util.JwtUtil;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static vn.edu.fpt.doghandbook.backend.controller.ControllerTestSupport.authenticatedUser;
import static vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.ADMIN;
import static vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.CONTENT_EDITOR;

@WebMvcTest(WeightAssessmentController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class WeightAssessmentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private WeightAssessmentService weightAssessmentService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void assess_adminRole_returns200() throws Exception {
        when(weightAssessmentService.assess(5)).thenReturn(sampleResponse());

        mockMvc.perform(get("/weight-assessment/5")
                        .with(authenticatedUser(1, ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.dogId").value(5))
                .andExpect(jsonPath("$.data.weightStatus").value("NORMAL"))
                .andExpect(jsonPath("$.data.recentHistory[0].weightKg").value(28.0));
    }

    @Test
    void assess_notFound_returns404() throws Exception {
        when(weightAssessmentService.assess(99)).thenThrow(new ResourceNotFoundException("Dog", "id", 99));

        mockMvc.perform(get("/weight-assessment/99")
                        .with(authenticatedUser(1, ADMIN)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));
    }

    @Test
    void assess_contentEditorRole_returns403() throws Exception {
        mockMvc.perform(get("/weight-assessment/5")
                        .with(authenticatedUser(2, CONTENT_EDITOR)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));
    }

    private WeightAssessmentResponse sampleResponse() {
        return WeightAssessmentResponse.builder()
                .dogId(5)
                .dogName("Rex")
                .dogCode("DOG001")
                .breedName("German Shepherd")
                .currentWeightKg(new BigDecimal("28.5"))
                .ageMonths(24)
                .gender("MALE")
                .standardMinKg(new BigDecimal("26.0"))
                .standardMaxKg(new BigDecimal("30.0"))
                .deviationPercent(new BigDecimal("0.0"))
                .weightStatus("NORMAL")
                .trend("STABLE")
                .weightChangeKg(new BigDecimal("0.5"))
                .recentHistory(List.of(
                        WeightAssessmentResponse.WeightHistoryItem.builder()
                                .weightKg(new BigDecimal("28.0"))
                                .recordDate(LocalDateTime.now().minusWeeks(1))
                                .changeKg(new BigDecimal("0.5"))
                                .build()
                ))
                .recommendation("Maintain current intake")
                .alertLevel("LOW")
                .build();
    }
}
