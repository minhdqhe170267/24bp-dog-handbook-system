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
import vn.edu.fpt.doghandbook.backend.dto.request.ChangePasswordRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.LoginRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.LoginResponse;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ErrorCode;
import vn.edu.fpt.doghandbook.backend.service.AuthService;
import vn.edu.fpt.doghandbook.backend.service.CustomUserDetailsService;
import vn.edu.fpt.doghandbook.backend.util.JwtUtil;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
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
import static vn.edu.fpt.doghandbook.backend.controller.ControllerTestSupport.buildUser;

@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void login_validCredentials_returns200() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setUsername("admin01");
        request.setPassword("admin123");

        when(authService.login(any(LoginRequest.class), eq("203.0.113.10"))).thenReturn(LoginResponse.builder()
                .token("jwt-token")
                .expiresIn(86400)
                .user(LoginResponse.UserInfo.builder()
                        .userId(1)
                        .username("admin01")
                        .fullName("Admin One")
                        .role("ADMIN")
                        .militaryRank("Colonel")
                        .unit("HQ")
                        .build())
                .build());

        mockMvc.perform(post("/auth/login")
                        .with(csrf())
                        .header("X-Forwarded-For", "203.0.113.10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").value("jwt-token"))
                .andExpect(jsonPath("$.data.user.username").value("admin01"));

        verify(authService).login(
                argThat(login -> "admin01".equals(login.getUsername()) && "admin123".equals(login.getPassword())),
                eq("203.0.113.10"));
    }

    @Test
    void login_wrongPassword_returns400() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setUsername("admin01");
        request.setPassword("wrongpass");

        when(authService.login(any(LoginRequest.class), eq("203.0.113.11")))
                .thenThrow(new BadRequestException(ErrorCode.WRONG_PASSWORD, "Sai mat khau"));

        mockMvc.perform(post("/auth/login")
                        .with(csrf())
                        .header("X-Forwarded-For", "203.0.113.11")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("WRONG_PASSWORD"));
    }

    @Test
    void getMe_authenticatedReturnsCurrentUser() throws Exception {
        User currentUser = buildUser(1, "admin01", "Admin One", UserRole.ADMIN);
        currentUser.setMilitaryRank("Colonel");
        currentUser.setUnit("HQ");

        mockMvc.perform(get("/auth/me")
                        .with(authenticatedUser(currentUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.userId").value(1))
                .andExpect(jsonPath("$.data.username").value("admin01"))
                .andExpect(jsonPath("$.data.role").value("ADMIN"))
                .andExpect(jsonPath("$.data.militaryRank").value("Colonel"))
                .andExpect(jsonPath("$.data.unit").value("HQ"));
    }

    @Test
    void getMe_unauthenticatedReturns401() throws Exception {
        mockMvc.perform(get("/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"));
    }

    @Test
    void logout_authenticatedDelegatesUserIdAndIp() throws Exception {
        mockMvc.perform(post("/auth/logout")
                        .with(csrf())
                        .with(authenticatedUser(buildUser(1, "admin01", "Admin One", UserRole.ADMIN)))
                        .header("X-Forwarded-For", "198.51.100.20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(authService).logout(1, "198.51.100.20");
    }

    @Test
    void changePassword_adminReturns200() throws Exception {
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setNewPassword("newpass123");

        mockMvc.perform(put("/auth/change-password")
                        .with(csrf())
                        .with(authenticatedUser(buildUser(1, "admin01", "Admin One", UserRole.ADMIN)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(authService).changePassword(1, "newpass123");
    }

    @Test
    void changePassword_trainerReturns403() throws Exception {
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setNewPassword("newpass123");

        mockMvc.perform(put("/auth/change-password")
                        .with(csrf())
                        .with(authenticatedUser(buildUser(7, "trainer01", "Trainer One", UserRole.TRAINER)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));

        verifyNoInteractions(authService);
    }
}
