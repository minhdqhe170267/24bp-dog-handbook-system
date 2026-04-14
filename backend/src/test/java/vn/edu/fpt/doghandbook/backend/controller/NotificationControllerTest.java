package vn.edu.fpt.doghandbook.backend.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import vn.edu.fpt.doghandbook.backend.config.JwtAuthenticationFilter;
import vn.edu.fpt.doghandbook.backend.config.SecurityConfig;
import vn.edu.fpt.doghandbook.backend.dto.response.NotificationResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.service.CustomUserDetailsService;
import vn.edu.fpt.doghandbook.backend.service.NotificationService;
import vn.edu.fpt.doghandbook.backend.util.JwtUtil;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static vn.edu.fpt.doghandbook.backend.controller.ControllerTestSupport.authenticatedUser;
import static vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.TRAINER;

@WebMvcTest(NotificationController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class NotificationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private NotificationService notificationService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void getNotifications_authenticated_returns200AndUsesUserId() throws Exception {
        when(notificationService.getNotifications(7, 0, 20)).thenReturn(samplePage());

        mockMvc.perform(get("/notifications")
                        .with(authenticatedUser(7, TRAINER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].title").value("Follow-up due"));

        verify(notificationService).getNotifications(7, 0, 20);
    }

    @Test
    void getNotifications_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/notifications"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"));
    }

    @Test
    void getUnreadCount_authenticated_returns200() throws Exception {
        when(notificationService.getUnreadCount(7)).thenReturn(3L);

        mockMvc.perform(get("/notifications/unread-count")
                        .with(authenticatedUser(7, TRAINER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.count").value(3));
    }

    @Test
    void markAsRead_authenticated_returns200AndDelegates() throws Exception {
        mockMvc.perform(put("/notifications/11/read")
                        .with(authenticatedUser(7, TRAINER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(notificationService).markAsRead(11L, 7);
    }

    @Test
    void markAllAsRead_authenticated_returns200AndDelegates() throws Exception {
        mockMvc.perform(put("/notifications/read-all")
                        .with(authenticatedUser(7, TRAINER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(notificationService).markAllAsRead(7);
    }

    private PageResponse<NotificationResponse> samplePage() {
        return PageResponse.<NotificationResponse>builder()
                .content(List.of(
                        NotificationResponse.builder()
                                .notificationId(11L)
                                .type("FOLLOWUP_DUE")
                                .title("Follow-up due")
                                .message("Rex needs a follow-up")
                                .entityType("HEALTH_SESSION")
                                .entityId(5)
                                .isRead(false)
                                .createdAt(LocalDateTime.now())
                                .build()
                ))
                .page(0)
                .size(20)
                .totalElements(1)
                .totalPages(1)
                .build();
    }
}
