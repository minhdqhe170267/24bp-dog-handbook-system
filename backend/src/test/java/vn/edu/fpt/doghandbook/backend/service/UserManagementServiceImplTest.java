package vn.edu.fpt.doghandbook.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import vn.edu.fpt.doghandbook.backend.dto.request.UserRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.UserResponse;
import vn.edu.fpt.doghandbook.backend.entity.TrainingSpecialty;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ConflictException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.TrainingSpecialtyRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.impl.UserManagementServiceImpl;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserManagementServiceImplTest {

    @Mock private UserRepository userRepository;
    @Mock private TrainingSpecialtyRepository trainingSpecialtyRepository;
    @Mock private PasswordEncoder passwordEncoder;

    @InjectMocks private UserManagementServiceImpl service;

    private User user;
    private TrainingSpecialty specialty;

    @BeforeEach
    void setUp() {
        specialty = TrainingSpecialty.builder()
                .specialtyId(1)
                .specialtyName("Patrol")
                .build();

        user = User.builder()
                .userId(1)
                .username("trainer01")
                .passwordHash("hash")
                .fullName("Nguyen Van A")
                .role(UserRole.TRAINER)
                .trainingSpecialty(specialty)
                .isActive(true)
                .isLocked(false)
                .failedLoginCount(0)
                .build();
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        user.setIsDeleted(false);
    }

    // ──────────────────── getAll ────────────────────

    @Test
    void getAll_noSearch_returnsPage() {
        Page<User> page = new PageImpl<>(List.of(user), PageRequest.of(0, 10), 1);
        when(userRepository.findByIsDeletedFalse(any())).thenReturn(page);

        PageResponse result = service.getAll(0, 10, null);

        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    void getAll_withSearch_callsSearchQuery() {
        Page<User> page = new PageImpl<>(List.of(user), PageRequest.of(0, 10), 1);
        when(userRepository.findByFullNameContainingIgnoreCaseAndIsDeletedFalse(anyString(), any()))
                .thenReturn(page);

        service.getAll(0, 10, "Nguyen");

        verify(userRepository).findByFullNameContainingIgnoreCaseAndIsDeletedFalse(eq("Nguyen"), any());
        verify(userRepository, never()).findByIsDeletedFalse(any());
    }

    @Test
    void getAll_blankSearch_treatsAsNoSearch() {
        Page<User> page = new PageImpl<>(List.of(), PageRequest.of(0, 10), 0);
        when(userRepository.findByIsDeletedFalse(any())).thenReturn(page);

        service.getAll(0, 10, "   ");

        verify(userRepository).findByIsDeletedFalse(any());
    }

    @Test
    void getAll_emptyResult_returnsEmptyPage() {
        Page<User> page = new PageImpl<>(List.of(), PageRequest.of(0, 10), 0);
        when(userRepository.findByIsDeletedFalse(any())).thenReturn(page);

        PageResponse result = service.getAll(0, 10, null);

        assertThat(result.getTotalElements()).isZero();
        assertThat(result.getContent()).isEmpty();
    }

    @Test
    void getAll_mapsUserResponseCorrectly() {
        Page<User> page = new PageImpl<>(List.of(user), PageRequest.of(0, 10), 1);
        when(userRepository.findByIsDeletedFalse(any())).thenReturn(page);

        PageResponse result = service.getAll(0, 10, null);
        UserResponse resp = (UserResponse) result.getContent().get(0);

        assertThat(resp.getUsername()).isEqualTo("trainer01");
        assertThat(resp.getRole()).isEqualTo("TRAINER");
        assertThat(resp.getSpecialtyName()).isEqualTo("Patrol");
    }

    // ──────────────────── getById ────────────────────

    @Test
    void getById_found_returnsResponse() {
        when(userRepository.findByUserIdAndIsDeletedFalse(1)).thenReturn(Optional.of(user));

        UserResponse result = service.getById(1);

        assertThat(result.getUserId()).isEqualTo(1);
        assertThat(result.getUsername()).isEqualTo("trainer01");
    }

    @Test
    void getById_notFound_throwsResourceNotFound() {
        when(userRepository.findByUserIdAndIsDeletedFalse(99)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getById(99))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getById_mapsSpecialtyFields() {
        when(userRepository.findByUserIdAndIsDeletedFalse(1)).thenReturn(Optional.of(user));

        UserResponse result = service.getById(1);

        assertThat(result.getSpecialtyId()).isEqualTo(1);
        assertThat(result.getSpecialtyName()).isEqualTo("Patrol");
    }

    @Test
    void getById_noSpecialty_returnsNullSpecialtyFields() {
        user.setTrainingSpecialty(null);
        when(userRepository.findByUserIdAndIsDeletedFalse(1)).thenReturn(Optional.of(user));

        UserResponse result = service.getById(1);

        assertThat(result.getSpecialtyId()).isNull();
        assertThat(result.getSpecialtyName()).isNull();
    }

    @Test
    void getById_mapsAllFields() {
        user.setEmail("test@fpt.edu.vn");
        user.setPhone("0901234567");
        user.setMilitaryRank("Trung si");
        user.setUnit("D1");
        when(userRepository.findByUserIdAndIsDeletedFalse(1)).thenReturn(Optional.of(user));

        UserResponse result = service.getById(1);

        assertThat(result.getEmail()).isEqualTo("test@fpt.edu.vn");
        assertThat(result.getPhone()).isEqualTo("0901234567");
        assertThat(result.getMilitaryRank()).isEqualTo("Trung si");
        assertThat(result.getUnit()).isEqualTo("D1");
    }

    // ──────────────────── create ────────────────────

    @Test
    void create_success_savesUser() {
        UserRequest request = trainerRequest();
        when(userRepository.existsByUsername("newuser")).thenReturn(false);
        when(trainingSpecialtyRepository.findBySpecialtyIdAndIsDeletedFalse(1)).thenReturn(Optional.of(specialty));
        when(passwordEncoder.encode("password123")).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenReturn(user);

        UserResponse result = service.create(request);

        assertThat(result).isNotNull();
        verify(userRepository).save(any(User.class));
    }

    @Test
    void create_duplicateUsername_throwsConflict() {
        UserRequest request = trainerRequest();
        when(userRepository.existsByUsername("newuser")).thenReturn(true);

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void create_noPassword_throwsBadRequest() {
        UserRequest request = trainerRequest();
        request.setPassword(null);

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void create_blankPassword_throwsBadRequest() {
        UserRequest request = trainerRequest();
        request.setPassword("   ");

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void create_invalidRole_throwsBadRequest() {
        UserRequest request = trainerRequest();
        request.setRole("INVALID_ROLE");
        when(userRepository.existsByUsername("newuser")).thenReturn(false);

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void create_trainerWithoutSpecialty_throwsBadRequest() {
        UserRequest request = trainerRequest();
        request.setSpecialtyId(null);
        when(userRepository.existsByUsername("newuser")).thenReturn(false);

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void create_adminNoSpecialtyRequired_succeeds() {
        UserRequest request = trainerRequest();
        request.setRole("ADMIN");
        request.setSpecialtyId(null);
        when(userRepository.existsByUsername("newuser")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenReturn(user);

        UserResponse result = service.create(request);

        assertThat(result).isNotNull();
    }

    // ──────────────────── update ────────────────────

    @Test
    void update_success_updatesFields() {
        UserRequest request = trainerRequest();
        request.setUsername("trainer01");
        request.setFullName("Updated Name");
        when(userRepository.findByUserIdAndIsDeletedFalse(1)).thenReturn(Optional.of(user));
        when(trainingSpecialtyRepository.findBySpecialtyIdAndIsDeletedFalse(1)).thenReturn(Optional.of(specialty));
        when(userRepository.save(any(User.class))).thenReturn(user);

        service.update(1, request);

        assertThat(user.getFullName()).isEqualTo("Updated Name");
    }

    @Test
    void update_notFound_throwsResourceNotFound() {
        when(userRepository.findByUserIdAndIsDeletedFalse(99)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(99, trainerRequest()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void update_duplicateUsername_throwsConflict() {
        UserRequest request = trainerRequest();
        request.setUsername("taken");
        when(userRepository.findByUserIdAndIsDeletedFalse(1)).thenReturn(Optional.of(user));
        when(userRepository.existsByUsername("taken")).thenReturn(true);

        assertThatThrownBy(() -> service.update(1, request))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void update_sameUsername_noConflictCheck() {
        UserRequest request = trainerRequest();
        request.setUsername("trainer01");
        when(userRepository.findByUserIdAndIsDeletedFalse(1)).thenReturn(Optional.of(user));
        when(trainingSpecialtyRepository.findBySpecialtyIdAndIsDeletedFalse(1)).thenReturn(Optional.of(specialty));
        when(userRepository.save(any(User.class))).thenReturn(user);

        service.update(1, request);

        verify(userRepository, never()).existsByUsername(anyString());
    }

    @Test
    void update_withNewPassword_encodesPassword() {
        UserRequest request = trainerRequest();
        request.setUsername("trainer01");
        request.setPassword("newpass");
        when(userRepository.findByUserIdAndIsDeletedFalse(1)).thenReturn(Optional.of(user));
        when(trainingSpecialtyRepository.findBySpecialtyIdAndIsDeletedFalse(1)).thenReturn(Optional.of(specialty));
        when(passwordEncoder.encode("newpass")).thenReturn("newencoded");
        when(userRepository.save(any(User.class))).thenReturn(user);

        service.update(1, request);

        assertThat(user.getPasswordHash()).isEqualTo("newencoded");
    }

    @Test
    void update_noPassword_doesNotChangeHash() {
        String originalHash = user.getPasswordHash();
        UserRequest request = trainerRequest();
        request.setUsername("trainer01");
        request.setPassword(null);
        when(userRepository.findByUserIdAndIsDeletedFalse(1)).thenReturn(Optional.of(user));
        when(trainingSpecialtyRepository.findBySpecialtyIdAndIsDeletedFalse(1)).thenReturn(Optional.of(specialty));
        when(userRepository.save(any(User.class))).thenReturn(user);

        service.update(1, request);

        assertThat(user.getPasswordHash()).isEqualTo(originalHash);
        verifyNoInteractions(passwordEncoder);
    }

    // ──────────────────── delete ────────────────────

    @Test
    void delete_success_softDeletes() {
        when(userRepository.findByUserIdAndIsDeletedFalse(1)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenReturn(user);

        service.delete(1);

        assertThat(user.getIsDeleted()).isTrue();
        assertThat(user.getDeletedAt()).isNotNull();
    }

    @Test
    void delete_notFound_throwsResourceNotFound() {
        when(userRepository.findByUserIdAndIsDeletedFalse(99)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(99))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void delete_notFound_doesNotSave() {
        when(userRepository.findByUserIdAndIsDeletedFalse(99)).thenReturn(Optional.empty());

        try { service.delete(99); } catch (ResourceNotFoundException ignored) {}

        verify(userRepository, never()).save(any());
    }

    @Test
    void delete_success_savesUser() {
        when(userRepository.findByUserIdAndIsDeletedFalse(1)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenReturn(user);

        service.delete(1);

        verify(userRepository).save(user);
    }

    @Test
    void delete_setsDeletedAtToNow() {
        LocalDateTime before = LocalDateTime.now().minusSeconds(1);
        when(userRepository.findByUserIdAndIsDeletedFalse(1)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenReturn(user);

        service.delete(1);

        assertThat(user.getDeletedAt()).isAfter(before);
    }

    // ──────────────────── toggleLock ────────────────────

    @Test
    void toggleLock_unlockedUser_locksIt() {
        user.setIsLocked(false);
        when(userRepository.findByUserIdAndIsDeletedFalse(1)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenReturn(user);

        service.toggleLock(1);

        assertThat(user.getIsLocked()).isTrue();
    }

    @Test
    void toggleLock_lockedUser_unlocksAndResetsFailedCount() {
        user.setIsLocked(true);
        user.setFailedLoginCount(5);
        when(userRepository.findByUserIdAndIsDeletedFalse(1)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenReturn(user);

        service.toggleLock(1);

        assertThat(user.getIsLocked()).isFalse();
        assertThat(user.getFailedLoginCount()).isZero();
    }

    @Test
    void toggleLock_notFound_throwsResourceNotFound() {
        when(userRepository.findByUserIdAndIsDeletedFalse(99)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.toggleLock(99))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void toggleLock_savesUser() {
        when(userRepository.findByUserIdAndIsDeletedFalse(1)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenReturn(user);

        service.toggleLock(1);

        verify(userRepository).save(user);
    }

    @Test
    void toggleLock_returnsUserResponse() {
        when(userRepository.findByUserIdAndIsDeletedFalse(1)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenReturn(user);

        UserResponse result = service.toggleLock(1);

        assertThat(result).isNotNull();
        assertThat(result.getUserId()).isEqualTo(1);
    }

    // ──────────────────── helper ────────────────────

    private UserRequest trainerRequest() {
        UserRequest r = new UserRequest();
        r.setUsername("newuser");
        r.setPassword("password123");
        r.setFullName("New User");
        r.setEmail("new@fpt.edu.vn");
        r.setRole("TRAINER");
        r.setSpecialtyId(1);
        return r;
    }
}
