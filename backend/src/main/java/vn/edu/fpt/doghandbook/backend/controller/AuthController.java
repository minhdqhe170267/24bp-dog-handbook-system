package vn.edu.fpt.doghandbook.backend.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.doghandbook.backend.config.CustomUserDetails;
import vn.edu.fpt.doghandbook.backend.dto.request.ChangePasswordRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.LoginRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.LoginResponse;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.service.AuthService;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ApiResponse<?> login(@Valid @RequestBody LoginRequest request,
                                HttpServletRequest httpRequest) {
        try {
            String ipAddress = getClientIp(httpRequest);
            LoginResponse loginResponse = authService.login(request, ipAddress);
            return ApiResponse.success(loginResponse, "Đăng nhập thành công");
        } catch (BadRequestException e) {
            return ApiResponse.error(e.getMessage());
        }
    }

    @GetMapping("/me")
    public ApiResponse<?> getMe(Authentication authentication) {
        CustomUserDetails customUserDetails = (CustomUserDetails) authentication.getPrincipal();
        User user = customUserDetails.getUser();

        LoginResponse.UserInfo userInfo = LoginResponse.UserInfo.builder()
                .userId(user.getUserId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .militaryRank(user.getMilitaryRank())
                .unit(user.getUnit())
                .build();

        return ApiResponse.success(userInfo);
    }

    @PostMapping("/logout")
    public ApiResponse<?> logout(Authentication authentication, HttpServletRequest httpRequest) {
        CustomUserDetails customUserDetails = (CustomUserDetails) authentication.getPrincipal();
        Integer userId = customUserDetails.getUser().getUserId();
        String ipAddress = getClientIp(httpRequest);

        authService.logout(userId, ipAddress);
        return ApiResponse.success(null, "Đăng xuất thành công. Vui lòng xóa token phía client.");
    }

    @PutMapping("/change-password")
    public ApiResponse<?> changePassword(@Valid @RequestBody ChangePasswordRequest request,
                                         Authentication authentication) {
        CustomUserDetails customUserDetails = (CustomUserDetails) authentication.getPrincipal();
        User currentUser = customUserDetails.getUser();

        if (currentUser.getRole() != UserRole.ADMIN) {
            return ApiResponse.error("Chỉ admin mới có quyền đổi mật khẩu");
        }

        authService.changePassword(currentUser.getUserId(), request.getNewPassword());
        return ApiResponse.success(null, "Đổi mật khẩu thành công");
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
