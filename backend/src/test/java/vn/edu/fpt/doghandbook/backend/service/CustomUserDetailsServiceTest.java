package vn.edu.fpt.doghandbook.backend.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import vn.edu.fpt.doghandbook.backend.config.CustomUserDetails;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CustomUserDetailsServiceTest {

    @Mock private UserRepository userRepository;
    @InjectMocks private CustomUserDetailsService service;

    private User sampleUser() {
        return User.builder()
                .userId(1)
                .username("admin")
                .passwordHash("hash")
                .fullName("Admin User")
                .role(UserRole.ADMIN)
                .isActive(true)
                .isLocked(false)
                .failedLoginCount(0)
                .build();
    }

    // ──────────────────── loadUserByUsername: happy path ────────────────────

    @Test
    void loadUserByUsername_found_returnsCustomUserDetails() {
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(sampleUser()));

        UserDetails result = service.loadUserByUsername("admin");

        assertThat(result).isInstanceOf(CustomUserDetails.class);
        assertThat(result.getUsername()).isEqualTo("admin");
    }

    @Test
    void loadUserByUsername_found_hasCorrectAuthority() {
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(sampleUser()));

        UserDetails result = service.loadUserByUsername("admin");

        assertThat(result.getAuthorities())
                .extracting(a -> a.getAuthority())
                .containsExactly("ROLE_ADMIN");
    }

    @Test
    void loadUserByUsername_trainerRole_hasTrainerAuthority() {
        User trainer = sampleUser();
        trainer.setRole(UserRole.TRAINER);
        when(userRepository.findByUsername("trainer01")).thenReturn(Optional.of(trainer));

        UserDetails result = service.loadUserByUsername("trainer01");

        assertThat(result.getAuthorities())
                .extracting(a -> a.getAuthority())
                .containsExactly("ROLE_TRAINER");
    }

    @Test
    void loadUserByUsername_found_passwordIsHash() {
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(sampleUser()));

        UserDetails result = service.loadUserByUsername("admin");

        assertThat(result.getPassword()).isEqualTo("hash");
    }

    @Test
    void loadUserByUsername_found_accountNonLockedReflectsUser() {
        User user = sampleUser();
        user.setIsLocked(false);
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(user));

        UserDetails result = service.loadUserByUsername("admin");

        assertThat(result.isAccountNonLocked()).isTrue();
    }

    @Test
    void loadUserByUsername_lockedUser_accountNonLockedFalse() {
        User locked = sampleUser();
        locked.setIsLocked(true);
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(locked));

        UserDetails result = service.loadUserByUsername("admin");

        assertThat(result.isAccountNonLocked()).isFalse();
    }

    @Test
    void loadUserByUsername_found_enabledReflectsUser() {
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(sampleUser()));

        UserDetails result = service.loadUserByUsername("admin");

        assertThat(result.isEnabled()).isTrue();
    }

    @Test
    void loadUserByUsername_disabledUser_isEnabledFalse() {
        User disabled = sampleUser();
        disabled.setIsActive(false);
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(disabled));

        UserDetails result = service.loadUserByUsername("admin");

        assertThat(result.isEnabled()).isFalse();
    }

    @Test
    void loadUserByUsername_found_getUserIdAccessible() {
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(sampleUser()));

        UserDetails result = service.loadUserByUsername("admin");

        assertThat(((CustomUserDetails) result).getUserId()).isEqualTo(1);
    }

    @Test
    void loadUserByUsername_callsRepository() {
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(sampleUser()));

        service.loadUserByUsername("admin");

        verify(userRepository).findByUsername("admin");
    }

    // ──────────────────── loadUserByUsername: not found ────────────────────

    @Test
    void loadUserByUsername_notFound_throwsUsernameNotFoundException() {
        when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.loadUserByUsername("ghost"))
                .isInstanceOf(UsernameNotFoundException.class)
                .hasMessageContaining("ghost");
    }

    @Test
    void loadUserByUsername_notFound_messageContainsUsername() {
        when(userRepository.findByUsername("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.loadUserByUsername("missing"))
                .isInstanceOf(UsernameNotFoundException.class)
                .hasMessageContaining("missing");
    }
}
