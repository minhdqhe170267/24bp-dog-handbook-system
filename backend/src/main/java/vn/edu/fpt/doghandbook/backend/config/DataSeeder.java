package vn.edu.fpt.doghandbook.backend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.count() == 0) {
            List<User> users = List.of(
                    User.builder()
                            .username("admin01")
                            .passwordHash(passwordEncoder.encode("admin123"))
                            .role(UserRole.ADMIN)
                            .fullName("Admin Hệ Thống")
                            .militaryRank(null)
                            .unit(null)
                            .isActive(true)
                            .isLocked(false)
                            .failedLoginCount(0)
                            .isDeleted(false)
                            .build(),
                    User.builder()
                            .username("editor01")
                            .passwordHash(passwordEncoder.encode("editor123"))
                            .role(UserRole.CONTENT_EDITOR)
                            .fullName("Biên tập viên Trần Văn Phong")
                            .militaryRank(null)
                            .unit(null)
                            .isActive(true)
                            .isLocked(false)
                            .failedLoginCount(0)
                            .isDeleted(false)
                            .build(),
                    User.builder()
                            .username("reviewer01")
                            .passwordHash(passwordEncoder.encode("reviewer123"))
                            .role(UserRole.REVIEWER)
                            .fullName("Phản biện Lê Thị Hoa")
                            .militaryRank(null)
                            .unit(null)
                            .isActive(true)
                            .isLocked(false)
                            .failedLoginCount(0)
                            .isDeleted(false)
                            .build(),
                    User.builder()
                            .username("trainer01")
                            .passwordHash(passwordEncoder.encode("trainer123"))
                            .role(UserRole.TRAINER)
                            .fullName("Nguyễn Văn Kiên")
                            .militaryRank("Trung úy")
                            .unit("Tiểu đoàn 24")
                            .isActive(true)
                            .isLocked(false)
                            .failedLoginCount(0)
                            .isDeleted(false)
                            .build()
            );
            userRepository.saveAll(users);
            log.info("Seeded 4 default users");
        }
    }
}
