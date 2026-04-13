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
import vn.edu.fpt.doghandbook.backend.dto.request.ContentRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ContentResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.UnifiedContentResponse;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.service.ContentService;
import vn.edu.fpt.doghandbook.backend.service.CustomUserDetailsService;
import vn.edu.fpt.doghandbook.backend.util.JwtUtil;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static vn.edu.fpt.doghandbook.backend.controller.ControllerTestSupport.authenticatedUser;

@WebMvcTest(ContentController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class ContentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private ContentService contentService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void getAll_trainerRoleForcesPublishedStatus() throws Exception {
        when(contentService.getAll(0, 10, null, null, "PUBLISHED")).thenReturn(samplePage());

        mockMvc.perform(get("/contents")
                        .with(authenticatedUser(7, UserRole.TRAINER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].status").value("PUBLISHED"));

        verify(contentService).getAll(0, 10, null, null, "PUBLISHED");
    }

    @Test
    void getAll_adminUsesExplicitContentTypeAndStatus_returns200() throws Exception {
        when(contentService.getAll(0, 10, "guide", "GENERAL_ARTICLE", "DRAFT")).thenReturn(samplePage());

        mockMvc.perform(get("/contents")
                        .with(authenticatedUser(1, UserRole.ADMIN))
                        .param("search", "guide")
                        .param("contentType", "GENERAL_ARTICLE")
                        .param("type", "LEGACY_TYPE")
                        .param("status", "DRAFT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].title").value("Published guide"));

        verify(contentService).getAll(0, 10, "guide", "GENERAL_ARTICLE", "DRAFT");
    }

    @Test
    void getAllUnified_trainerRoleForcesPublishedStatus() throws Exception {
        when(contentService.getAllUnified(0, 10, null, null, "PUBLISHED")).thenReturn(unifiedPage());

        mockMvc.perform(get("/contents/unified")
                        .with(authenticatedUser(7, UserRole.TRAINER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].status").value("PUBLISHED"))
                .andExpect(jsonPath("$.data.content[0].entityType").value("CONTENT"));

        verify(contentService).getAllUnified(0, 10, null, null, "PUBLISHED");
    }

    @Test
    void getAllUnified_adminKeepsProvidedStatus_returns200() throws Exception {
        when(contentService.getAllUnified(0, 10, "guide", "CONTENT", "DRAFT")).thenReturn(unifiedPage());

        mockMvc.perform(get("/contents/unified")
                        .with(authenticatedUser(1, UserRole.ADMIN))
                        .param("search", "guide")
                        .param("entityType", "CONTENT")
                        .param("status", "DRAFT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].entityType").value("CONTENT"));

        verify(contentService).getAllUnified(0, 10, "guide", "CONTENT", "DRAFT");
    }

    @Test
    void getById_trainerCannotSeeDraft_returns404() throws Exception {
        when(contentService.getById(7)).thenReturn(ContentResponse.builder()
                .contentId(7)
                .title("Draft guide")
                .contentType("GENERAL_ARTICLE")
                .status("DRAFT")
                .build());

        mockMvc.perform(get("/contents/7")
                        .with(authenticatedUser(7, UserRole.TRAINER)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));
    }

    @Test
    void getById_trainerCanSeePublished_returns200() throws Exception {
        when(contentService.getById(8)).thenReturn(ContentResponse.builder()
                .contentId(8)
                .title("Published guide")
                .contentType("GENERAL_ARTICLE")
                .status("PUBLISHED")
                .build());

        mockMvc.perform(get("/contents/8")
                        .with(authenticatedUser(7, UserRole.TRAINER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.contentId").value(8));
    }

    @Test
    void create_contentEditorWithPendingStatus_returns201() throws Exception {
        ContentRequest request = new ContentRequest();
        request.setTitle("Guide");
        request.setContentType("GENERAL_ARTICLE");
        request.setBody("Body");
        request.setStatus("PENDING");

        when(contentService.create(any(ContentRequest.class), eq(10))).thenReturn(ContentResponse.builder()
                .contentId(1)
                .title("Guide")
                .contentType("GENERAL_ARTICLE")
                .status("PENDING")
                .build());

        mockMvc.perform(post("/contents")
                        .with(csrf())
                        .with(authenticatedUser(10, UserRole.CONTENT_EDITOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("PENDING"));
    }

    @Test
    void create_trainerReturns403() throws Exception {
        ContentRequest request = new ContentRequest();
        request.setTitle("Guide");
        request.setContentType("GENERAL_ARTICLE");
        request.setBody("Body");

        mockMvc.perform(post("/contents")
                        .with(csrf())
                        .with(authenticatedUser(7, UserRole.TRAINER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));

        verifyNoInteractions(contentService);
    }

    private PageResponse<ContentResponse> samplePage() {
        return PageResponse.<ContentResponse>builder()
                .content(List.of(ContentResponse.builder()
                        .contentId(1)
                        .title("Published guide")
                        .contentType("GENERAL_ARTICLE")
                        .status("PUBLISHED")
                        .createdAt(LocalDateTime.of(2026, 4, 2, 8, 0))
                        .updatedAt(LocalDateTime.of(2026, 4, 2, 8, 5))
                        .build()))
                .page(0)
                .size(10)
                .totalElements(1)
                .totalPages(1)
                .build();
    }

    private PageResponse<UnifiedContentResponse> unifiedPage() {
        return PageResponse.<UnifiedContentResponse>builder()
                .content(List.of(UnifiedContentResponse.builder()
                        .entityId(1)
                        .entityType("CONTENT")
                        .title("Published guide")
                        .status("PUBLISHED")
                        .authorName("Editor")
                        .createdAt(LocalDateTime.of(2026, 4, 2, 8, 0))
                        .updatedAt(LocalDateTime.of(2026, 4, 2, 8, 5))
                        .build()))
                .page(0)
                .size(10)
                .totalElements(1)
                .totalPages(1)
                .build();
    }
}
