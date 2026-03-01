package vn.edu.fpt.doghandbook.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import vn.edu.fpt.doghandbook.backend.dto.request.LoginRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.LoginResponse;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.AuthService;
import vn.edu.fpt.doghandbook.backend.util.JwtUtil;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;

    @Value("${jwt.expiration:86400000}")
    private long jwtExpiration;

    @Override
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new BadRequestException("Tài khoản không tồn tại"));

        if (Boolean.TRUE.equals(user.getIsLocked())) {
            throw new BadRequestException("Tài khoản đã bị khóa sau 5 lần đăng nhập sai");
        }

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new BadRequestException("Tài khoản đã bị vô hiệu hóa");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            int newCount = user.getFailedLoginCount() + 1;
            user.setFailedLoginCount(newCount);
            if (newCount >= 5) {
                user.setIsLocked(true);
                userRepository.save(user);
                throw new BadRequestException("Tài khoản đã bị khóa sau 5 lần đăng nhập sai");
            }
            userRepository.save(user);
            int remaining = 5 - newCount;
            throw new BadRequestException("Sai mật khẩu. Còn " + remaining + " lần thử");
        }

        user.setFailedLoginCount(0);
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        String token = jwtUtil.generateToken(user);

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
    public void changePassword(Integer userId, String currentPassword, String newPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("Người dùng không tồn tại"));

        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new BadRequestException("Mật khẩu hiện tại không đúng");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }
}
