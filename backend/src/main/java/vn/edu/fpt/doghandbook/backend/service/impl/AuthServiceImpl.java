package vn.edu.fpt.doghandbook.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import vn.edu.fpt.doghandbook.backend.dto.request.LoginRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.LoginResponse;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.AuditActionType;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ErrorCode;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.AuditLogService;
import vn.edu.fpt.doghandbook.backend.service.AuthService;
import vn.edu.fpt.doghandbook.backend.service.SystemSettingService;
import vn.edu.fpt.doghandbook.backend.util.JwtUtil;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;
    private final SystemSettingService systemSettingService;

    @Value("${jwt.expiration:86400000}")
    private long jwtExpiration;

    @Override
    public LoginResponse login(LoginRequest request, String ipAddress) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> {
                    auditLogService.logWithUser(null, ipAddress, AuditActionType.LOGIN_FAILED,
                            "USER", null,
                            "Login failed: account not found for username '" + request.getUsername() + "'");
                    return new BadRequestException(ErrorCode.USER_NOT_FOUND, "Tài khoản không tồn tại");
                });

        int maxAttempts = systemSettingService.getInt("security.max_login_attempts");

        if (Boolean.TRUE.equals(user.getIsLocked())) {
            auditLogService.logWithUser(user, ipAddress, AuditActionType.LOGIN_FAILED,
                    "USER", user.getUserId(), "Login failed: account locked");
            throw new BadRequestException(ErrorCode.USER_LOCKED, "Tài khoản đã bị khóa sau " + maxAttempts + " lần đăng nhập sai");
        }

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            auditLogService.logWithUser(user, ipAddress, AuditActionType.LOGIN_FAILED,
                    "USER", user.getUserId(), "Login failed: account deactivated");
            throw new BadRequestException(ErrorCode.USER_DISABLED, "Tài khoản đã bị vô hiệu hóa");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            int newCount = user.getFailedLoginCount() + 1;
            user.setFailedLoginCount(newCount);
            if (newCount >= maxAttempts && user.getRole() != UserRole.ADMIN) {
                user.setIsLocked(true);
                userRepository.save(user);
                auditLogService.logWithUser(user, ipAddress, AuditActionType.LOGIN_FAILED,
                        "USER", user.getUserId(),
                        "Login failed: wrong password (attempt " + newCount + "), account locked");
                throw new BadRequestException(ErrorCode.USER_LOCKED, "Tài khoản đã bị khóa sau " + maxAttempts + " lần đăng nhập sai");
            }
            userRepository.save(user);
            int remaining = maxAttempts - newCount;
            auditLogService.logWithUser(user, ipAddress, AuditActionType.LOGIN_FAILED,
                    "USER", user.getUserId(),
                    "Login failed: wrong password (attempt " + newCount + ", " + remaining + " remaining)");
            throw new BadRequestException(ErrorCode.WRONG_PASSWORD, "Sai mật khẩu. Còn " + remaining + " lần thử");
        }

        user.setFailedLoginCount(0);
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        String token = jwtUtil.generateToken(user);

        auditLogService.logWithUser(user, ipAddress, AuditActionType.LOGIN,
                "USER", user.getUserId(), "Login successful");

        LoginResponse.UserInfo userInfo = LoginResponse.UserInfo.builder()
                .userId(user.getUserId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .militaryRank(user.getMilitaryRank())
                .unit(user.getUnit())
                .build();

        return LoginResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .expiresIn(jwtExpiration / 1000)
                .user(userInfo)
                .build();
    }

    @Override
    public void changePassword(Integer userId, String newPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException(ErrorCode.USER_NOT_FOUND, "Người dùng không tồn tại"));

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        auditLogService.log(AuditActionType.CHANGE_PASSWORD, "USER", userId, "Password changed");
    }

    @Override
    public void logout(Integer userId, String ipAddress) {
        User user = userRepository.findById(userId).orElse(null);
        auditLogService.logWithUser(user, ipAddress, AuditActionType.LOGOUT,
                "USER", userId, "Logout successful");
    }
}
