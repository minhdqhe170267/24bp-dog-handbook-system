package vn.edu.fpt.doghandbook.backend.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import vn.edu.fpt.doghandbook.backend.config.JwtAuthenticationFilter;
import vn.edu.fpt.doghandbook.backend.config.SecurityConfig;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.UserResponse;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.service.CustomUserDetailsService;
import vn.edu.fpt.doghandbook.backend.service.UserManagementService;
import vn.edu.fpt.doghandbook.backend.util.JwtUtil;

import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static vn.edu.fpt.doghandbook.backend.controller.ControllerTestSupport.authenticatedUser;

@WebMvcTest(UserController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserManagementService userManagementService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void getAll_adminReturnsPagedUsers() throws Exception {
        PageResponse<UserResponse> page = PageResponse.<UserResponse>builder()
                .content(List.of(UserResponse.builder()
                        .userId(7)
                        .username("trainer01")
                        .fullName("Trainer One")
                        .role("TRAINER")
                        .isLocked(false)
                        .build()))
                .page(0)
                .size(20)
                .totalElements(1)
                .totalPages(1)
                .build();
        when(userManagementService.getAll(0, 20, null)).thenReturn(page);

        mockMvc.perform(get("/users")
                        .with(authenticatedUser(1, UserRole.ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].userId").value(7))
                .andExpect(jsonPath("$.data.content[0].isLocked").value(false));

        verify(userManagementService).getAll(0, 20, null);
    }

    @Test
    void getAll_trainerReturns403() throws Exception {
        mockMvc.perform(get("/users")
                        .with(authenticatedUser(7, UserRole.TRAINER)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));

        verifyNoInteractions(userManagementService);
    }

    @Test
    void toggleLock_adminReturnsUpdatedUser() throws Exception {
        when(userManagementService.toggleLock(7)).thenReturn(UserResponse.builder()
                .userId(7)
                .username("trainer01")
                .fullName("Trainer One")
                .role("TRAINER")
                .isLocked(true)
                .build());

        mockMvc.perform(put("/users/7/toggle-lock")
                        .with(csrf())
                        .with(authenticatedUser(1, UserRole.ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.userId").value(7))
                .andExpect(jsonPath("$.data.isLocked").value(true));

        verify(userManagementService).toggleLock(7);
    }

    @Test
    void toggleLock_unauthenticatedReturns401() throws Exception {
        mockMvc.perform(put("/users/7/toggle-lock")
                        .with(csrf()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"));
    }
}
