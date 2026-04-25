package vn.edu.fpt.doghandbook.backend.util;

import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.Authentication;
import vn.edu.fpt.doghandbook.backend.config.CustomUserDetails;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AuthenticationUtilsTest {

    @Test
    void extractUserId_customUserDetailsPrincipal_returnsUserId() {
        CustomUserDetails principal = new CustomUserDetails(sampleUser());
        Authentication authentication = new TestingAuthenticationToken(principal, null, "ROLE_TRAINER");

        Integer userId = AuthenticationUtils.extractUserId(authentication);

        assertThat(userId).isEqualTo(11);
    }

    @Test
    void extractUserId_reflectivePrincipalWithGetUserId_returnsUserId() {
        Authentication authentication = new TestingAuthenticationToken(new PrincipalWithUserId(22L), null);

        Integer userId = AuthenticationUtils.extractUserId(authentication);

        assertThat(userId).isEqualTo(22);
    }

    @Test
    void extractUserId_numericPrincipal_returnsUserId() {
        Authentication authentication = new TestingAuthenticationToken(33, null);

        Integer userId = AuthenticationUtils.extractUserId(authentication);

        assertThat(userId).isEqualTo(33);
    }

    @Test
    void extractUserId_numericStringPrincipal_returnsUserId() {
        Authentication authentication = new TestingAuthenticationToken(" 44 ", null);

        Integer userId = AuthenticationUtils.extractUserId(authentication);

        assertThat(userId).isEqualTo(44);
    }

    @Test
    void extractUserId_nullAuthentication_throwsBadRequestException() {
        assertThatThrownBy(() -> AuthenticationUtils.extractUserId(null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("authenticated user");
    }

    @Test
    void extractUserId_nullPrincipal_throwsBadRequestException() {
        Authentication authentication = mock(Authentication.class);
        when(authentication.getPrincipal()).thenReturn(null);

        assertThatThrownBy(() -> AuthenticationUtils.extractUserId(authentication))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("authenticated user");
    }

    @Test
    void extractUserId_anonymousUserString_throwsBadRequestException() {
        Authentication authentication = new TestingAuthenticationToken("anonymousUser", null);

        assertThatThrownBy(() -> AuthenticationUtils.extractUserId(authentication))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("authenticated user");
    }

    @Test
    void extractUserId_unresolvablePrincipal_throwsBadRequestException() {
        Authentication authentication = new TestingAuthenticationToken(new Object(), null);

        assertThatThrownBy(() -> AuthenticationUtils.extractUserId(authentication))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("resolve userId");
    }

    @Test
    void hasRole_matchingAuthority_returnsTrue() {
        Authentication authentication = new TestingAuthenticationToken("11", null, "ROLE_TRAINER");

        boolean result = AuthenticationUtils.hasRole(authentication, UserRole.TRAINER);

        assertThat(result).isTrue();
    }

    @Test
    void hasRole_missingAuthority_returnsFalse() {
        Authentication authentication = new TestingAuthenticationToken("11", null, "ROLE_ADMIN");

        boolean result = AuthenticationUtils.hasRole(authentication, UserRole.TRAINER);

        assertThat(result).isFalse();
    }

    @Test
    void hasRole_nullAuthentication_returnsFalse() {
        boolean result = AuthenticationUtils.hasRole(null, UserRole.TRAINER);

        assertThat(result).isFalse();
    }

    private User sampleUser() {
        return User.builder()
                .userId(11)
                .username("trainer.alpha")
                .passwordHash("hash")
                .fullName("Trainer Alpha")
                .role(UserRole.TRAINER)
                .build();
    }

    private record PrincipalWithUserId(Long userId) {
        public Long getUserId() {
            return userId;
        }
    }
}
