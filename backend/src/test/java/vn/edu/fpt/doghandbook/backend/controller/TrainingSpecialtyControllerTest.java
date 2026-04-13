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
import vn.edu.fpt.doghandbook.backend.dto.request.TrainingSpecialtyRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.TrainingSpecialtyResponse;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.service.CustomUserDetailsService;
import vn.edu.fpt.doghandbook.backend.service.TrainingSpecialtyService;
import vn.edu.fpt.doghandbook.backend.util.JwtUtil;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
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

@WebMvcTest(TrainingSpecialtyController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class TrainingSpecialtyControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private TrainingSpecialtyService trainingSpecialtyService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void getAll_adminRole_returns200() throws Exception {
        when(trainingSpecialtyService.getAll(0, 20, null)).thenReturn(samplePage());

        mockMvc.perform(get("/training-specialties")
                        .with(authenticatedUser(1, ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].specialtyName").value("Patrol"));
    }

    @Test
    void getAll_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/training-specialties"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"));
    }

    @Test
    void getById_contentEditorRole_returns200() throws Exception {
        when(trainingSpecialtyService.getById(1)).thenReturn(sampleResponse());

        mockMvc.perform(get("/training-specialties/1")
                        .with(authenticatedUser(2, CONTENT_EDITOR)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.specialtyId").value(1))
                .andExpect(jsonPath("$.data.specialtyCode").value("SPEC001"));
    }

    @Test
    void getById_notFound_returns404() throws Exception {
        when(trainingSpecialtyService.getById(99))
                .thenThrow(new ResourceNotFoundException("TrainingSpecialty", "id", 99));

        mockMvc.perform(get("/training-specialties/99")
                        .with(authenticatedUser(2, CONTENT_EDITOR)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));
    }

    @Test
    void create_contentEditorRole_returns201() throws Exception {
        when(trainingSpecialtyService.create(any(TrainingSpecialtyRequest.class))).thenReturn(sampleResponse());

        mockMvc.perform(post("/training-specialties")
                        .with(authenticatedUser(2, CONTENT_EDITOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.specialtyName").value("Patrol"));
    }

    @Test
    void create_trainerRole_returns403() throws Exception {
        mockMvc.perform(post("/training-specialties")
                        .with(authenticatedUser(7, TRAINER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));
    }

    @Test
    void create_invalidPayload_returns400() throws Exception {
        TrainingSpecialtyRequest request = new TrainingSpecialtyRequest();

        mockMvc.perform(post("/training-specialties")
                        .with(authenticatedUser(1, ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void update_adminRole_returns200() throws Exception {
        TrainingSpecialtyResponse updated = sampleResponse();
        updated.setSpecialtyName("Patrol Advanced");
        when(trainingSpecialtyService.update(eq(1), any(TrainingSpecialtyRequest.class))).thenReturn(updated);

        mockMvc.perform(put("/training-specialties/1")
                        .with(authenticatedUser(1, ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.specialtyName").value("Patrol Advanced"));
    }

    @Test
    void delete_contentEditorRole_returns200() throws Exception {
        doNothing().when(trainingSpecialtyService).delete(1);

        mockMvc.perform(delete("/training-specialties/1")
                        .with(authenticatedUser(2, CONTENT_EDITOR)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(trainingSpecialtyService).delete(1);
    }

    private TrainingSpecialtyRequest validRequest() {
        TrainingSpecialtyRequest request = new TrainingSpecialtyRequest();
        request.setSpecialtyCode("SPEC001");
        request.setSpecialtyName("Patrol");
        request.setDescription("Patrol dog training");
        request.setIsActive(true);
        return request;
    }

    private TrainingSpecialtyResponse sampleResponse() {
        return TrainingSpecialtyResponse.builder()
                .specialtyId(1)
                .specialtyCode("SPEC001")
                .specialtyName("Patrol")
                .description("Patrol dog training")
                .version(2)
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    private PageResponse<TrainingSpecialtyResponse> samplePage() {
        return PageResponse.<TrainingSpecialtyResponse>builder()
                .content(List.of(sampleResponse()))
                .page(0)
                .size(20)
                .totalElements(1)
                .totalPages(1)
                .build();
    }
}
