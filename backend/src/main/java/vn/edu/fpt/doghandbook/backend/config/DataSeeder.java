package vn.edu.fpt.doghandbook.backend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.fpt.doghandbook.backend.entity.TrainingSpecialty;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.repository.TrainingSpecialtyRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private static final String DEFAULT_PASSWORD = "123456";

    private final UserRepository userRepository;
    private final TrainingSpecialtyRepository trainingSpecialtyRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        resetExistingPasswords();

        TrainingSpecialty generalSpecialty = ensureSpecialty(
                "GENERAL",
                "General Training",
                "Fallback specialty for base training library."
        );

        ensureTestUser("admin01", "admin123", UserRole.ADMIN, "Admin He Thong", null, null, null);
        ensureTestUser("editor01", "editor123", UserRole.CONTENT_EDITOR, "Bien tap vien Tran Van Phong", null, null, null);
        ensureTestUser("reviewer01", "reviewer123", UserRole.REVIEWER, "Phan bien Le Thi Hoa", null, null, null);
        ensureTestUser(
                "trainer01",
                "trainer123",
                UserRole.TRAINER,
                "Nguyen Van Kien",
                "Trung uy",
                "Tieu doan 24",
                generalSpecialty
        );
    }

    private void resetExistingPasswords() {
        for (String username : new String[] {
                "admin.dhs", "trainer.minh", "trainer.huong", "trainer.duc",
                "editor.lan", "editor.tuan", "reviewer.hung"
        }) {
            userRepository.findByUsername(username).ifPresent(user -> {
                if (!passwordEncoder.matches(DEFAULT_PASSWORD, user.getPasswordHash())) {
                    user.setPasswordHash(passwordEncoder.encode(DEFAULT_PASSWORD));
                    user.setFailedLoginCount(0);
                    user.setIsLocked(false);
                    userRepository.save(user);
                }
            });
        }
    }

    private TrainingSpecialty ensureSpecialty(String code, String name, String description) {
        TrainingSpecialty specialty = trainingSpecialtyRepository.findBySpecialtyCodeIgnoreCaseAndIsDeletedFalse(code)
                .orElseGet(TrainingSpecialty::new);
        specialty.setSpecialtyCode(code);
        specialty.setSpecialtyName(name);
        specialty.setDescription(description);
        specialty.setIsActive(true);
        specialty.setIsDeleted(false);
        if (specialty.getVersion() == null || specialty.getVersion() <= 0) {
            specialty.setVersion(1);
        }
        return trainingSpecialtyRepository.save(specialty);
    }

    private User ensureTestUser(
            String username,
            String password,
            UserRole role,
            String fullName,
            String militaryRank,
            String unit,
            TrainingSpecialty specialty
    ) {
        User user = userRepository.findByUsername(username).orElseGet(User::new);
        user.setUsername(username);
        if (user.getUserId() == null) {
            user.setPasswordHash(passwordEncoder.encode(password));
        }
        user.setRole(role);
        user.setFullName(fullName);
        user.setMilitaryRank(militaryRank);
        user.setUnit(unit);
        user.setTrainingSpecialty(role == UserRole.TRAINER ? specialty : null);
        user.setIsActive(true);
        user.setIsLocked(false);
        user.setFailedLoginCount(0);
        user.setIsDeleted(false);
        return userRepository.save(user);
    }
}
