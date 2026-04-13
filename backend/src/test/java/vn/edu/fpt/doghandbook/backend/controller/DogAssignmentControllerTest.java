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
import vn.edu.fpt.doghandbook.backend.dto.request.DogAssignmentRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.DogAssignmentResponse;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.service.CustomUserDetailsService;
import vn.edu.fpt.doghandbook.backend.service.DogAssignmentService;
import vn.edu.fpt.doghandbook.backend.util.JwtUtil;

import java.time.LocalDate;
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

@WebMvcTest(DogAssignmentController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class DogAssignmentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DogAssignmentService dogAssignmentService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void assign_contentEditorRole_returns201AndPassesUserId() throws Exception {
        when(dogAssignmentService.assign(any(DogAssignmentRequest.class), eq(2))).thenReturn(sampleResponse());

        mockMvc.perform(post("/assignments")
                        .with(authenticatedUser(2, CONTENT_EDITOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequestJson()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.assignmentId").value(1))
                .andExpect(jsonPath("$.data.trainerName").value("Trainer One"));

        verify(dogAssignmentService).assign(any(DogAssignmentRequest.class), eq(2));
    }

    @Test
    void assign_trainerRole_returns403() throws Exception {
        mockMvc.perform(post("/assignments")
                        .with(authenticatedUser(7, TRAINER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequestJson()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));

        verify(dogAssignmentService, never()).assign(any(), any());
    }

    @Test
    void assign_invalidPayload_returns400() throws Exception {
        DogAssignmentRequest request = new DogAssignmentRequest();
        request.setTrainerId(10);

        mockMvc.perform(post("/assignments")
                        .with(authenticatedUser(1, ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"trainerId\":10}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void update_adminRole_returns200() throws Exception {
        DogAssignmentResponse updated = sampleResponse();
        updated.setNotes("Updated assignment");
        when(dogAssignmentService.update(eq(1), any(DogAssignmentRequest.class))).thenReturn(updated);

        mockMvc.perform(put("/assignments/1")
                        .with(authenticatedUser(1, ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequestJson()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.notes").value("Updated assignment"));
    }

    @Test
    void update_notFound_returns404() throws Exception {
        when(dogAssignmentService.update(eq(99), any(DogAssignmentRequest.class)))
                .thenThrow(new ResourceNotFoundException("Assignment", "id", 99));

        mockMvc.perform(put("/assignments/99")
                        .with(authenticatedUser(1, ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequestJson()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));
    }

    @Test
    void unassign_adminRole_returns200() throws Exception {
        doNothing().when(dogAssignmentService).unassign(1);

        mockMvc.perform(delete("/assignments/1")
                        .with(authenticatedUser(1, ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(dogAssignmentService).unassign(1);
    }

    @Test
    void unassign_contentEditorRole_returns403() throws Exception {
        mockMvc.perform(delete("/assignments/1")
                        .with(authenticatedUser(2, CONTENT_EDITOR)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));

        verify(dogAssignmentService, never()).unassign(any());
    }

    @Test
    void getById_trainerRole_returns200() throws Exception {
        when(dogAssignmentService.getById(1)).thenReturn(sampleResponse());

        mockMvc.perform(get("/assignments/1")
                        .with(authenticatedUser(7, TRAINER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.assignmentType").value("PRIMARY"))
                .andExpect(jsonPath("$.data.dogCode").value("DOG001"));
    }

    @Test
    void getById_notFound_returns404() throws Exception {
        when(dogAssignmentService.getById(99)).thenThrow(new ResourceNotFoundException("Assignment", "id", 99));

        mockMvc.perform(get("/assignments/99")
                        .with(authenticatedUser(7, TRAINER)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));
    }

    @Test
    void getByTrainer_trainerRole_returns200() throws Exception {
        when(dogAssignmentService.getByTrainer(10)).thenReturn(List.of(sampleResponse()));

        mockMvc.perform(get("/assignments/by-trainer/10")
                        .with(authenticatedUser(7, TRAINER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].trainerId").value(10));
    }

    @Test
    void getByDog_contentEditorRole_returns200() throws Exception {
        when(dogAssignmentService.getByDog(5)).thenReturn(List.of(sampleResponse()));

        mockMvc.perform(get("/assignments/by-dog/5")
                        .with(authenticatedUser(2, CONTENT_EDITOR)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].dogId").value(5));
    }

    private String validRequestJson() {
        return """
                {
                  "dogId": 5,
                  "trainerId": 10,
                  "assignmentType": "PRIMARY",
                  "assignmentScope": "FULL_TRAINING",
                  "startDate": "2026-04-01",
                  "notes": "Primary assignment"
                }
                """;
    }

    private DogAssignmentResponse sampleResponse() {
        return DogAssignmentResponse.builder()
                .assignmentId(1)
                .dogId(5)
                .dogName("Rex")
                .dogCode("DOG001")
                .trainerId(10)
                .trainerName("Trainer One")
                .trainerUsername("trainer10")
                .specialtyId(3)
                .specialtyName("Patrol")
                .assignmentType("PRIMARY")
                .assignmentScope("FULL_TRAINING")
                .startDate(LocalDate.of(2026, 4, 1))
                .isActive(true)
                .notes("Primary assignment")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }
}
