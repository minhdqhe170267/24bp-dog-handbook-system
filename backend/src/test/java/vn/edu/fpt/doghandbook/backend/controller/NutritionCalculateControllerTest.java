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
import vn.edu.fpt.doghandbook.backend.dto.request.NutritionCalculateRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.NutritionCalculateResponse;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.service.CustomUserDetailsService;
import vn.edu.fpt.doghandbook.backend.service.NutritionCalculatorService;
import vn.edu.fpt.doghandbook.backend.util.JwtUtil;

import java.math.BigDecimal;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static vn.edu.fpt.doghandbook.backend.controller.ControllerTestSupport.authenticatedUser;

@WebMvcTest(NutritionCalculateController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class NutritionCalculateControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private NutritionCalculatorService nutritionCalculatorService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void calculate_authenticatedReturns200() throws Exception {
        NutritionCalculateRequest request = validRequest();

        when(nutritionCalculatorService.calculate(any(NutritionCalculateRequest.class)))
                .thenReturn(NutritionCalculateResponse.builder()
                        .dailyCalories(new BigDecimal("1350.5"))
                        .proteinG(new BigDecimal("110.0"))
                        .fatG(new BigDecimal("45.0"))
                        .carbG(new BigDecimal("95.0"))
                        .weightStatus("NORMAL")
                        .build());

        mockMvc.perform(post("/nutrition/calculate")
                        .with(csrf())
                        .with(authenticatedUser(7, UserRole.TRAINER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.dailyCalories").value(1350.5))
                .andExpect(jsonPath("$.data.weightStatus").value("NORMAL"));

        verify(nutritionCalculatorService).calculate(any(NutritionCalculateRequest.class));
    }

    @Test
    void calculate_unauthenticatedReturns401() throws Exception {
        mockMvc.perform(post("/nutrition/calculate")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"));
    }

    @Test
    void calculate_missingBreedIdReturns400() throws Exception {
        NutritionCalculateRequest request = validRequest();
        request.setBreedId(null);

        mockMvc.perform(post("/nutrition/calculate")
                        .with(csrf())
                        .with(authenticatedUser(7, UserRole.TRAINER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    private NutritionCalculateRequest validRequest() {
        NutritionCalculateRequest request = new NutritionCalculateRequest();
        request.setBreedId(1);
        request.setWeightKg(new BigDecimal("30.5"));
        request.setAgeMonths(24);
        request.setActivityLevel("MEDIUM");
        request.setGender("MALE");
        request.setHealthCondition("NORMAL");
        return request;
    }
}
