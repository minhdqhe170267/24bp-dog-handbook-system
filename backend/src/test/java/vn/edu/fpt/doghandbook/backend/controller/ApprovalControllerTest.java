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
import vn.edu.fpt.doghandbook.backend.dto.request.ApprovalRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ApprovalRecordResponse;
import vn.edu.fpt.doghandbook.backend.entity.enums.ApprovableEntityType;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.service.ApprovalService;
import vn.edu.fpt.doghandbook.backend.service.CustomUserDetailsService;
import vn.edu.fpt.doghandbook.backend.util.JwtUtil;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static vn.edu.fpt.doghandbook.backend.controller.ControllerTestSupport.authenticatedUser;

@WebMvcTest(ApprovalController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class ApprovalControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private ApprovalService approvalService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void submitForReview_contentEditor_returns200() throws Exception {
        mockMvc.perform(put("/approvals/content/5/submit")
                        .with(csrf())
                        .with(authenticatedUser(10, UserRole.CONTENT_EDITOR)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(approvalService).submitForReview(ApprovableEntityType.CONTENT, 5, 10);
    }

    @Test
    void review_reviewerReturns201() throws Exception {
        ApprovalRequest request = new ApprovalRequest();
        request.setAction("APPROVED");
        request.setComment("Looks good");

        when(approvalService.review(eq(ApprovableEntityType.CONTENT), eq(5), any(ApprovalRequest.class), eq(8)))
                .thenReturn(ApprovalRecordResponse.builder()
                        .approvalId(1)
                        .entityType("CONTENT")
                        .entityId(5)
                        .decision("APPROVED")
                        .comments("Looks good")
                        .reviewedAt(LocalDateTime.of(2026, 4, 2, 10, 0))
                        .build());

        mockMvc.perform(post("/approvals/content/5/review")
                        .with(csrf())
                        .with(authenticatedUser(8, UserRole.REVIEWER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.decision").value("APPROVED"))
                .andExpect(jsonPath("$.data.entityId").value(5));
    }

    @Test
    void publish_contentEditor_returns200() throws Exception {
        mockMvc.perform(put("/approvals/content/5/publish")
                        .with(csrf())
                        .with(authenticatedUser(10, UserRole.CONTENT_EDITOR)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(approvalService).publish(ApprovableEntityType.CONTENT, 5, 10);
    }

    @Test
    void publish_trainer_returns403() throws Exception {
        mockMvc.perform(put("/approvals/content/5/publish")
                        .with(csrf())
                        .with(authenticatedUser(7, UserRole.TRAINER)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));

        verifyNoInteractions(approvalService);
    }

    @Test
    void getPendingReviews_authenticated_returns200() throws Exception {
        when(approvalService.getPendingReviews(ApprovableEntityType.CONTENT, 0, 10))
                .thenReturn(List.of(Map.of(
                        "entityId", 5,
                        "title", "Pending article",
                        "status", "PENDING"
                )));

        mockMvc.perform(get("/approvals/pending")
                        .with(authenticatedUser(8, UserRole.REVIEWER))
                        .param("entityType", "content"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].entityId").value(5))
                .andExpect(jsonPath("$.data[0].status").value("PENDING"));
    }
}
