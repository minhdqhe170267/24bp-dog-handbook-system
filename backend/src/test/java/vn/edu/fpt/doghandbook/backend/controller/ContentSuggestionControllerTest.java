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
import vn.edu.fpt.doghandbook.backend.dto.request.ContentSuggestionRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ContentSuggestionResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.service.ContentSuggestionService;
import vn.edu.fpt.doghandbook.backend.service.CustomUserDetailsService;
import vn.edu.fpt.doghandbook.backend.util.JwtUtil;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static vn.edu.fpt.doghandbook.backend.controller.ControllerTestSupport.authenticatedUser;
import static vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.ADMIN;
import static vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.CONTENT_EDITOR;
import static vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.TRAINER;

@WebMvcTest(ContentSuggestionController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class ContentSuggestionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private ContentSuggestionService contentSuggestionService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void getAll_authenticated_returns200() throws Exception {
        when(contentSuggestionService.getAll(0, 10, null)).thenReturn(pageResponse());

        mockMvc.perform(get("/suggestions")
                        .with(authenticatedUser(1, TRAINER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].title").value("Improve Heel"));
    }

    @Test
    void getById_notFound_returns404() throws Exception {
        when(contentSuggestionService.getById(99)).thenThrow(new ResourceNotFoundException("Suggestion", "id", 99));

        mockMvc.perform(get("/suggestions/99")
                        .with(authenticatedUser(1, TRAINER)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));
    }

    @Test
    void submit_trainerRole_returns201() throws Exception {
        when(contentSuggestionService.submit(any(ContentSuggestionRequest.class), eq(7))).thenReturn(response());

        mockMvc.perform(post("/suggestions")
                        .with(authenticatedUser(7, TRAINER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.suggestionId").value(1))
                .andExpect(jsonPath("$.data.title").value("Improve Heel"));
    }

    @Test
    void submit_stringPrincipal_returns201() throws Exception {
        when(contentSuggestionService.submit(any(ContentSuggestionRequest.class), eq(19))).thenReturn(response());

        mockMvc.perform(post("/suggestions")
                        .with(authentication(new TestingAuthenticationToken("19", null, "ROLE_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.suggestionId").value(1));
    }

    @Test
    void submit_numberPrincipal_returns201() throws Exception {
        when(contentSuggestionService.submit(any(ContentSuggestionRequest.class), eq(21))).thenReturn(response());

        mockMvc.perform(post("/suggestions")
                        .with(authentication(new TestingAuthenticationToken(21, null, "ROLE_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.suggestionId").value(1));
    }

    @Test
    void submit_anonymousPrincipal_returns400() throws Exception {
        mockMvc.perform(post("/suggestions")
                        .with(authentication(new TestingAuthenticationToken("anonymousUser", null, "ROLE_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BAD_REQUEST"));
    }

    @Test
    void submit_invalidPayload_returns400() throws Exception {
        mockMvc.perform(post("/suggestions")
                        .with(authenticatedUser(7, TRAINER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"\",\"description\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void respond_contentEditorRole_returns200() throws Exception {
        when(contentSuggestionService.respond(eq(1), eq("Looks good"), eq("ACCEPTED"), eq(3), eq(null)))
                .thenReturn(response());

        mockMvc.perform(put("/suggestions/1/respond")
                        .with(authenticatedUser(3, CONTENT_EDITOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"adminResponse":"Looks good","status":"ACCEPTED"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("SUBMITTED"));
    }

    @Test
    void respond_trainerRole_returns403() throws Exception {
        mockMvc.perform(put("/suggestions/1/respond")
                        .with(authenticatedUser(7, TRAINER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"adminResponse":"Looks good","status":"ACCEPTED"}
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));
    }

    @Test
    void getMySubmissions_authenticated_returns200() throws Exception {
        when(contentSuggestionService.getMySubmissions(7)).thenReturn(List.of(response()));

        mockMvc.perform(get("/suggestions/my")
                        .with(authenticatedUser(7, TRAINER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].suggestionId").value(1))
                .andExpect(jsonPath("$.data[0].title").value("Improve Heel"));
    }

    @Test
    void getMySubmissions_objectPrincipal_returns400() throws Exception {
        mockMvc.perform(get("/suggestions/my")
                        .with(authentication(new TestingAuthenticationToken(new Object(), null, "ROLE_TRAINER"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BAD_REQUEST"));
    }

    private ContentSuggestionRequest validRequest() {
        ContentSuggestionRequest request = new ContentSuggestionRequest();
        request.setSuggestionType("NEW_CONTENT");
        request.setTitle("Improve Heel");
        request.setDescription("Add more cues");
        return request;
    }

    private ContentSuggestionResponse response() {
        return ContentSuggestionResponse.builder()
                .suggestionId(1)
                .trainerId(7)
                .trainerName("Trainer")
                .suggestionType("NEW_CONTENT")
                .title("Improve Heel")
                .description("Add more cues")
                .status("SUBMITTED")
                .submittedAt(LocalDateTime.now())
                .build();
    }

    private PageResponse<ContentSuggestionResponse> pageResponse() {
        return PageResponse.<ContentSuggestionResponse>builder()
                .content(List.of(response()))
                .page(0)
                .size(10)
                .totalElements(1)
                .totalPages(1)
                .build();
    }
}
