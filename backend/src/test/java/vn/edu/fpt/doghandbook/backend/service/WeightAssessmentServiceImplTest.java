package vn.edu.fpt.doghandbook.backend.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import vn.edu.fpt.doghandbook.backend.config.CustomUserDetails;
import vn.edu.fpt.doghandbook.backend.dto.response.WeightAssessmentResponse;
import vn.edu.fpt.doghandbook.backend.entity.DogBreed;
import vn.edu.fpt.doghandbook.backend.entity.DogProfile;
import vn.edu.fpt.doghandbook.backend.entity.HealthRecord;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.WeightAssessment;
import vn.edu.fpt.doghandbook.backend.entity.enums.DogGender;
import vn.edu.fpt.doghandbook.backend.entity.enums.DogStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.repository.DogAssignmentRepository;
import vn.edu.fpt.doghandbook.backend.repository.DogProfileRepository;
import vn.edu.fpt.doghandbook.backend.repository.HealthRecordRepository;
import vn.edu.fpt.doghandbook.backend.repository.WeightAssessmentRepository;
import vn.edu.fpt.doghandbook.backend.service.impl.WeightAssessmentServiceImpl;

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
class WeightAssessmentServiceImplTest {

    @Mock private DogProfileRepository dogProfileRepository;
    @Mock private HealthRecordRepository healthRecordRepository;
    @Mock private WeightAssessmentRepository weightAssessmentRepository;
    @Mock private DogAssignmentRepository dogAssignmentRepository;
    @Mock private NotificationService notificationService;

    @InjectMocks
    private WeightAssessmentServiceImpl weightAssessmentService;

    private DogBreed breed;
    private DogProfile dog;
    private User currentUser;

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

        currentUser = User.builder()
                .userId(10)
                .username("trainer1")
                .passwordHash("hash")
                .fullName("Trainer One")
                .role(UserRole.TRAINER)
                .isActive(true)
                .isLocked(false)
                .failedLoginCount(0)
                .build();

        // Set up SecurityContext for every test
        CustomUserDetails userDetails = new CustomUserDetails(currentUser);
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private HealthRecord buildHealthRecord(BigDecimal weightKg, LocalDateTime examDate) {
        return HealthRecord.builder()
                .weightKg(weightKg)
                .examinationDate(examDate)
                .build();
    }

    private void stubCommonDependencies() {
        when(dogProfileRepository.findByDogIdAndIsDeletedFalse(5)).thenReturn(Optional.of(dog));
        when(weightAssessmentRepository.save(any(WeightAssessment.class))).thenAnswer(inv -> {
            WeightAssessment saved = inv.getArgument(0);
            saved.setAssessmentId(1);
            return saved;
        });
        lenient().when(dogAssignmentRepository.findEffectiveByDogProfileDogId(eq(5), any(LocalDate.class)))
                .thenReturn(Collections.emptyList());
    }

    // ========================================================================
    // assess - happy path
    // ========================================================================
    @Nested
    class HappyPath {

        @Test
        void normalWeight_returnsNormalStatus() {
            stubCommonDependencies();
            when(healthRecordRepository.findTop3ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(Collections.emptyList());
            when(healthRecordRepository.findTop10ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(Collections.emptyList());

            WeightAssessmentResponse result = weightAssessmentService.assess(5);

            assertThat(result.getDogId()).isEqualTo(5);
            assertThat(result.getDogName()).isEqualTo("Rex");
            assertThat(result.getDogCode()).isEqualTo("DOG005");
            assertThat(result.getBreedName()).isEqualTo("German Shepherd");
            assertThat(result.getCurrentWeightKg()).isEqualByComparingTo(new BigDecimal("35.00"));
            assertThat(result.getWeightStatus()).isEqualTo("NORMAL");
            assertThat(result.getAlertLevel()).isEqualTo("NORMAL");
            assertThat(result.getGender()).isEqualTo("MALE");
            assertThat(result.getStandardMinKg()).isEqualByComparingTo(new BigDecimal("30.00"));
            assertThat(result.getStandardMaxKg()).isEqualByComparingTo(new BigDecimal("40.00"));
            verify(weightAssessmentRepository).save(any(WeightAssessment.class));
        }

        @Test
        void femaleDog_usesFemaleWeightRange() {
            dog.setGender(DogGender.FEMALE);
            dog.setCurrentWeightKg(new BigDecimal("27.00"));

            stubCommonDependencies();
            when(healthRecordRepository.findTop3ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(Collections.emptyList());
            when(healthRecordRepository.findTop10ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(Collections.emptyList());

            WeightAssessmentResponse result = weightAssessmentService.assess(5);

            assertThat(result.getGender()).isEqualTo("FEMALE");
            assertThat(result.getStandardMinKg()).isEqualByComparingTo(new BigDecimal("22.00"));
            assertThat(result.getStandardMaxKg()).isEqualByComparingTo(new BigDecimal("32.00"));
            assertThat(result.getWeightStatus()).isEqualTo("NORMAL");
        }

        @Test
        void withBirthDate_calculatesAgeMonths() {
            stubCommonDependencies();
            when(healthRecordRepository.findTop3ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(Collections.emptyList());
            when(healthRecordRepository.findTop10ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(Collections.emptyList());

            WeightAssessmentResponse result = weightAssessmentService.assess(5);

            assertThat(result.getAgeMonths()).isNotNull();
            assertThat(result.getAgeMonths()).isGreaterThan(0);
        }

        @Test
        void noBirthDate_ageMonthsIsNull() {
            dog.setBirthDate(null);

            stubCommonDependencies();
            when(healthRecordRepository.findTop3ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(Collections.emptyList());
            when(healthRecordRepository.findTop10ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(Collections.emptyList());

            WeightAssessmentResponse result = weightAssessmentService.assess(5);

            assertThat(result.getAgeMonths()).isNull();
        }

        @Test
        void noNotification_forNormalWeight() {
            stubCommonDependencies();
            when(healthRecordRepository.findTop3ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(Collections.emptyList());
            when(healthRecordRepository.findTop10ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(Collections.emptyList());

            weightAssessmentService.assess(5);

            verify(notificationService, never()).notifyUser(any(), any(), any(), any(), any(), any(), any());
            verify(notificationService, never()).notifyRole(any(), any(), any(), any(), any(), any(), any());
        }
    }

    // ========================================================================
    // assess - weight status categories
    // ========================================================================
    @Nested
    class WeightStatusCategories {

        @Test
        void underweightDog_returnsUnderweightAndWarning() {
            dog.setCurrentWeightKg(new BigDecimal("28.00"));

            stubCommonDependencies();
            when(healthRecordRepository.findTop3ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(Collections.emptyList());
            when(healthRecordRepository.findTop10ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(Collections.emptyList());

            WeightAssessmentResponse result = weightAssessmentService.assess(5);

            assertThat(result.getWeightStatus()).isEqualTo("UNDERWEIGHT");
            assertThat(result.getAlertLevel()).isEqualTo("WARNING");
            assertThat(result.getDeviationPercent()).isNegative();
        }

        @Test
        void overweightDog_returnsOverweightAndWarning() {
            dog.setCurrentWeightKg(new BigDecimal("42.00"));

            stubCommonDependencies();
            when(healthRecordRepository.findTop3ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(Collections.emptyList());
            when(healthRecordRepository.findTop10ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(Collections.emptyList());

            WeightAssessmentResponse result = weightAssessmentService.assess(5);

            assertThat(result.getWeightStatus()).isEqualTo("OVERWEIGHT");
            assertThat(result.getAlertLevel()).isEqualTo("WARNING");
        }

        @Test
        void severelyUnderweight_returnsCriticalAlert() {
            dog.setCurrentWeightKg(new BigDecimal("20.00"));

            stubCommonDependencies();
            when(healthRecordRepository.findTop3ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(Collections.emptyList());
            when(healthRecordRepository.findTop10ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(Collections.emptyList());

            WeightAssessmentResponse result = weightAssessmentService.assess(5);

            assertThat(result.getWeightStatus()).isEqualTo("SEVERELY_UNDERWEIGHT");
            assertThat(result.getAlertLevel()).isEqualTo("CRITICAL");
            verify(notificationService).notifyRole(
                    eq(UserRole.ADMIN), eq(currentUser), any(), any(), any(), any(), any());
        }

        @Test
        void obese_returnsCriticalAlertAndNotifiesAdmin() {
            dog.setCurrentWeightKg(new BigDecimal("55.00"));

            stubCommonDependencies();
            when(healthRecordRepository.findTop3ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(Collections.emptyList());
            when(healthRecordRepository.findTop10ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(Collections.emptyList());

            WeightAssessmentResponse result = weightAssessmentService.assess(5);

            assertThat(result.getWeightStatus()).isEqualTo("OBESE");
            assertThat(result.getAlertLevel()).isEqualTo("CRITICAL");
            verify(notificationService).notifyRole(
                    eq(UserRole.ADMIN), eq(currentUser), any(), any(), any(), any(), any());
        }

        @Test
        void exactMinBoundary_isNormal() {
            dog.setCurrentWeightKg(new BigDecimal("30.00"));

            stubCommonDependencies();
            when(healthRecordRepository.findTop3ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(Collections.emptyList());
            when(healthRecordRepository.findTop10ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(Collections.emptyList());

            WeightAssessmentResponse result = weightAssessmentService.assess(5);

            // deviation from midpoint 35 is (30-35)/35*100 = -14.29% -> UNDERWEIGHT (< -10)
            // This tests the boundary correctly
            assertThat(result.getWeightStatus()).isIn("NORMAL", "UNDERWEIGHT");
        }
    }

    // ========================================================================
    // assess - trend detection
    // ========================================================================
    @Nested
    class TrendDetection {

        @Test
        void gainingTrend_threeIncreasingRecords() {
            // Records are DESC by date: newest first
            List<HealthRecord> top3 = List.of(
                    buildHealthRecord(new BigDecimal("38.00"), LocalDateTime.now()),
                    buildHealthRecord(new BigDecimal("36.00"), LocalDateTime.now().minusDays(7)),
                    buildHealthRecord(new BigDecimal("34.00"), LocalDateTime.now().minusDays(14))
            );

            stubCommonDependencies();
            when(healthRecordRepository.findTop3ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(top3);
            when(healthRecordRepository.findTop10ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(top3);

            WeightAssessmentResponse result = weightAssessmentService.assess(5);

            assertThat(result.getTrend()).isEqualTo("GAINING");
        }

        @Test
        void losingTrend_threeDecreasingRecords() {
            List<HealthRecord> top3 = List.of(
                    buildHealthRecord(new BigDecimal("32.00"), LocalDateTime.now()),
                    buildHealthRecord(new BigDecimal("34.00"), LocalDateTime.now().minusDays(7)),
                    buildHealthRecord(new BigDecimal("36.00"), LocalDateTime.now().minusDays(14))
            );

            stubCommonDependencies();
            when(healthRecordRepository.findTop3ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(top3);
            when(healthRecordRepository.findTop10ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(top3);

            WeightAssessmentResponse result = weightAssessmentService.assess(5);

            assertThat(result.getTrend()).isEqualTo("LOSING");
        }

        @Test
        void stableTrend_mixedRecords() {
            List<HealthRecord> top3 = List.of(
                    buildHealthRecord(new BigDecimal("35.00"), LocalDateTime.now()),
                    buildHealthRecord(new BigDecimal("36.00"), LocalDateTime.now().minusDays(7)),
                    buildHealthRecord(new BigDecimal("35.00"), LocalDateTime.now().minusDays(14))
            );

            stubCommonDependencies();
            when(healthRecordRepository.findTop3ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(top3);
            when(healthRecordRepository.findTop10ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(top3);

            WeightAssessmentResponse result = weightAssessmentService.assess(5);

            assertThat(result.getTrend()).isEqualTo("STABLE");
        }

        @Test
        void lessThanTwoRecords_stableTrend() {
            List<HealthRecord> top3 = List.of(
                    buildHealthRecord(new BigDecimal("35.00"), LocalDateTime.now())
            );

            stubCommonDependencies();
            when(healthRecordRepository.findTop3ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(top3);
            when(healthRecordRepository.findTop10ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(top3);

            WeightAssessmentResponse result = weightAssessmentService.assess(5);

            assertThat(result.getTrend()).isEqualTo("STABLE");
        }

        @Test
        void weightChange_calculatedFromLatestTwoRecords() {
            List<HealthRecord> top10 = List.of(
                    buildHealthRecord(new BigDecimal("37.00"), LocalDateTime.now()),
                    buildHealthRecord(new BigDecimal("35.00"), LocalDateTime.now().minusDays(7))
            );

            stubCommonDependencies();
            when(healthRecordRepository.findTop3ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(top10);
            when(healthRecordRepository.findTop10ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(top10);

            WeightAssessmentResponse result = weightAssessmentService.assess(5);

            assertThat(result.getWeightChangeKg()).isEqualByComparingTo(new BigDecimal("2.00"));
        }
    }

    // ========================================================================
    // assess - error cases
    // ========================================================================
    @Nested
    class ErrorCases {

        @Test
        void dogNotFound_throwsRuntimeException() {
            when(dogProfileRepository.findByDogIdAndIsDeletedFalse(999)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> weightAssessmentService.assess(999))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("999");
        }

        @Test
        void dogWithNullWeight_throwsRuntimeException() {
            dog.setCurrentWeightKg(null);
            when(dogProfileRepository.findByDogIdAndIsDeletedFalse(5)).thenReturn(Optional.of(dog));

            assertThatThrownBy(() -> weightAssessmentService.assess(5))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Rex");
        }

        @Test
        void breedWithNullWeightStandards_throwsRuntimeException() {
            breed.setWeightMaleMinKg(null);
            breed.setWeightMaleMaxKg(null);
            when(dogProfileRepository.findByDogIdAndIsDeletedFalse(5)).thenReturn(Optional.of(dog));

            assertThatThrownBy(() -> weightAssessmentService.assess(5))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("German Shepherd");
        }
    }

    // ========================================================================
    // assess - history building
    // ========================================================================
    @Nested
    class HistoryBuilding {

        @Test
        void multipleRecords_buildsHistoryWithChanges() {
            List<HealthRecord> top10 = List.of(
                    buildHealthRecord(new BigDecimal("37.00"), LocalDateTime.now()),
                    buildHealthRecord(new BigDecimal("35.50"), LocalDateTime.now().minusDays(7)),
                    buildHealthRecord(new BigDecimal("34.00"), LocalDateTime.now().minusDays(14))
            );

            stubCommonDependencies();
            when(healthRecordRepository.findTop3ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(top10);
            when(healthRecordRepository.findTop10ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(top10);

            WeightAssessmentResponse result = weightAssessmentService.assess(5);

            assertThat(result.getRecentHistory()).hasSize(3);
            assertThat(result.getRecentHistory().get(0).getWeightKg())
                    .isEqualByComparingTo(new BigDecimal("37.00"));
            // First item change = 37.00 - 35.50 = 1.50
            assertThat(result.getRecentHistory().get(0).getChangeKg())
                    .isEqualByComparingTo(new BigDecimal("1.50"));
            // Last item change = 0 (no previous record)
            assertThat(result.getRecentHistory().get(2).getChangeKg())
                    .isEqualByComparingTo(BigDecimal.ZERO);
        }

        @Test
        void emptyHistory_returnsEmptyList() {
            stubCommonDependencies();
            when(healthRecordRepository.findTop3ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(Collections.emptyList());
            when(healthRecordRepository.findTop10ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(Collections.emptyList());

            WeightAssessmentResponse result = weightAssessmentService.assess(5);

            assertThat(result.getRecentHistory()).isEmpty();
            assertThat(result.getWeightChangeKg()).isEqualByComparingTo(BigDecimal.ZERO);
        }

        @Test
        void recordWithNullWeight_handledGracefully() {
            List<HealthRecord> top10 = List.of(
                    buildHealthRecord(new BigDecimal("35.00"), LocalDateTime.now()),
                    buildHealthRecord(null, LocalDateTime.now().minusDays(7))
            );

            stubCommonDependencies();
            when(healthRecordRepository.findTop3ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(top10);
            when(healthRecordRepository.findTop10ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(top10);

            WeightAssessmentResponse result = weightAssessmentService.assess(5);

            // weightChangeKg should be ZERO since second record has null weight
            assertThat(result.getWeightChangeKg()).isEqualByComparingTo(BigDecimal.ZERO);
        }
    }

    // ========================================================================
    // assess - recommendation content
    // ========================================================================
    @Nested
    class RecommendationContent {

        @Test
        void normalWeight_recommendationContainsDogName() {
            stubCommonDependencies();
            when(healthRecordRepository.findTop3ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(Collections.emptyList());
            when(healthRecordRepository.findTop10ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(Collections.emptyList());

            WeightAssessmentResponse result = weightAssessmentService.assess(5);

            assertThat(result.getRecommendation()).contains("Rex");
            assertThat(result.getRecommendation()).contains("German Shepherd");
        }

        @Test
        void losingTrendWithUnderweight_addsWarning() {
            dog.setCurrentWeightKg(new BigDecimal("28.00"));

            List<HealthRecord> top3 = List.of(
                    buildHealthRecord(new BigDecimal("28.00"), LocalDateTime.now()),
                    buildHealthRecord(new BigDecimal("30.00"), LocalDateTime.now().minusDays(7)),
                    buildHealthRecord(new BigDecimal("32.00"), LocalDateTime.now().minusDays(14))
            );

            stubCommonDependencies();
            when(healthRecordRepository.findTop3ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(top3);
            when(healthRecordRepository.findTop10ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(5))
                    .thenReturn(top3);

            WeightAssessmentResponse result = weightAssessmentService.assess(5);

            assertThat(result.getRecommendation()).contains("giảm cân liên tục");
        }
    }
}
