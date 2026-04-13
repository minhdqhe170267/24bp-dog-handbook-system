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
import vn.edu.fpt.doghandbook.backend.dto.request.FieldNoteRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.FieldNoteResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.service.CustomUserDetailsService;
import vn.edu.fpt.doghandbook.backend.service.FieldNoteService;
import vn.edu.fpt.doghandbook.backend.util.JwtUtil;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
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

@WebMvcTest(FieldNoteController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class FieldNoteControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FieldNoteService fieldNoteService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void getAll_adminRole_returns200() throws Exception {
        when(fieldNoteService.getAll(0, 10, "patrol")).thenReturn(samplePage());

        mockMvc.perform(get("/field-notes")
                        .with(authenticatedUser(1, ADMIN))
                        .param("search", "patrol"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].title").value("Patrol observation"));
    }

    @Test
    void getByTrainer_my_returns200AndUsesUserId() throws Exception {
        when(fieldNoteService.getByTrainer(7, 0, 10)).thenReturn(samplePage());

        mockMvc.perform(get("/field-notes/my")
                        .with(authenticatedUser(7, TRAINER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].trainerId").value(7));

        verify(fieldNoteService).getByTrainer(7, 0, 10);
    }

    @Test
    void getByDog_trainerRole_returns200() throws Exception {
        when(fieldNoteService.getByDog(5, 0, 10)).thenReturn(samplePage());

        mockMvc.perform(get("/field-notes/by-dog/5")
                        .with(authenticatedUser(7, TRAINER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].dogId").value(5));
    }

    @Test
    void getById_found_returns200() throws Exception {
        when(fieldNoteService.getById(1)).thenReturn(sampleResponse());

        mockMvc.perform(get("/field-notes/1")
                        .with(authenticatedUser(7, TRAINER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.noteId").value(1))
                .andExpect(jsonPath("$.data.location").value("Training yard"));
    }

    @Test
    void getById_notFound_returns404() throws Exception {
        when(fieldNoteService.getById(99)).thenThrow(new ResourceNotFoundException("FieldNote", "id", 99));

        mockMvc.perform(get("/field-notes/99")
                        .with(authenticatedUser(7, TRAINER)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));
    }

    @Test
    void create_trainerRole_returns201AndUsesUserId() throws Exception {
        when(fieldNoteService.create(any(FieldNoteRequest.class), eq(7))).thenReturn(sampleResponse());

        mockMvc.perform(post("/field-notes")
                        .with(authenticatedUser(7, TRAINER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequestJson()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.title").value("Patrol observation"));

        verify(fieldNoteService).create(any(FieldNoteRequest.class), eq(7));
    }

    @Test
    void create_invalidPayload_returns400() throws Exception {
        mockMvc.perform(post("/field-notes")
                        .with(authenticatedUser(7, TRAINER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void update_trainerRole_returns200() throws Exception {
        FieldNoteResponse updated = sampleResponse();
        updated.setTitle("Updated note");
        when(fieldNoteService.update(eq(1), any(FieldNoteRequest.class), eq(7))).thenReturn(updated);

        mockMvc.perform(put("/field-notes/1")
                        .with(authenticatedUser(7, TRAINER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequestJson()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Updated note"));
    }

    @Test
    void delete_adminRole_returns200() throws Exception {
        doNothing().when(fieldNoteService).delete(1, 1);

        mockMvc.perform(delete("/field-notes/1")
                        .with(authenticatedUser(1, ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(fieldNoteService).delete(1, 1);
    }

    @Test
    void delete_contentEditorRole_returns403() throws Exception {
        mockMvc.perform(delete("/field-notes/1")
                        .with(authenticatedUser(2, CONTENT_EDITOR)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));

        verify(fieldNoteService, never()).delete(any(), any());
    }

    private String validRequestJson() {
        return """
                {
                  "title": "Patrol observation",
                  "content": "Dog maintained focus during patrol drill.",
                  "dogId": 5,
                  "photoUrls": "https://cdn.example/photo.png",
                  "location": "Training yard",
                  "linkedContentId": 12,
                  "recordingDate": "2026-04-08T14:00:00",
                  "localUpdatedAt": "2026-04-08T14:30:00"
                }
                """;
    }

    private FieldNoteResponse sampleResponse() {
        return FieldNoteResponse.builder()
                .noteId(1)
                .trainerId(7)
                .trainerName("Trainer One")
                .dogId(5)
                .dogName("Rex")
                .dogCode("DOG001")
                .title("Patrol observation")
                .content("Dog maintained focus during patrol drill.")
                .photoUrls("https://cdn.example/photo.png")
                .recordingDate(LocalDateTime.now())
                .location("Training yard")
                .linkedContentId(12)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    private PageResponse<FieldNoteResponse> samplePage() {
        return PageResponse.<FieldNoteResponse>builder()
                .content(List.of(sampleResponse()))
                .page(0)
                .size(10)
                .totalElements(1)
                .totalPages(1)
                .build();
    }
}
