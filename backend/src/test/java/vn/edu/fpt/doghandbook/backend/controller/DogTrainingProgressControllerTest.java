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
import vn.edu.fpt.doghandbook.backend.dto.request.EvaluateExerciseProgressRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.UpdateTrainingProgressRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.RoadmapProgressResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.TrainingProgressDetailResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.TrainingProgressSummaryResponse;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.service.CustomUserDetailsService;
import vn.edu.fpt.doghandbook.backend.service.DogTrainingProgressService;
import vn.edu.fpt.doghandbook.backend.util.JwtUtil;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static vn.edu.fpt.doghandbook.backend.controller.ControllerTestSupport.authenticatedUser;
import static vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.ADMIN;
import static vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.CONTENT_EDITOR;
import static vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.TRAINER;

@WebMvcTest(DogTrainingProgressController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class DogTrainingProgressControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private DogTrainingProgressService dogTrainingProgressService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void getDetail_adminRole_returns200() throws Exception {
        when(dogTrainingProgressService.getDetail(1)).thenReturn(sampleDetail());

        mockMvc.perform(get("/training-progress/1")
                        .with(authenticatedUser(1, ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.summary.enrollmentId").value(1))
                .andExpect(jsonPath("$.data.summary.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.data.roadmaps[0].roadmapName").value("Patrol Roadmap"));
    }

    @Test
    void getDetail_notFound_returns404() throws Exception {
        when(dogTrainingProgressService.getDetail(99))
                .thenThrow(new ResourceNotFoundException("TrainingProgress", "id", 99));

        mockMvc.perform(get("/training-progress/99")
                        .with(authenticatedUser(7, TRAINER)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));
    }

    @Test
    void getByDog_trainerRole_returns200() throws Exception {
        when(dogTrainingProgressService.getByDog(5)).thenReturn(List.of(sampleSummary()));

        mockMvc.perform(get("/training-progress/dog/5")
                        .with(authenticatedUser(7, TRAINER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].dogId").value(5));
    }

    @Test
    void getByTrainer_adminRole_returns200() throws Exception {
        when(dogTrainingProgressService.getByTrainer(10)).thenReturn(List.of(sampleSummary()));

        mockMvc.perform(get("/training-progress/trainer/10")
                        .with(authenticatedUser(1, ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].trainerId").value(10));
    }

    @Test
    void getMine_trainerRole_returns200AndUsesCurrentUserId() throws Exception {
        when(dogTrainingProgressService.getMine(7)).thenReturn(List.of(sampleSummary()));

        mockMvc.perform(get("/training-progress/my")
                        .with(authenticatedUser(7, TRAINER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].enrollmentId").value(1));

        verify(dogTrainingProgressService).getMine(7);
    }

    @Test
    void updateEnrollment_trainerRole_returns200() throws Exception {
        when(dogTrainingProgressService.updateEnrollment(eq(1), any(UpdateTrainingProgressRequest.class)))
                .thenReturn(sampleSummary());

        mockMvc.perform(put("/training-progress/1")
                        .with(authenticatedUser(7, TRAINER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validUpdateRequest())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("IN_PROGRESS"));
    }

    @Test
    void updateEnrollment_invalidPayload_returns400() throws Exception {
        UpdateTrainingProgressRequest request = new UpdateTrainingProgressRequest();
        request.setStatus("INVALID");

        mockMvc.perform(put("/training-progress/1")
                        .with(authenticatedUser(7, TRAINER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void evaluateExercise_adminRole_returns201AndPassesEvaluatorId() throws Exception {
        when(dogTrainingProgressService.evaluateExercise(eq(1), any(EvaluateExerciseProgressRequest.class), eq(1)))
                .thenReturn(sampleSummary());

        mockMvc.perform(post("/training-progress/exercises/1/evaluate")
                        .with(authenticatedUser(1, ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validEvaluateRequest())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.progressPercent").value(55.5));

        verify(dogTrainingProgressService).evaluateExercise(eq(1), any(EvaluateExerciseProgressRequest.class), eq(1));
    }

    @Test
    void evaluateExercise_contentEditorRole_returns403() throws Exception {
        mockMvc.perform(post("/training-progress/exercises/1/evaluate")
                        .with(authenticatedUser(2, CONTENT_EDITOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validEvaluateRequest())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));

        verify(dogTrainingProgressService, never()).evaluateExercise(any(), any(), any());
    }

    private UpdateTrainingProgressRequest validUpdateRequest() {
        UpdateTrainingProgressRequest request = new UpdateTrainingProgressRequest();
        request.setStatus("IN_PROGRESS");
        request.setNotes("Steady progress");
        return request;
    }

    private EvaluateExerciseProgressRequest validEvaluateRequest() {
        EvaluateExerciseProgressRequest request = new EvaluateExerciseProgressRequest();
        request.setStatus("COMPLETED");
        request.setScore(new BigDecimal("8.5"));
        request.setTrainerNotes("Good execution");
        return request;
    }

    private TrainingProgressSummaryResponse sampleSummary() {
        return TrainingProgressSummaryResponse.builder()
                .enrollmentId(1)
                .dogId(5)
                .dogName("Rex")
                .trainerId(10)
                .trainerName("Trainer One")
                .specialtyId(3)
                .specialtyName("Patrol")
                .specialtyVersion(1)
                .currentRoadmapName("Patrol Roadmap")
                .currentRoadmapOrder(1)
                .currentPhaseName("Basics")
                .currentPhaseOrder(1)
                .progressPercent(new BigDecimal("55.5"))
                .status("IN_PROGRESS")
                .enrolledAt(LocalDateTime.now())
                .notes("Steady progress")
                .build();
    }

    private TrainingProgressDetailResponse sampleDetail() {
        return TrainingProgressDetailResponse.builder()
                .summary(sampleSummary())
                .roadmaps(List.of(
                        RoadmapProgressResponse.builder()
                                .roadmapId(100)
                                .roadmapName("Patrol Roadmap")
                                .roadmapOrder(1)
                                .targetRole("PATROL")
                                .currentPhaseOrder(1)
                                .progressPercent(new BigDecimal("55.5"))
                                .status("IN_PROGRESS")
                                .startedAt(LocalDateTime.now())
                                .phases(List.of())
                                .build()
                ))
                .build();
    }
}
