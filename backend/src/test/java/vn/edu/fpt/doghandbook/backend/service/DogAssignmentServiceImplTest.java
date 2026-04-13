package vn.edu.fpt.doghandbook.backend.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.edu.fpt.doghandbook.backend.dto.request.DogAssignmentRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.DogAssignmentResponse;
import vn.edu.fpt.doghandbook.backend.entity.DogAssignment;
import vn.edu.fpt.doghandbook.backend.entity.DogProfile;
import vn.edu.fpt.doghandbook.backend.entity.TrainingSpecialty;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.AssignmentScope;
import vn.edu.fpt.doghandbook.backend.entity.enums.AssignmentType;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.DogAssignmentRepository;
import vn.edu.fpt.doghandbook.backend.repository.DogProfileRepository;
import vn.edu.fpt.doghandbook.backend.repository.DogSpecialtyEnrollmentRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.impl.DogAssignmentServiceImpl;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DogAssignmentServiceImplTest {

    @Mock private DogAssignmentRepository dogAssignmentRepository;
    @Mock private DogProfileRepository dogProfileRepository;
    @Mock private DogSpecialtyEnrollmentRepository dogSpecialtyEnrollmentRepository;
    @Mock private DogTrainingProgressService dogTrainingProgressService;
    @Mock private UserRepository userRepository;
    @Mock private NotificationService notificationService;

    @InjectMocks
    private DogAssignmentServiceImpl service;

    @Test
    void assign_primaryOverlapOnDog_throwsBadRequestException() {
        DogProfile dog = dog(10, "DK010", "Rex");
        User currentPrimaryTrainer = trainer(1, "trainer1", "Trainer One");
        User newPrimaryTrainer = trainer(2, "trainer2", "Trainer Two");

        DogAssignment existingPrimary = DogAssignment.builder()
                .assignmentId(100)
                .dogProfile(dog)
                .trainer(currentPrimaryTrainer)
                .assignmentType(AssignmentType.PRIMARY)
                .assignmentScope(AssignmentScope.FULL_TRAINING)
                .startDate(LocalDate.of(2026, 3, 1))
                .endDate(null)
                .isActive(true)
                .build();

        DogAssignmentRequest request = request(10, 2, "PRIMARY", null,
                LocalDate.of(2026, 3, 15), null);

        when(dogProfileRepository.findByDogIdAndIsDeletedFalse(10)).thenReturn(Optional.of(dog));
        when(userRepository.findByUserIdAndIsDeletedFalse(2)).thenReturn(Optional.of(newPrimaryTrainer));
        when(dogSpecialtyEnrollmentRepository.findByDogProfileDogIdAndIsDeletedFalseOrderByEnrolledAtDesc(10))
                .thenReturn(List.of());
        when(dogAssignmentRepository.findByDogProfileDogIdAndIsActiveTrue(10)).thenReturn(List.of(existingPrimary));
        when(dogAssignmentRepository.findByTrainerUserIdAndIsActiveTrue(2)).thenReturn(List.of());

        assertThatThrownBy(() -> service.assign(request, 99))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("huấn luyện viên chính");

        verify(dogAssignmentRepository, never()).save(any(DogAssignment.class));
    }

    @Test
    void assign_temporaryWithoutExplicitScope_autoMapsToCareOnlyAndLinksPrimary() {
        DogProfile dog = dog(10, "DK010", "Rex");
        User primaryTrainer = trainer(1, "trainer1", "Trainer One");
        User careTrainer = trainer(2, "trainer2", "Trainer Two");

        DogAssignment primaryAssignment = DogAssignment.builder()
                .assignmentId(200)
                .dogProfile(dog)
                .trainer(primaryTrainer)
                .assignmentType(AssignmentType.PRIMARY)
                .assignmentScope(AssignmentScope.FULL_TRAINING)
                .startDate(LocalDate.of(2026, 3, 1))
                .endDate(LocalDate.of(2026, 3, 31))
                .isActive(true)
                .build();

        DogAssignmentRequest request = request(10, 2, "TEMPORARY", null,
                LocalDate.of(2026, 3, 10), LocalDate.of(2026, 3, 12));
        request.setNotes("Cover feeding");

        when(dogProfileRepository.findByDogIdAndIsDeletedFalse(10)).thenReturn(Optional.of(dog));
        when(userRepository.findByUserIdAndIsDeletedFalse(2)).thenReturn(Optional.of(careTrainer));
        when(userRepository.findById(99)).thenReturn(Optional.empty());
        when(dogSpecialtyEnrollmentRepository.findByDogProfileDogIdAndIsDeletedFalseOrderByEnrolledAtDesc(10))
                .thenReturn(List.of());
        when(dogAssignmentRepository.findByDogProfileDogIdAndIsActiveTrue(10)).thenReturn(List.of(primaryAssignment));
        when(dogAssignmentRepository.findByTrainerUserIdAndIsActiveTrue(2)).thenReturn(List.of());
        when(dogAssignmentRepository.save(any(DogAssignment.class))).thenAnswer(invocation -> {
            DogAssignment assignment = invocation.getArgument(0, DogAssignment.class);
            assignment.setAssignmentId(201);
            return assignment;
        });

        DogAssignmentResponse response = service.assign(request, 99);

        ArgumentCaptor<DogAssignment> captor = ArgumentCaptor.forClass(DogAssignment.class);
        verify(dogAssignmentRepository).save(captor.capture());

        DogAssignment savedAssignment = captor.getValue();
        assertThat(savedAssignment.getAssignmentScope()).isEqualTo(AssignmentScope.CARE_ONLY);
        assertThat(savedAssignment.getCoveredAssignment()).isSameAs(primaryAssignment);
        assertThat(response.getAssignmentType()).isEqualTo("TEMPORARY");
        assertThat(response.getAssignmentScope()).isEqualTo("CARE_ONLY");
        assertThat(response.getCoveredAssignmentId()).isEqualTo(200);
    }

    @Test
    void assign_trainerWithoutSpecialty_throwsBadRequestException() {
        DogProfile dog = dog(10, "DK010", "Rex");
        User trainerWithoutSpecialty = User.builder()
                .userId(2)
                .username("trainer2")
                .passwordHash("hash")
                .fullName("Trainer Two")
                .role(UserRole.TRAINER)
                .isDeleted(false)
                .isActive(true)
                .build();

        DogAssignmentRequest request = request(10, 2, "PRIMARY", "FULL_TRAINING",
                LocalDate.of(2026, 3, 10), null);

        when(dogProfileRepository.findByDogIdAndIsDeletedFalse(10)).thenReturn(Optional.of(dog));
        when(userRepository.findByUserIdAndIsDeletedFalse(2)).thenReturn(Optional.of(trainerWithoutSpecialty));

        assertThatThrownBy(() -> service.assign(request, 1))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("phải có chuyên ngành");
    }

    @Test
    void assign_nonTrainerRole_throwsBadRequestException() {
        DogProfile dog = dog(10, "DK010", "Rex");
        User admin = trainer(2, "admin", "Admin User");
        admin.setRole(UserRole.ADMIN);

        DogAssignmentRequest request = request(10, 2, "PRIMARY", "FULL_TRAINING",
                LocalDate.of(2026, 3, 10), null);

        when(dogProfileRepository.findByDogIdAndIsDeletedFalse(10)).thenReturn(Optional.of(dog));
        when(userRepository.findByUserIdAndIsDeletedFalse(2)).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> service.assign(request, 1))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("TRAINER");
    }

    @Test
    void update_primaryAssignment_updatesAndInitializesProgress() {
        DogProfile dog = dog(10, "DK010", "Rex");
        User trainer = trainer(2, "trainer2", "Trainer Two");
        DogAssignment assignment = DogAssignment.builder()
                .assignmentId(300)
                .dogProfile(dog)
                .trainer(trainer)
                .trainingSpecialty(trainer.getTrainingSpecialty())
                .assignmentType(AssignmentType.PRIMARY)
                .assignmentScope(AssignmentScope.FULL_TRAINING)
                .startDate(LocalDate.of(2026, 3, 1))
                .isActive(true)
                .notes("Old note")
                .build();

        DogAssignmentRequest request = request(10, 2, "PRIMARY", "FULL_TRAINING",
                LocalDate.of(2026, 3, 5), LocalDate.of(2026, 3, 25));
        request.setNotes("Updated note");

        when(dogAssignmentRepository.findById(300)).thenReturn(Optional.of(assignment));
        when(dogProfileRepository.findByDogIdAndIsDeletedFalse(10)).thenReturn(Optional.of(dog));
        when(userRepository.findByUserIdAndIsDeletedFalse(2)).thenReturn(Optional.of(trainer));
        when(dogSpecialtyEnrollmentRepository.findByDogProfileDogIdAndIsDeletedFalseOrderByEnrolledAtDesc(10))
                .thenReturn(List.of());
        when(dogAssignmentRepository.findByDogProfileDogIdAndIsActiveTrue(10)).thenReturn(List.of(assignment));
        when(dogAssignmentRepository.findByTrainerUserIdAndIsActiveTrue(2)).thenReturn(List.of(assignment));
        when(dogAssignmentRepository.findByCoveredAssignmentAssignmentIdAndIsActiveTrue(300)).thenReturn(List.of());
        when(dogAssignmentRepository.save(any(DogAssignment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        DogAssignmentResponse response = service.update(300, request);

        assertThat(response.getAssignmentId()).isEqualTo(300);
        assertThat(response.getStartDate()).isEqualTo(LocalDate.of(2026, 3, 5));
        assertThat(response.getEndDate()).isEqualTo(LocalDate.of(2026, 3, 25));
        assertThat(response.getNotes()).isEqualTo("Updated note");
        verify(dogTrainingProgressService).initializeForAssignment(assignment);
    }

    @Test
    void update_missingAssignment_throwsResourceNotFoundException() {
        when(dogAssignmentRepository.findById(999)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(999, request(10, 2, "PRIMARY", "FULL_TRAINING",
                LocalDate.of(2026, 3, 5), null)))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("999");
    }

    @Test
    void unassign_primaryAssignment_disablesDependentsAndSuspendsProgress() {
        DogProfile dog = dog(10, "DK010", "Rex");
        User trainer = trainer(2, "trainer2", "Trainer Two");
        DogAssignment primaryAssignment = DogAssignment.builder()
                .assignmentId(400)
                .dogProfile(dog)
                .trainer(trainer)
                .trainingSpecialty(trainer.getTrainingSpecialty())
                .assignmentType(AssignmentType.PRIMARY)
                .assignmentScope(AssignmentScope.FULL_TRAINING)
                .startDate(LocalDate.of(2026, 3, 1))
                .isActive(true)
                .build();
        DogAssignment dependentAssignment = DogAssignment.builder()
                .assignmentId(401)
                .dogProfile(dog)
                .trainer(trainer(3, "trainer3", "Trainer Three"))
                .assignmentType(AssignmentType.TEMPORARY)
                .assignmentScope(AssignmentScope.CARE_ONLY)
                .coveredAssignment(primaryAssignment)
                .startDate(LocalDate.of(2026, 3, 2))
                .isActive(true)
                .build();

        when(dogAssignmentRepository.findById(400)).thenReturn(Optional.of(primaryAssignment));
        when(dogAssignmentRepository.findByCoveredAssignmentAssignmentIdAndIsActiveTrue(400))
                .thenReturn(List.of(dependentAssignment));
        when(dogAssignmentRepository.save(any(DogAssignment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.unassign(400);

        assertThat(primaryAssignment.getIsActive()).isFalse();
        assertThat(dependentAssignment.getIsActive()).isFalse();
        verify(dogTrainingProgressService).suspendForAssignment(primaryAssignment);
        verify(dogAssignmentRepository).save(primaryAssignment);
        verify(dogAssignmentRepository).save(dependentAssignment);
    }

    @Test
    void getByTrainer_returnsMappedAssignments() {
        DogAssignment assignment = DogAssignment.builder()
                .assignmentId(500)
                .dogProfile(dog(10, "DK010", "Rex"))
                .trainer(trainer(2, "trainer2", "Trainer Two"))
                .trainingSpecialty(trainer(2, "trainer2", "Trainer Two").getTrainingSpecialty())
                .assignmentType(AssignmentType.PRIMARY)
                .assignmentScope(AssignmentScope.FULL_TRAINING)
                .startDate(LocalDate.of(2026, 3, 1))
                .isActive(true)
                .build();

        when(dogAssignmentRepository.findByTrainerUserIdAndIsActiveTrue(2)).thenReturn(List.of(assignment));

        List<DogAssignmentResponse> response = service.getByTrainer(2);

        assertThat(response).hasSize(1);
        assertThat(response.get(0).getDogName()).isEqualTo("Rex");
        assertThat(response.get(0).getTrainerName()).isEqualTo("Trainer Two");
        assertThat(response.get(0).getAssignmentType()).isEqualTo("PRIMARY");
    }

    @Test
    void getByDog_returnsMappedAssignments() {
        DogAssignment assignment = DogAssignment.builder()
                .assignmentId(501)
                .dogProfile(dog(10, "DK010", "Rex"))
                .trainer(trainer(2, "trainer2", "Trainer Two"))
                .trainingSpecialty(trainer(2, "trainer2", "Trainer Two").getTrainingSpecialty())
                .assignmentType(AssignmentType.SECONDARY)
                .assignmentScope(AssignmentScope.CARE_ONLY)
                .startDate(LocalDate.of(2026, 3, 1))
                .isActive(true)
                .build();

        when(dogAssignmentRepository.findByDogProfileDogIdAndIsActiveTrue(10)).thenReturn(List.of(assignment));

        List<DogAssignmentResponse> response = service.getByDog(10);

        assertThat(response).hasSize(1);
        assertThat(response.get(0).getDogCode()).isEqualTo("DK010");
        assertThat(response.get(0).getAssignmentScope()).isEqualTo("CARE_ONLY");
    }

    @Test
    void getById_notFound_throwsResourceNotFoundException() {
        when(dogAssignmentRepository.findById(999)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getById(999))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("999");
    }

    private DogAssignmentRequest request(Integer dogId, Integer trainerId, String type, String scope,
                                         LocalDate startDate, LocalDate endDate) {
        DogAssignmentRequest request = new DogAssignmentRequest();
        request.setDogId(dogId);
        request.setTrainerId(trainerId);
        request.setAssignmentType(type);
        request.setAssignmentScope(scope);
        request.setStartDate(startDate);
        request.setEndDate(endDate);
        return request;
    }

    private DogProfile dog(Integer dogId, String dogCode, String dogName) {
        DogProfile dog = DogProfile.builder()
                .dogId(dogId)
                .dogCode(dogCode)
                .dogName(dogName)
                .build();
        dog.setIsDeleted(false);
        return dog;
    }

    private User trainer(Integer userId, String username, String fullName) {
        TrainingSpecialty specialty = TrainingSpecialty.builder()
                .specialtyId(1)
                .specialtyCode("GENERAL")
                .specialtyName("General Training")
                .version(1)
                .isDeleted(false)
                .isActive(true)
                .build();
        return User.builder()
                .userId(userId)
                .username(username)
                .passwordHash("hash")
                .fullName(fullName)
                .role(UserRole.TRAINER)
                .trainingSpecialty(specialty)
                .isDeleted(false)
                .isActive(true)
                .build();
    }
}
