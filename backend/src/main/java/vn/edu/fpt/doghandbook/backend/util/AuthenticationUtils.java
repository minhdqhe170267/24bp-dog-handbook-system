package vn.edu.fpt.doghandbook.backend.util;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import vn.edu.fpt.doghandbook.backend.config.CustomUserDetails;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;

import java.util.Locale;

public final class AuthenticationUtils {

    private AuthenticationUtils() {
    }

    public static Integer extractUserId(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new BadRequestException("Unable to resolve authenticated user");
        }

        Object principal = authentication.getPrincipal();

        if (principal instanceof CustomUserDetails userDetails) {
            return userDetails.getUserId();
        }

        try {
            Object value = principal.getClass().getMethod("getUserId").invoke(principal);
            if (value instanceof Number number) {
                return number.intValue();
            }
        } catch (ReflectiveOperationException ignored) {
        }

        if (principal instanceof Number number) {
            return number.intValue();
        }

        if (principal instanceof String text) {
            try {
                return Integer.valueOf(text.trim());
            } catch (NumberFormatException ignored) {
                if ("anonymoususer".equals(text.toLowerCase(Locale.ROOT))) {
                    throw new BadRequestException("Unable to resolve authenticated user");
                }
            }
        }

        throw new BadRequestException("Unable to resolve userId from authentication principal");
    }

    public static boolean hasRole(Authentication authentication, UserRole role) {
        if (authentication == null || role == null) {
            return false;
        }

        String expected = "ROLE_" + role.name();
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            if (expected.equals(authority.getAuthority())) {
                return true;
            }
        }
        return false;
    }
}
