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
import vn.edu.fpt.doghandbook.backend.dto.request.SymptomRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.SymptomResponse;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.service.CustomUserDetailsService;
import vn.edu.fpt.doghandbook.backend.service.SymptomService;
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

@WebMvcTest(SymptomController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class SymptomControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private SymptomService symptomService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void getAllSymptoms_authenticated_returns200() throws Exception {
        when(symptomService.getAll()).thenReturn(List.of(sampleResponse()));

        mockMvc.perform(get("/symptoms")
                        .with(authenticatedUser(1, TRAINER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].symptomCode").value("SYM001"))
                .andExpect(jsonPath("$.data[0].symptomName").value("Vomiting"));
    }

    @Test
    void getAllSymptoms_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/symptoms"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"));
    }

    @Test
    void getById_found_returns200() throws Exception {
        when(symptomService.getById(1)).thenReturn(sampleResponse());

        mockMvc.perform(get("/symptoms/1")
                        .with(authenticatedUser(1, TRAINER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.symptomId").value(1))
                .andExpect(jsonPath("$.data.category").value("DIGESTIVE"));
    }

    @Test
    void getById_notFound_returns404() throws Exception {
        when(symptomService.getById(99)).thenThrow(new ResourceNotFoundException("Symptom", "id", 99));

        mockMvc.perform(get("/symptoms/99")
                        .with(authenticatedUser(1, TRAINER)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));
    }

    @Test
    void getByCategory_authenticated_returns200() throws Exception {
        when(symptomService.getByCategory("DIGESTIVE")).thenReturn(List.of(sampleResponse()));

        mockMvc.perform(get("/symptoms/by-category")
                        .with(authenticatedUser(1, TRAINER))
                        .param("category", "DIGESTIVE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].category").value("DIGESTIVE"));

        verify(symptomService).getByCategory("DIGESTIVE");
    }

    @Test
    void getByCategory_missingCategory_returns400() throws Exception {
        mockMvc.perform(get("/symptoms/by-category")
                        .with(authenticatedUser(1, TRAINER)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("MISSING_PARAMETER"));
    }

    @Test
    void create_adminRole_returns201() throws Exception {
        when(symptomService.create(any(SymptomRequest.class))).thenReturn(sampleResponse());

        mockMvc.perform(post("/symptoms")
                        .with(authenticatedUser(1, ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.symptomId").value(1))
                .andExpect(jsonPath("$.data.symptomCode").value("SYM001"));
    }

    @Test
    void create_trainerRole_returns403() throws Exception {
        mockMvc.perform(post("/symptoms")
                        .with(authenticatedUser(7, TRAINER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));

        verify(symptomService, never()).create(any(SymptomRequest.class));
    }

    @Test
    void create_invalidPayload_returns400() throws Exception {
        SymptomRequest request = new SymptomRequest();
        request.setCategory("DIGESTIVE");

        mockMvc.perform(post("/symptoms")
                        .with(authenticatedUser(1, CONTENT_EDITOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void update_contentEditorRole_returns200() throws Exception {
        SymptomResponse updated = sampleResponse();
        updated.setSymptomName("Vomiting Updated");
        when(symptomService.update(eq(1), any(SymptomRequest.class))).thenReturn(updated);

        mockMvc.perform(put("/symptoms/1")
                        .with(authenticatedUser(2, CONTENT_EDITOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.symptomName").value("Vomiting Updated"));
    }

    @Test
    void update_notFound_returns404() throws Exception {
        when(symptomService.update(eq(99), any(SymptomRequest.class)))
                .thenThrow(new ResourceNotFoundException("Symptom", "id", 99));

        mockMvc.perform(put("/symptoms/99")
                        .with(authenticatedUser(2, CONTENT_EDITOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));
    }

    @Test
    void delete_adminRole_returns200() throws Exception {
        doNothing().when(symptomService).delete(1);

        mockMvc.perform(delete("/symptoms/1")
                        .with(authenticatedUser(1, ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(symptomService).delete(1);
    }

    @Test
    void delete_contentEditorRole_returns403() throws Exception {
        mockMvc.perform(delete("/symptoms/1")
                        .with(authenticatedUser(2, CONTENT_EDITOR)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));

        verify(symptomService, never()).delete(any());
    }

    @Test
    void delete_notFound_returns404() throws Exception {
        doThrow(new ResourceNotFoundException("Symptom", "id", 99)).when(symptomService).delete(99);

        mockMvc.perform(delete("/symptoms/99")
                        .with(authenticatedUser(1, ADMIN)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));
    }

    private SymptomRequest validRequest() {
        SymptomRequest request = new SymptomRequest();
        request.setSymptomCode("SYM001");
        request.setSymptomName("Vomiting");
        request.setCategory("DIGESTIVE");
        request.setSeverityIndicator(3);
        request.setDescription("Repeated vomiting");
        return request;
    }

    private SymptomResponse sampleResponse() {
        return SymptomResponse.builder()
                .symptomId(1)
                .symptomCode("SYM001")
                .symptomName("Vomiting")
                .category("DIGESTIVE")
                .severityIndicator(3)
                .description("Repeated vomiting")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }
}
