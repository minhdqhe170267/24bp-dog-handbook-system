package vn.edu.fpt.doghandbook.backend.controller;

import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import vn.edu.fpt.doghandbook.backend.config.CustomUserDetails;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;

import java.util.Locale;

final class ControllerTestSupport {

    private ControllerTestSupport() {
    }

    static RequestPostProcessor authenticatedUser(Integer userId, UserRole role) {
        String username = role.name().toLowerCase(Locale.ROOT) + userId;
        return authenticatedUser(buildUser(userId, username, role.name(), role));
    }

    static RequestPostProcessor authenticatedUser(User user) {
        return SecurityMockMvcRequestPostProcessors.user(new CustomUserDetails(user));
    }

    static User buildUser(Integer userId, String username, String fullName, UserRole role) {
        return User.builder()
                .userId(userId)
                .username(username)
                .fullName(fullName)
                .passwordHash("hash")
                .role(role)
                .militaryRank("Captain")
                .unit("K9 Unit")
                .isActive(true)
                .isLocked(false)
                .failedLoginCount(0)
                .build();
    }
}
