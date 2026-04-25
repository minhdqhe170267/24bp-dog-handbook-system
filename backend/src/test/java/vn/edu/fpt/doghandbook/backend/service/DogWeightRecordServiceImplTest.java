package vn.edu.fpt.doghandbook.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.edu.fpt.doghandbook.backend.dto.request.DogWeightRecordRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.DogWeightRecordResponse;
import vn.edu.fpt.doghandbook.backend.entity.DogAssignment;
import vn.edu.fpt.doghandbook.backend.entity.DogBreed;
import vn.edu.fpt.doghandbook.backend.entity.DogProfile;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.WeightAssessment;
import vn.edu.fpt.doghandbook.backend.entity.enums.DogGender;
import vn.edu.fpt.doghandbook.backend.entity.enums.DogStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.entity.enums.WeightStatus;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.DogAssignmentRepository;
import vn.edu.fpt.doghandbook.backend.repository.DogProfileRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.repository.WeightAssessmentRepository;
import vn.edu.fpt.doghandbook.backend.service.impl.DogWeightRecordServiceImpl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DogWeightRecordServiceImplTest {

    @Mock private DogProfileRepository dogProfileRepository;
    @Mock private UserRepository userRepository;
    @Mock private WeightAssessmentRepository weightAssessmentRepository;
    @Mock private DogAssignmentRepository dogAssignmentRepository;
    @Mock private NotificationService notificationService;

    @InjectMocks
    private DogWeightRecordServiceImpl dogWeightRecordService;

    private DogBreed breed;
    private DogProfile dog;
    private User assessor;

    @BeforeEach
    void setUp() {
        breed = DogBreed.builder()
                .breedId(1)
                .breedName("German Shepherd")
                .weightMaleMinKg(new BigDecimal("30.00"))
                .weightMaleMaxKg(new BigDecimal("40.00"))
                .weightFemaleMinKg(new BigDecimal("22.00"))
                .weightFemaleMaxKg(new BigDecimal("32.00"))
                .build();

        dog = DogProfile.builder()
                .dogId(5)
                .dogCode("DOG005")
                .dogName("Rex")
                .dogBreed(breed)
                .birthDate(LocalDate.of(2022, 1, 1))
                .gender(DogGender.MALE)
                .currentWeightKg(new BigDecimal("35.00"))
                .status(DogStatus.ACTIVE)
                .build();

        assessor = User.builder()
                .userId(10)
                .username("trainer1")
                .passwordHash("hash")
                .fullName("Trainer One")
                .role(UserRole.TRAINER)
                .isActive(true)
                .isLocked(false)
                .failedLoginCount(0)
                .build();
    }

    private DogWeightRecordRequest buildRequest(Integer dogId, String weightKg, String localId) {
        DogWeightRecordRequest req = new DogWeightRecordRequest();
        req.setDogId(dogId);
        req.setRecordedWeightKg(weightKg != null ? new BigDecimal(weightKg) : null);
        req.setLocalId(localId);
        return req;
    }

    // ========================================================================
    // create - happy path
    // ========================================================================
    @Nested
    class CreateHappyPath {

        @Test
        void normalWeight_createsRecordAndUpdatesProfile() {
            DogWeightRecordRequest req = buildRequest(5, "35.00", null);
            req.setStandardMinKg(new BigDecimal("30.00"));
            req.setStandardMaxKg(new BigDecimal("40.00"));

            when(dogProfileRepository.findByDogIdAndIsDeletedFalse(5)).thenReturn(Optional.of(dog));
            when(userRepository.findById(10)).thenReturn(Optional.of(assessor));
            when(weightAssessmentRepository.save(any(WeightAssessment.class))).thenAnswer(inv -> {
                WeightAssessment saved = inv.getArgument(0);
                saved.setAssessmentId(1);
                return saved;
            });
            when(dogProfileRepository.save(any(DogProfile.class))).thenReturn(dog);
            lenient().when(dogAssignmentRepository.findEffectiveByDogProfileDogId(eq(5), any(LocalDate.class)))
                    .thenReturn(Collections.emptyList());

            DogWeightRecordResponse result = dogWeightRecordService.create(req, 10);

            assertThat(result.getAssessmentId()).isEqualTo(1);
            assertThat(result.getDogId()).isEqualTo(5);
            assertThat(result.getDogName()).isEqualTo("Rex");
            assertThat(result.getAssessorName()).isEqualTo("Trainer One");
            assertThat(result.getStatus()).isEqualTo("NORMAL");
            verify(dogProfileRepository).save(any(DogProfile.class));
        }

        @Test
        void withLocalIdNoDuplicate_createsNewRecord() {
            DogWeightRecordRequest req = buildRequest(5, "35.00", "local-uuid-123");
            req.setStandardMinKg(new BigDecimal("30.00"));
            req.setStandardMaxKg(new BigDecimal("40.00"));

            when(dogProfileRepository.findByDogIdAndIsDeletedFalse(5)).thenReturn(Optional.of(dog));
            when(userRepository.findById(10)).thenReturn(Optional.of(assessor));
            when(weightAssessmentRepository.findByLocalId("local-uuid-123")).thenReturn(Optional.empty());
            when(weightAssessmentRepository.save(any(WeightAssessment.class))).thenAnswer(inv -> {
                WeightAssessment saved = inv.getArgument(0);
                saved.setAssessmentId(2);
                return saved;
            });
            when(dogProfileRepository.save(any(DogProfile.class))).thenReturn(dog);
            lenient().when(dogAssignmentRepository.findEffectiveByDogProfileDogId(eq(5), any(LocalDate.class)))
                    .thenReturn(Collections.emptyList());

            DogWeightRecordResponse result = dogWeightRecordService.create(req, 10);

            assertThat(result.getAssessmentId()).isEqualTo(2);
            assertThat(result.getLocalId()).isEqualTo("local-uuid-123");
        }

        @Test
        void withExistingLocalId_returnsExistingRecord() {
            DogWeightRecordRequest req = buildRequest(5, "35.00", "existing-uuid");
            req.setStandardMinKg(new BigDecimal("30.00"));
            req.setStandardMaxKg(new BigDecimal("40.00"));

            WeightAssessment existing = WeightAssessment.builder()
                    .assessmentId(99)
                    .localId("existing-uuid")
                    .dogProfile(dog)
                    .assessor(assessor)
                    .recordedWeightKg(new BigDecimal("35.00"))
                    .standardMinKg(new BigDecimal("30.00"))
                    .standardMaxKg(new BigDecimal("40.00"))
                    .status(WeightStatus.NORMAL)
                    .deviationPercent(BigDecimal.ZERO)
                    .assessedAt(LocalDateTime.now())
                    .build();

            when(dogProfileRepository.findByDogIdAndIsDeletedFalse(5)).thenReturn(Optional.of(dog));
            when(userRepository.findById(10)).thenReturn(Optional.of(assessor));
            when(weightAssessmentRepository.findByLocalId("existing-uuid")).thenReturn(Optional.of(existing));

            DogWeightRecordResponse result = dogWeightRecordService.create(req, 10);

            assertThat(result.getAssessmentId()).isEqualTo(99);
            verify(weightAssessmentRepository, never()).save(any());
        }

        @Test
        void noStandardProvided_resolvesFromBreed() {
            DogWeightRecordRequest req = buildRequest(5, "35.00", null);
            // Do not set standardMinKg / standardMaxKg -- let it resolve from breed

            when(dogProfileRepository.findByDogIdAndIsDeletedFalse(5)).thenReturn(Optional.of(dog));
            when(userRepository.findById(10)).thenReturn(Optional.of(assessor));
            when(weightAssessmentRepository.save(any(WeightAssessment.class))).thenAnswer(inv -> {
                WeightAssessment saved = inv.getArgument(0);
                saved.setAssessmentId(3);
                return saved;
            });
            when(dogProfileRepository.save(any(DogProfile.class))).thenReturn(dog);
            lenient().when(dogAssignmentRepository.findEffectiveByDogProfileDogId(eq(5), any(LocalDate.class)))
                    .thenReturn(Collections.emptyList());

            DogWeightRecordResponse result = dogWeightRecordService.create(req, 10);

            assertThat(result.getAssessmentId()).isEqualTo(3);
            assertThat(result.getStandardMinKg()).isEqualByComparingTo(new BigDecimal("30.00"));
            assertThat(result.getStandardMaxKg()).isEqualByComparingTo(new BigDecimal("40.00"));
        }

        @Test
        void femaleDog_usesFemalWeightRange() {
            dog.setGender(DogGender.FEMALE);
            DogWeightRecordRequest req = buildRequest(5, "27.00", null);

            when(dogProfileRepository.findByDogIdAndIsDeletedFalse(5)).thenReturn(Optional.of(dog));
            when(userRepository.findById(10)).thenReturn(Optional.of(assessor));
            when(weightAssessmentRepository.save(any(WeightAssessment.class))).thenAnswer(inv -> {
                WeightAssessment saved = inv.getArgument(0);
                saved.setAssessmentId(4);
                return saved;
            });
            when(dogProfileRepository.save(any(DogProfile.class))).thenReturn(dog);
            lenient().when(dogAssignmentRepository.findEffectiveByDogProfileDogId(eq(5), any(LocalDate.class)))
                    .thenReturn(Collections.emptyList());

            DogWeightRecordResponse result = dogWeightRecordService.create(req, 10);

            assertThat(result.getStandardMinKg()).isEqualByComparingTo(new BigDecimal("22.00"));
            assertThat(result.getStandardMaxKg()).isEqualByComparingTo(new BigDecimal("32.00"));
        }
    }

    // ========================================================================
    // create - not found cases
    // ========================================================================
    @Nested
    class NotFoundCases {

        @Test
        void dogNotFound_throwsResourceNotFoundException() {
            DogWeightRecordRequest req = buildRequest(999, "35.00", null);
            when(dogProfileRepository.findByDogIdAndIsDeletedFalse(999)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> dogWeightRecordService.create(req, 10))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("999");
        }

        @Test
        void userNotFound_throwsResourceNotFoundException() {
            DogWeightRecordRequest req = buildRequest(5, "35.00", null);
            when(dogProfileRepository.findByDogIdAndIsDeletedFalse(5)).thenReturn(Optional.of(dog));
            when(userRepository.findById(999)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> dogWeightRecordService.create(req, 999))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("999");
        }
    }

    // ========================================================================
    // create - validation / edge cases
    // ========================================================================
    @Nested
    class ValidationCases {

        @Test
        void standardMinGreaterThanMax_throwsBadRequest() {
            DogWeightRecordRequest req = buildRequest(5, "35.00", null);
            req.setStandardMinKg(new BigDecimal("50.00"));
            req.setStandardMaxKg(new BigDecimal("30.00"));

            when(dogProfileRepository.findByDogIdAndIsDeletedFalse(5)).thenReturn(Optional.of(dog));
            when(userRepository.findById(10)).thenReturn(Optional.of(assessor));

            assertThatThrownBy(() -> dogWeightRecordService.create(req, 10))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        void dogWithNoBreed_throwsBadRequest() {
            dog.setDogBreed(null);
            DogWeightRecordRequest req = buildRequest(5, "35.00", null);
            // No standard provided, breed is null -> resolveWeightRange fails

            when(dogProfileRepository.findByDogIdAndIsDeletedFalse(5)).thenReturn(Optional.of(dog));
            when(userRepository.findById(10)).thenReturn(Optional.of(assessor));

            assertThatThrownBy(() -> dogWeightRecordService.create(req, 10))
                    .isInstanceOf(BadRequestException.class);
        }
    }

    // ========================================================================
    // create - notification behavior
    // ========================================================================
    @Nested
    class NotificationBehavior {

        @Test
        void abnormalWeight_notifiesAssignedTrainers() {
            DogWeightRecordRequest req = buildRequest(5, "20.00", null);
            req.setStandardMinKg(new BigDecimal("30.00"));
            req.setStandardMaxKg(new BigDecimal("40.00"));

            User trainer = User.builder()
                    .userId(20)
                    .username("trainerA")
                    .passwordHash("hash")
                    .fullName("Trainer A")
                    .role(UserRole.TRAINER)
                    .isActive(true)
                    .isLocked(false)
                    .failedLoginCount(0)
                    .build();

            DogAssignment assignment = DogAssignment.builder()
                    .assignmentId(1)
                    .trainer(trainer)
                    .dogProfile(dog)
                    .startDate(LocalDate.of(2023, 1, 1))
                    .isActive(true)
                    .build();

            when(dogProfileRepository.findByDogIdAndIsDeletedFalse(5)).thenReturn(Optional.of(dog));
            when(userRepository.findById(10)).thenReturn(Optional.of(assessor));
            when(weightAssessmentRepository.save(any(WeightAssessment.class))).thenAnswer(inv -> {
                WeightAssessment saved = inv.getArgument(0);
                saved.setAssessmentId(10);
                return saved;
            });
            when(dogProfileRepository.save(any(DogProfile.class))).thenReturn(dog);
            when(dogAssignmentRepository.findEffectiveByDogProfileDogId(eq(5), any(LocalDate.class)))
                    .thenReturn(List.of(assignment));

            dogWeightRecordService.create(req, 10);

            verify(notificationService).notifyUser(
                    eq(trainer), eq(assessor), any(), any(), any(), any(), any());
        }

        @Test
        void normalWeight_noNotification() {
            DogWeightRecordRequest req = buildRequest(5, "35.00", null);
            req.setStandardMinKg(new BigDecimal("30.00"));
            req.setStandardMaxKg(new BigDecimal("40.00"));

            when(dogProfileRepository.findByDogIdAndIsDeletedFalse(5)).thenReturn(Optional.of(dog));
            when(userRepository.findById(10)).thenReturn(Optional.of(assessor));
            when(weightAssessmentRepository.save(any(WeightAssessment.class))).thenAnswer(inv -> {
                WeightAssessment saved = inv.getArgument(0);
                saved.setAssessmentId(11);
                return saved;
            });
            when(dogProfileRepository.save(any(DogProfile.class))).thenReturn(dog);

            dogWeightRecordService.create(req, 10);

            verify(notificationService, never()).notifyUser(any(), any(), any(), any(), any(), any(), any());
            verify(notificationService, never()).notifyRole(any(), any(), any(), any(), any(), any(), any());
        }

        @Test
        void severelyUnderweight_escalatesToAdmin() {
            DogWeightRecordRequest req = buildRequest(5, "10.00", null);
            req.setStandardMinKg(new BigDecimal("30.00"));
            req.setStandardMaxKg(new BigDecimal("40.00"));

            when(dogProfileRepository.findByDogIdAndIsDeletedFalse(5)).thenReturn(Optional.of(dog));
            when(userRepository.findById(10)).thenReturn(Optional.of(assessor));
            when(weightAssessmentRepository.save(any(WeightAssessment.class))).thenAnswer(inv -> {
                WeightAssessment saved = inv.getArgument(0);
                saved.setAssessmentId(12);
                return saved;
            });
            when(dogProfileRepository.save(any(DogProfile.class))).thenReturn(dog);
            when(dogAssignmentRepository.findEffectiveByDogProfileDogId(eq(5), any(LocalDate.class)))
                    .thenReturn(Collections.emptyList());

            dogWeightRecordService.create(req, 10);

            verify(notificationService).notifyRole(
                    eq(UserRole.ADMIN), eq(assessor), any(), any(), any(), any(), any());
        }
    }
}
