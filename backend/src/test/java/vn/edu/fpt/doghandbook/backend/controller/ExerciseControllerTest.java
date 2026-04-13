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
import vn.edu.fpt.doghandbook.backend.dto.request.TrainingExerciseRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.TrainingExerciseResponse;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.service.CustomUserDetailsService;
import vn.edu.fpt.doghandbook.backend.service.TrainingService;
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

@WebMvcTest(ExerciseController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class ExerciseControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private TrainingService trainingService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void getAllExercises_authenticated_returns200() throws Exception {
        when(trainingService.getAllExercises(0, 10, null, null)).thenReturn(pageResponse());

        mockMvc.perform(get("/exercises")
                        .with(authenticatedUser(1, ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].exerciseName").value("Heel"));
    }

    @Test
    void getExerciseById_notFound_returns404() throws Exception {
        when(trainingService.getExerciseById(99)).thenThrow(new ResourceNotFoundException("Exercise", "id", 99));

        mockMvc.perform(get("/exercises/99")
                        .with(authenticatedUser(1, ADMIN)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));
    }

    @Test
    void createExercise_contentEditorRole_returns201() throws Exception {
        when(trainingService.createExercise(any(TrainingExerciseRequest.class), eq(5))).thenReturn(response());

        mockMvc.perform(post("/exercises")
                        .with(authenticatedUser(5, CONTENT_EDITOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.exerciseId").value(1))
                .andExpect(jsonPath("$.data.exerciseName").value("Heel"));
    }

    @Test
    void createExercise_numberPrincipal_returns201() throws Exception {
        when(trainingService.createExercise(any(TrainingExerciseRequest.class), eq(11))).thenReturn(response());

        mockMvc.perform(post("/exercises")
                        .with(authentication(new TestingAuthenticationToken(11, null, "ROLE_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.exerciseId").value(1));
    }

    @Test
    void createExercise_stringPrincipal_returns201() throws Exception {
        when(trainingService.createExercise(any(TrainingExerciseRequest.class), eq(15))).thenReturn(response());

        mockMvc.perform(post("/exercises")
                        .with(authentication(new TestingAuthenticationToken("15", null, "ROLE_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.exerciseId").value(1));
    }

    @Test
    void createExercise_anonymousPrincipal_returns400() throws Exception {
        mockMvc.perform(post("/exercises")
                        .with(authentication(new TestingAuthenticationToken("anonymousUser", null, "ROLE_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BAD_REQUEST"));

        verify(trainingService, never()).createExercise(any(TrainingExerciseRequest.class), any());
    }

    @Test
    void createExercise_objectPrincipal_returns400() throws Exception {
        mockMvc.perform(post("/exercises")
                        .with(authentication(new TestingAuthenticationToken(new Object(), null, "ROLE_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BAD_REQUEST"));

        verify(trainingService, never()).createExercise(any(TrainingExerciseRequest.class), any());
    }

    @Test
    void updateExercise_adminRole_returns200() throws Exception {
        when(trainingService.updateExercise(eq(1), any(TrainingExerciseRequest.class))).thenReturn(response());

        mockMvc.perform(put("/exercises/1")
                        .with(authenticatedUser(1, ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.exerciseName").value("Heel"));
    }

    @Test
    void deleteExercise_adminRole_returns200() throws Exception {
        doNothing().when(trainingService).deleteExercise(1);

        mockMvc.perform(delete("/exercises/1")
                        .with(authenticatedUser(1, ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void deleteExercise_contentEditorRole_returns403() throws Exception {
        mockMvc.perform(delete("/exercises/1")
                        .with(authenticatedUser(2, CONTENT_EDITOR)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));
    }

    private TrainingExerciseRequest validRequest() {
        TrainingExerciseRequest request = new TrainingExerciseRequest();
        request.setExerciseName("Heel");
        request.setDifficultyLevel("BASIC");
        request.setDurationMinutes(15);
        return request;
    }

    private TrainingExerciseResponse response() {
        return TrainingExerciseResponse.builder()
                .exerciseId(1)
                .exerciseName("Heel")
                .difficultyLevel("BASIC")
                .durationMinutes(15)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    private PageResponse<TrainingExerciseResponse> pageResponse() {
        return PageResponse.<TrainingExerciseResponse>builder()
                .content(List.of(response()))
                .page(0)
                .size(10)
                .totalElements(1)
                .totalPages(1)
                .build();
    }
}
