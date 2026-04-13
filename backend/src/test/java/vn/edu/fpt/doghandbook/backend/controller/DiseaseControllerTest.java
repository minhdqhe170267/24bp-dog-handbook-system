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
import vn.edu.fpt.doghandbook.backend.dto.request.DiseaseRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.DiseaseResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.service.CustomUserDetailsService;
import vn.edu.fpt.doghandbook.backend.service.DiseaseService;
import vn.edu.fpt.doghandbook.backend.util.JwtUtil;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
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

@WebMvcTest(DiseaseController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class DiseaseControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private DiseaseService diseaseService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void getAllDiseases_authenticated_returns200() throws Exception {
        when(diseaseService.getAll(0, 10, "parvo")).thenReturn(samplePage());

        mockMvc.perform(get("/diseases")
                        .with(authenticatedUser(1, TRAINER))
                        .param("page", "0")
                        .param("size", "10")
                        .param("search", "parvo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].diseaseName").value("Parvo"));

        verify(diseaseService).getAll(0, 10, "parvo");
    }

    @Test
    void getAllDiseases_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/diseases"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"));
    }

    @Test
    void getDiseaseById_found_returns200() throws Exception {
        when(diseaseService.getById(1)).thenReturn(sampleResponse());

        mockMvc.perform(get("/diseases/1")
                        .with(authenticatedUser(1, TRAINER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.diseaseId").value(1))
                .andExpect(jsonPath("$.data.severityLevel").value("CRITICAL"));
    }

    @Test
    void getDiseaseById_notFound_returns404() throws Exception {
        when(diseaseService.getById(99)).thenThrow(new ResourceNotFoundException("Disease", "id", 99));

        mockMvc.perform(get("/diseases/99")
                        .with(authenticatedUser(1, TRAINER)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));
    }

    @Test
    void createDisease_contentEditorRole_returns201AndPassesUserId() throws Exception {
        when(diseaseService.create(any(DiseaseRequest.class), eq(2))).thenReturn(sampleResponse());

        mockMvc.perform(post("/diseases")
                        .with(authenticatedUser(2, CONTENT_EDITOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.diseaseName").value("Parvo"));

        verify(diseaseService).create(any(DiseaseRequest.class), eq(2));
    }

    @Test
    void createDisease_trainerRole_returns403() throws Exception {
        mockMvc.perform(post("/diseases")
                        .with(authenticatedUser(7, TRAINER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));

        verify(diseaseService, never()).create(any(DiseaseRequest.class), any());
    }

    @Test
    void createDisease_invalidPayload_returns400() throws Exception {
        DiseaseRequest request = new DiseaseRequest();
        request.setSeverityLevel("CRITICAL");

        mockMvc.perform(post("/diseases")
                        .with(authenticatedUser(1, ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void updateDisease_contentEditorRole_returns200() throws Exception {
        DiseaseResponse updated = sampleResponse();
        updated.setDiseaseName("Parvo Updated");
        when(diseaseService.update(eq(1), any(DiseaseRequest.class))).thenReturn(updated);

        mockMvc.perform(put("/diseases/1")
                        .with(authenticatedUser(2, CONTENT_EDITOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.diseaseName").value("Parvo Updated"));
    }

    @Test
    void updateDisease_notFound_returns404() throws Exception {
        when(diseaseService.update(eq(99), any(DiseaseRequest.class)))
                .thenThrow(new ResourceNotFoundException("Disease", "id", 99));

        mockMvc.perform(put("/diseases/99")
                        .with(authenticatedUser(2, CONTENT_EDITOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));
    }

    @Test
    void deleteDisease_adminRole_returns200() throws Exception {
        doNothing().when(diseaseService).delete(1);

        mockMvc.perform(delete("/diseases/1")
                        .with(authenticatedUser(1, ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(diseaseService).delete(1);
    }

    @Test
    void deleteDisease_contentEditorRole_returns403() throws Exception {
        mockMvc.perform(delete("/diseases/1")
                        .with(authenticatedUser(2, CONTENT_EDITOR)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));

        verify(diseaseService, never()).delete(any());
    }

    @Test
    void deleteDisease_notFound_returns404() throws Exception {
        doThrow(new ResourceNotFoundException("Disease", "id", 99)).when(diseaseService).delete(99);

        mockMvc.perform(delete("/diseases/99")
                        .with(authenticatedUser(1, ADMIN)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));
    }

    private DiseaseRequest validRequest() {
        DiseaseRequest request = new DiseaseRequest();
        request.setDiseaseName("Parvo");
        request.setSeverityLevel("CRITICAL");
        request.setDescription("Highly contagious");
        request.setTreatmentGuidelines("IV fluids");
        request.setPreventionMeasures("Vaccinate");
        return request;
    }

    private DiseaseResponse sampleResponse() {
        return DiseaseResponse.builder()
                .diseaseId(1)
                .diseaseName("Parvo")
                .severityLevel("CRITICAL")
                .description("Highly contagious")
                .treatmentGuidelines("IV fluids")
                .preventionMeasures("Vaccinate")
                .status("PUBLISHED")
                .createdByName("Editor")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    private PageResponse<DiseaseResponse> samplePage() {
        return PageResponse.<DiseaseResponse>builder()
                .content(List.of(sampleResponse()))
                .page(0)
                .size(10)
                .totalElements(1)
                .totalPages(1)
                .build();
    }
}
