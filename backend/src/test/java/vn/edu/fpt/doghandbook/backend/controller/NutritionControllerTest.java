package vn.edu.fpt.doghandbook.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import vn.edu.fpt.doghandbook.backend.config.JwtAuthenticationFilter;
import vn.edu.fpt.doghandbook.backend.config.SecurityConfig;
import vn.edu.fpt.doghandbook.backend.dto.request.NutritionStandardRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.NutritionStandardResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.service.CustomUserDetailsService;
import vn.edu.fpt.doghandbook.backend.service.NutritionCalculatorService;
import vn.edu.fpt.doghandbook.backend.service.NutritionService;
import vn.edu.fpt.doghandbook.backend.util.JwtUtil;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static vn.edu.fpt.doghandbook.backend.controller.ControllerTestSupport.authenticatedUser;
import static vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.ADMIN;
import static vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.CONTENT_EDITOR;
import static vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.TRAINER;

@WebMvcTest(NutritionController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class NutritionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private NutritionService nutritionService;

    @MockitoBean
    private NutritionCalculatorService nutritionCalculatorService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void getAll_authenticated_returns200() throws Exception {
        when(nutritionService.getAll(0, 10, "adult")).thenReturn(samplePage());

        mockMvc.perform(get("/nutrition-standards")
                        .with(authenticatedUser(1, TRAINER))
                        .param("search", "adult"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].rationCode").value("RATION001"));
    }

    @Test
    void getById_found_returns200() throws Exception {
        when(nutritionService.getById(1)).thenReturn(sampleResponse());

        mockMvc.perform(get("/nutrition-standards/1")
                        .with(authenticatedUser(1, TRAINER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.standardId").value(1))
                .andExpect(jsonPath("$.data.activityLevel").value("HIGH"));
    }

    @Test
    void getById_notFound_returns404() throws Exception {
        when(nutritionService.getById(99)).thenThrow(new ResourceNotFoundException("NutritionStandard", "id", 99));

        mockMvc.perform(get("/nutrition-standards/99")
                        .with(authenticatedUser(1, TRAINER)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));
    }

    @Test
    void getByBreedId_authenticated_returns200() throws Exception {
        when(nutritionService.getByBreedId(5)).thenReturn(List.of(sampleResponse()));

        mockMvc.perform(get("/nutrition-standards/by-breed/5")
                        .with(authenticatedUser(1, TRAINER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].breedId").value(5));
    }

    @Test
    void create_contentEditorRole_returns201AndUsesUserId() throws Exception {
        when(nutritionService.create(any(NutritionStandardRequest.class), eq(2))).thenReturn(sampleResponse());

        mockMvc.perform(post("/nutrition-standards")
                        .with(authenticatedUser(2, CONTENT_EDITOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.rationName").value("Adult Patrol Diet"));

        verify(nutritionService).create(any(NutritionStandardRequest.class), eq(2));
    }

    @Test
    void create_numberPrincipal_returns201() throws Exception {
        when(nutritionService.create(any(NutritionStandardRequest.class), eq(12))).thenReturn(sampleResponse());

        mockMvc.perform(post("/nutrition-standards")
                        .with(authentication(new TestingAuthenticationToken(12, null, "ROLE_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.standardId").value(1));
    }

    @Test
    void create_stringPrincipal_returns201() throws Exception {
        when(nutritionService.create(any(NutritionStandardRequest.class), eq(13))).thenReturn(sampleResponse());

        mockMvc.perform(post("/nutrition-standards")
                        .with(authentication(new TestingAuthenticationToken("13", null, "ROLE_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.standardId").value(1));
    }

    @Test
    void create_anonymousPrincipal_returns400() throws Exception {
        mockMvc.perform(post("/nutrition-standards")
                        .with(authentication(new TestingAuthenticationToken("anonymousUser", null, "ROLE_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BAD_REQUEST"));

        verify(nutritionService, never()).create(any(), any());
    }

    @Test
    void create_objectPrincipal_returns400() throws Exception {
        mockMvc.perform(post("/nutrition-standards")
                        .with(authentication(new TestingAuthenticationToken(new Object(), null, "ROLE_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BAD_REQUEST"));

        verify(nutritionService, never()).create(any(), any());
    }

    @Test
    void create_trainerRole_returns403() throws Exception {
        mockMvc.perform(post("/nutrition-standards")
                        .with(authenticatedUser(7, TRAINER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));

        verify(nutritionService, never()).create(any(), any());
    }

    @Test
    void create_invalidPayload_returns400() throws Exception {
        NutritionStandardRequest request = new NutritionStandardRequest();
        request.setActivityLevel("HIGH");

        mockMvc.perform(post("/nutrition-standards")
                        .with(authenticatedUser(1, ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void update_contentEditorRole_returns200() throws Exception {
        NutritionStandardResponse updated = sampleResponse();
        updated.setRationName("Updated Diet");
        when(nutritionService.update(eq(1), any(NutritionStandardRequest.class))).thenReturn(updated);

        mockMvc.perform(put("/nutrition-standards/1")
                        .with(authenticatedUser(2, CONTENT_EDITOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rationName").value("Updated Diet"));
    }

    @Test
    void delete_adminRole_returns200() throws Exception {
        doNothing().when(nutritionService).delete(1);

        mockMvc.perform(delete("/nutrition-standards/1")
                        .with(authenticatedUser(1, ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(nutritionService).delete(1);
    }

    @Test
    void delete_contentEditorRole_returns403() throws Exception {
        mockMvc.perform(delete("/nutrition-standards/1")
                        .with(authenticatedUser(2, CONTENT_EDITOR)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));
    }

    private NutritionStandardRequest validRequest() {
        NutritionStandardRequest request = new NutritionStandardRequest();
        request.setRationCode("RATION001");
        request.setRationName("Adult Patrol Diet");
        request.setDescription("High-energy ration");
        request.setBreedId(5);
        request.setTargetAgeMinMonths(12);
        request.setTargetAgeMaxMonths(72);
        request.setActivityLevel("HIGH");
        request.setHealthCondition("NORMAL");
        request.setSpecialNotes("Twice daily feeding");
        return request;
    }

    private NutritionStandardResponse sampleResponse() {
        return NutritionStandardResponse.builder()
                .standardId(1)
                .rationCode("RATION001")
                .rationName("Adult Patrol Diet")
                .description("High-energy ration")
                .breedId(5)
                .breedName("German Shepherd")
                .targetAgeMinMonths(12)
                .targetAgeMaxMonths(72)
                .activityLevel("HIGH")
                .healthCondition("NORMAL")
                .specialNotes("Twice daily feeding")
                .status("PUBLISHED")
                .createdByName("Editor")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    private PageResponse<NutritionStandardResponse> samplePage() {
        return PageResponse.<NutritionStandardResponse>builder()
                .content(List.of(sampleResponse()))
                .page(0)
                .size(10)
                .totalElements(1)
                .totalPages(1)
                .build();
    }
}
