package vn.edu.fpt.doghandbook.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import vn.edu.fpt.doghandbook.backend.dto.request.LoginRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.LoginResponse;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.impl.AuthServiceImpl;
import vn.edu.fpt.doghandbook.backend.util.JwtUtil;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {

    @Mock private UserRepository userRepository;
    @Mock private JwtUtil jwtUtil;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private AuditLogService auditLogService;
    @Mock private SystemSettingService systemSettingService;

    @InjectMocks private AuthServiceImpl authService;

    private User activeUser;
    private LoginRequest loginRequest;

    @BeforeEach
    void setUp() {
        activeUser = User.builder()
                .userId(1)
                .username("trainer01")
                .passwordHash("hashedPwd")
                .fullName("Nguyen Van A")
                .role(UserRole.TRAINER)
                .militaryRank("Trung si")
                .unit("D1")
                .isActive(true)
                .isLocked(false)
                .failedLoginCount(0)
                .build();

        loginRequest = new LoginRequest();
        loginRequest.setUsername("trainer01");
        loginRequest.setPassword("password123");
    }

    // ──────────────────── login: happy path ────────────────────

    @Test
    void login_success_returnsTokenAndUserInfo() {
        when(userRepository.findByUsername("trainer01")).thenReturn(Optional.of(activeUser));
        when(systemSettingService.getInt("security.max_login_attempts")).thenReturn(5);
        when(passwordEncoder.matches("password123", "hashedPwd")).thenReturn(true);
        when(jwtUtil.generateToken(activeUser)).thenReturn("jwt-token-123");
        when(userRepository.save(any(User.class))).thenReturn(activeUser);

        LoginResponse response = authService.login(loginRequest, "127.0.0.1");

        assertThat(response.getToken()).isEqualTo("jwt-token-123");
        assertThat(response.getTokenType()).isEqualTo("Bearer");
        assertThat(response.getUser().getUserId()).isEqualTo(1);
        assertThat(response.getUser().getUsername()).isEqualTo("trainer01");
        assertThat(response.getUser().getRole()).isEqualTo("TRAINER");
    }

    @Test
    void login_success_resetsFailedCount() {
        activeUser.setFailedLoginCount(3);
        when(userRepository.findByUsername("trainer01")).thenReturn(Optional.of(activeUser));
        when(systemSettingService.getInt("security.max_login_attempts")).thenReturn(5);
        when(passwordEncoder.matches("password123", "hashedPwd")).thenReturn(true);
        when(jwtUtil.generateToken(activeUser)).thenReturn("token");
        when(userRepository.save(any(User.class))).thenReturn(activeUser);

        authService.login(loginRequest, "127.0.0.1");

        assertThat(activeUser.getFailedLoginCount()).isZero();
        assertThat(activeUser.getLastLoginAt()).isNotNull();
        verify(userRepository).save(activeUser);
    }

    @Test
    void login_success_logsAuditEntry() {
        when(userRepository.findByUsername("trainer01")).thenReturn(Optional.of(activeUser));
        when(systemSettingService.getInt("security.max_login_attempts")).thenReturn(5);
        when(passwordEncoder.matches("password123", "hashedPwd")).thenReturn(true);
        when(jwtUtil.generateToken(activeUser)).thenReturn("token");
        when(userRepository.save(any(User.class))).thenReturn(activeUser);

        authService.login(loginRequest, "10.0.0.1");

        verify(auditLogService).logWithUser(eq(activeUser), eq("10.0.0.1"), any(), eq("USER"), eq(1), eq("Login successful"));
    }

    @Test
    void login_success_returnsUserInfoFields() {
        activeUser.setMilitaryRank("Thuong si");
        activeUser.setUnit("D2");
        when(userRepository.findByUsername("trainer01")).thenReturn(Optional.of(activeUser));
        when(systemSettingService.getInt("security.max_login_attempts")).thenReturn(5);
        when(passwordEncoder.matches("password123", "hashedPwd")).thenReturn(true);
        when(jwtUtil.generateToken(activeUser)).thenReturn("token");
        when(userRepository.save(any(User.class))).thenReturn(activeUser);

        LoginResponse response = authService.login(loginRequest, "127.0.0.1");

        assertThat(response.getUser().getFullName()).isEqualTo("Nguyen Van A");
        assertThat(response.getUser().getMilitaryRank()).isEqualTo("Thuong si");
        assertThat(response.getUser().getUnit()).isEqualTo("D2");
    }

    @Test
    void login_success_expiresInIsPositive() {
        when(userRepository.findByUsername("trainer01")).thenReturn(Optional.of(activeUser));
        when(systemSettingService.getInt("security.max_login_attempts")).thenReturn(5);
        when(passwordEncoder.matches("password123", "hashedPwd")).thenReturn(true);
        when(jwtUtil.generateToken(activeUser)).thenReturn("token");
        when(userRepository.save(any(User.class))).thenReturn(activeUser);

        LoginResponse response = authService.login(loginRequest, "127.0.0.1");

        assertThat(response.getExpiresIn()).isGreaterThanOrEqualTo(0);
    }

    // ──────────────────── login: user not found ────────────────────

    @Test
    void login_userNotFound_throwsBadRequest() {
        when(userRepository.findByUsername("unknown")).thenReturn(Optional.empty());
        loginRequest.setUsername("unknown");

        assertThatThrownBy(() -> authService.login(loginRequest, "127.0.0.1"))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void login_userNotFound_logsFailedAttempt() {
        when(userRepository.findByUsername("unknown")).thenReturn(Optional.empty());
        loginRequest.setUsername("unknown");

        try { authService.login(loginRequest, "10.0.0.1"); } catch (BadRequestException ignored) {}

        verify(auditLogService).logWithUser(isNull(), eq("10.0.0.1"), any(), eq("USER"), isNull(), contains("unknown"));
    }

    @Test
    void login_userNotFound_doesNotSave() {
        when(userRepository.findByUsername("nope")).thenReturn(Optional.empty());
        loginRequest.setUsername("nope");

        try { authService.login(loginRequest, "127.0.0.1"); } catch (BadRequestException ignored) {}

        verify(userRepository, never()).save(any());
    }

    @Test
    void login_userNotFound_doesNotGenerateToken() {
        when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());
        loginRequest.setUsername("ghost");

        try { authService.login(loginRequest, "127.0.0.1"); } catch (BadRequestException ignored) {}

        verifyNoInteractions(jwtUtil);
    }

    @Test
    void login_userNotFound_doesNotCheckPassword() {
        when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());
        loginRequest.setUsername("ghost");

        try { authService.login(loginRequest, "127.0.0.1"); } catch (BadRequestException ignored) {}

        verifyNoInteractions(passwordEncoder);
    }

    // ──────────────────── login: locked account ────────────────────

    @Test
    void login_lockedUser_throwsBadRequest() {
        activeUser.setIsLocked(true);
        when(userRepository.findByUsername("trainer01")).thenReturn(Optional.of(activeUser));
        when(systemSettingService.getInt("security.max_login_attempts")).thenReturn(5);

        assertThatThrownBy(() -> authService.login(loginRequest, "127.0.0.1"))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void login_lockedUser_doesNotCheckPassword() {
        activeUser.setIsLocked(true);
        when(userRepository.findByUsername("trainer01")).thenReturn(Optional.of(activeUser));
        when(systemSettingService.getInt("security.max_login_attempts")).thenReturn(5);

        try { authService.login(loginRequest, "127.0.0.1"); } catch (BadRequestException ignored) {}

        verifyNoInteractions(passwordEncoder);
    }

    @Test
    void login_lockedUser_logsFailedAttempt() {
        activeUser.setIsLocked(true);
        when(userRepository.findByUsername("trainer01")).thenReturn(Optional.of(activeUser));
        when(systemSettingService.getInt("security.max_login_attempts")).thenReturn(5);

        try { authService.login(loginRequest, "10.0.0.1"); } catch (BadRequestException ignored) {}

        verify(auditLogService).logWithUser(eq(activeUser), eq("10.0.0.1"), any(), eq("USER"), eq(1), contains("locked"));
    }

    @Test
    void login_lockedUser_doesNotGenerateToken() {
        activeUser.setIsLocked(true);
        when(userRepository.findByUsername("trainer01")).thenReturn(Optional.of(activeUser));
        when(systemSettingService.getInt("security.max_login_attempts")).thenReturn(5);

        try { authService.login(loginRequest, "127.0.0.1"); } catch (BadRequestException ignored) {}

        verifyNoInteractions(jwtUtil);
    }

    @Test
    void login_lockedUser_doesNotSave() {
        activeUser.setIsLocked(true);
        when(userRepository.findByUsername("trainer01")).thenReturn(Optional.of(activeUser));
        when(systemSettingService.getInt("security.max_login_attempts")).thenReturn(5);

        try { authService.login(loginRequest, "127.0.0.1"); } catch (BadRequestException ignored) {}

        verify(userRepository, never()).save(any());
    }

    // ──────────────────── login: disabled account ────────────────────

    @Test
    void login_disabledUser_throwsBadRequest() {
        activeUser.setIsActive(false);
        when(userRepository.findByUsername("trainer01")).thenReturn(Optional.of(activeUser));
        when(systemSettingService.getInt("security.max_login_attempts")).thenReturn(5);

        assertThatThrownBy(() -> authService.login(loginRequest, "127.0.0.1"))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void login_disabledUser_doesNotCheckPassword() {
        activeUser.setIsActive(false);
        when(userRepository.findByUsername("trainer01")).thenReturn(Optional.of(activeUser));
        when(systemSettingService.getInt("security.max_login_attempts")).thenReturn(5);

        try { authService.login(loginRequest, "127.0.0.1"); } catch (BadRequestException ignored) {}

        verifyNoInteractions(passwordEncoder);
    }

    @Test
    void login_disabledUser_logsFailedAttempt() {
        activeUser.setIsActive(false);
        when(userRepository.findByUsername("trainer01")).thenReturn(Optional.of(activeUser));
        when(systemSettingService.getInt("security.max_login_attempts")).thenReturn(5);

        try { authService.login(loginRequest, "127.0.0.1"); } catch (BadRequestException ignored) {}

        verify(auditLogService).logWithUser(eq(activeUser), any(), any(), eq("USER"), eq(1), contains("deactivated"));
    }

    @Test
    void login_disabledUser_doesNotSave() {
        activeUser.setIsActive(false);
        when(userRepository.findByUsername("trainer01")).thenReturn(Optional.of(activeUser));
        when(systemSettingService.getInt("security.max_login_attempts")).thenReturn(5);

        try { authService.login(loginRequest, "127.0.0.1"); } catch (BadRequestException ignored) {}

        verify(userRepository, never()).save(any());
    }

    @Test
    void login_activeNullTreatedAsDisabled_throwsBadRequest() {
        activeUser.setIsActive(null);
        when(userRepository.findByUsername("trainer01")).thenReturn(Optional.of(activeUser));
        when(systemSettingService.getInt("security.max_login_attempts")).thenReturn(5);

        assertThatThrownBy(() -> authService.login(loginRequest, "127.0.0.1"))
                .isInstanceOf(BadRequestException.class);
    }

    // ──────────────────── login: wrong password ────────────────────

    @Test
    void login_wrongPassword_incrementsFailedCount() {
        when(userRepository.findByUsername("trainer01")).thenReturn(Optional.of(activeUser));
        when(systemSettingService.getInt("security.max_login_attempts")).thenReturn(5);
        when(passwordEncoder.matches("password123", "hashedPwd")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenReturn(activeUser);

        try { authService.login(loginRequest, "127.0.0.1"); } catch (BadRequestException ignored) {}

        assertThat(activeUser.getFailedLoginCount()).isEqualTo(1);
        verify(userRepository).save(activeUser);
    }

    @Test
    void login_wrongPassword_throwsBadRequest() {
        when(userRepository.findByUsername("trainer01")).thenReturn(Optional.of(activeUser));
        when(systemSettingService.getInt("security.max_login_attempts")).thenReturn(5);
        when(passwordEncoder.matches("password123", "hashedPwd")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenReturn(activeUser);

        assertThatThrownBy(() -> authService.login(loginRequest, "127.0.0.1"))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void login_wrongPassword_doesNotGenerateToken() {
        when(userRepository.findByUsername("trainer01")).thenReturn(Optional.of(activeUser));
        when(systemSettingService.getInt("security.max_login_attempts")).thenReturn(5);
        when(passwordEncoder.matches("password123", "hashedPwd")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenReturn(activeUser);

        try { authService.login(loginRequest, "127.0.0.1"); } catch (BadRequestException ignored) {}

        verifyNoInteractions(jwtUtil);
    }

    @Test
    void login_wrongPasswordReachesMax_locksAccount() {
        activeUser.setFailedLoginCount(4);
        when(userRepository.findByUsername("trainer01")).thenReturn(Optional.of(activeUser));
        when(systemSettingService.getInt("security.max_login_attempts")).thenReturn(5);
        when(passwordEncoder.matches("password123", "hashedPwd")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenReturn(activeUser);

        try { authService.login(loginRequest, "127.0.0.1"); } catch (BadRequestException ignored) {}

        assertThat(activeUser.getIsLocked()).isTrue();
        assertThat(activeUser.getFailedLoginCount()).isEqualTo(5);
    }

    @Test
    void login_wrongPasswordAdminNeverLocked() {
        activeUser.setRole(UserRole.ADMIN);
        activeUser.setFailedLoginCount(99);
        when(userRepository.findByUsername("trainer01")).thenReturn(Optional.of(activeUser));
        when(systemSettingService.getInt("security.max_login_attempts")).thenReturn(5);
        when(passwordEncoder.matches("password123", "hashedPwd")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenReturn(activeUser);

        try { authService.login(loginRequest, "127.0.0.1"); } catch (BadRequestException ignored) {}

        assertThat(activeUser.getIsLocked()).isFalse();
    }

    // ──────────────────── changePassword ────────────────────

    @Test
    void changePassword_success_encodesAndSaves() {
        when(userRepository.findById(1)).thenReturn(Optional.of(activeUser));
        when(passwordEncoder.encode("newPass")).thenReturn("newHash");
        when(userRepository.save(any(User.class))).thenReturn(activeUser);

        authService.changePassword(1, "newPass");

        assertThat(activeUser.getPasswordHash()).isEqualTo("newHash");
        verify(userRepository).save(activeUser);
        verify(auditLogService).log(any(), eq("USER"), eq(1), eq("Password changed"));
    }

    @Test
    void changePassword_success_logsAudit() {
        when(userRepository.findById(1)).thenReturn(Optional.of(activeUser));
        when(passwordEncoder.encode("newPass")).thenReturn("newHash");
        when(userRepository.save(any(User.class))).thenReturn(activeUser);

        authService.changePassword(1, "newPass");

        verify(auditLogService).log(any(), eq("USER"), eq(1), eq("Password changed"));
    }

    @Test
    void changePassword_userNotFound_throwsBadRequest() {
        when(userRepository.findById(99)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.changePassword(99, "newPass"))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void changePassword_userNotFound_doesNotEncode() {
        when(userRepository.findById(99)).thenReturn(Optional.empty());

        try { authService.changePassword(99, "x"); } catch (BadRequestException ignored) {}

        verifyNoInteractions(passwordEncoder);
    }

    @Test
    void changePassword_userNotFound_doesNotLog() {
        when(userRepository.findById(99)).thenReturn(Optional.empty());

        try { authService.changePassword(99, "x"); } catch (BadRequestException ignored) {}

        verify(auditLogService, never()).log(any(), anyString(), any(), anyString());
    }

    // ──────────────────── logout ────────────────────

    @Test
    void logout_existingUser_logsAudit() {
        when(userRepository.findById(1)).thenReturn(Optional.of(activeUser));

        authService.logout(1, "10.0.0.1");

        verify(auditLogService).logWithUser(eq(activeUser), eq("10.0.0.1"), any(), eq("USER"), eq(1), eq("Logout successful"));
    }

    @Test
    void logout_userNotFound_logsWithNull() {
        when(userRepository.findById(99)).thenReturn(Optional.empty());

        authService.logout(99, "10.0.0.1");

        verify(auditLogService).logWithUser(isNull(), eq("10.0.0.1"), any(), eq("USER"), eq(99), eq("Logout successful"));
    }

    @Test
    void logout_doesNotThrowEvenIfUserMissing() {
        when(userRepository.findById(99)).thenReturn(Optional.empty());

        authService.logout(99, "10.0.0.1");

        // no exception thrown
        verify(auditLogService).logWithUser(any(), any(), any(), any(), any(), any());
    }

    @Test
    void logout_neverSavesUser() {
        when(userRepository.findById(1)).thenReturn(Optional.of(activeUser));

        authService.logout(1, "10.0.0.1");

        verify(userRepository, never()).save(any());
    }

    @Test
    void logout_neverGeneratesToken() {
        when(userRepository.findById(1)).thenReturn(Optional.of(activeUser));

        authService.logout(1, "10.0.0.1");

        verifyNoInteractions(jwtUtil);
    }
}
