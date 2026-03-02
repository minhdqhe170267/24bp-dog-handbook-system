package vn.edu.fpt.doghandbook.backend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;

import java.util.Map;
import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    private static final String DEFAULT_PASSWORD = "123456";

    @Override
    public void run(String... args) {
        // Reset password for existing mock users (user_id 1-7)
        resetExistingPasswords();

        // Ensure 4 test users exist
        ensureTestUser("admin01", "admin123", UserRole.ADMIN, "Admin Hệ Thống", null, null);
        ensureTestUser("editor01", "editor123", UserRole.CONTENT_EDITOR, "Biên tập viên Trần Văn Phong", null, null);
        ensureTestUser("reviewer01", "reviewer123", UserRole.REVIEWER, "Phản biện Lê Thị Hoa", null, null);
        ensureTestUser("trainer01", "trainer123", UserRole.TRAINER, "Nguyễn Văn Kiên", "Trung úy", "Tiểu đoàn 24");
    }

    private void resetExistingPasswords() {
        Map<String, String> mockUsers = Map.of(
                "admin.dhs", DEFAULT_PASSWORD,
                "trainer.minh", DEFAULT_PASSWORD,
                "trainer.huong", DEFAULT_PASSWORD,
                "trainer.duc", DEFAULT_PASSWORD,
                "editor.lan", DEFAULT_PASSWORD,
                "editor.tuan", DEFAULT_PASSWORD,
                "reviewer.hung", DEFAULT_PASSWORD
        );

        String encodedDefault = passwordEncoder.encode(DEFAULT_PASSWORD);
        int updated = 0;

        for (String username : mockUsers.keySet()) {
            Optional<User> opt = userRepository.findByUsername(username);
            if (opt.isPresent()) {
                User user = opt.get();
                if (!passwordEncoder.matches(DEFAULT_PASSWORD, user.getPasswordHash())) {
                    user.setPasswordHash(encodedDefault);
                    user.setFailedLoginCount(0);
                    user.setIsLocked(false);
                    userRepository.save(user);
                    updated++;
                }
            }
        }

        if (updated > 0) {
            log.info("Reset password to '{}' for {} existing mock users", DEFAULT_PASSWORD, updated);
        }
    }

    private void ensureTestUser(String username, String password, UserRole role,
                                String fullName, String militaryRank, String unit) {
        if (userRepository.findByUsername(username).isPresent()) {
            return;
        }

        User user = User.builder()
                .username(username)
                .passwordHash(passwordEncoder.encode(password))
                .role(role)
                .fullName(fullName)
                .militaryRank(militaryRank)
                .unit(unit)
                .isActive(true)
                .isLocked(false)
                .failedLoginCount(0)
                .isDeleted(false)
                .build();

        userRepository.save(user);
        log.info("Seeded test user: {} / {} ({})", username, password, role);
    }
}
