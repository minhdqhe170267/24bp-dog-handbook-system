package vn.edu.fpt.doghandbook.backend.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.DashboardStatsResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.TrainerDashboardStatsResponse;
import vn.edu.fpt.doghandbook.backend.entity.Content;
import vn.edu.fpt.doghandbook.backend.entity.DogAssignment;
import vn.edu.fpt.doghandbook.backend.entity.DogBreed;
import vn.edu.fpt.doghandbook.backend.entity.DogProfile;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.AssignmentScope;
import vn.edu.fpt.doghandbook.backend.entity.enums.AssignmentType;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.ContentRepository;
import vn.edu.fpt.doghandbook.backend.repository.DiseaseRepository;
import vn.edu.fpt.doghandbook.backend.repository.DogAssignmentRepository;
import vn.edu.fpt.doghandbook.backend.repository.DogBreedRepository;
import vn.edu.fpt.doghandbook.backend.repository.FieldNoteRepository;
import vn.edu.fpt.doghandbook.backend.repository.MedicationRepository;
import vn.edu.fpt.doghandbook.backend.repository.OperationReportRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingExerciseRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.impl.DashboardServiceImpl;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceImplTest {

    @Mock private DogBreedRepository dogBreedRepository;
    @Mock private TrainingExerciseRepository trainingExerciseRepository;
    @Mock private DiseaseRepository diseaseRepository;
    @Mock private MedicationRepository medicationRepository;
    @Mock private ContentRepository contentRepository;
    @Mock private UserRepository userRepository;
    @Mock private DogAssignmentRepository dogAssignmentRepository;
    @Mock private FieldNoteRepository fieldNoteRepository;
    @Mock private OperationReportRepository operationReportRepository;

    @InjectMocks
    private DashboardServiceImpl dashboardService;

    @Test
    void getStats_returnsAggregatedCountsAndRecentActivities() {
        User author = User.builder()
                .userId(3)
                .username("editor")
                .passwordHash("hash")
                .fullName("Editor Name")
                .role(UserRole.CONTENT_EDITOR)
                .build();

        Content published = Content.builder()
                .contentId(10)
                .title("Published article")
                .status(ContentStatus.PUBLISHED)
                .author(author)
                .createdAt(LocalDateTime.of(2026, 4, 1, 9, 0))
                .updatedAt(LocalDateTime.of(2026, 4, 2, 10, 0))
                .build();

        Content pending = Content.builder()
                .contentId(11)
                .title("Pending article")
                .status(ContentStatus.PENDING)
                .author(author)
                .createdAt(LocalDateTime.of(2026, 4, 1, 8, 0))
                .updatedAt(LocalDateTime.of(2026, 4, 1, 12, 0))
                .build();

        when(dogBreedRepository.countByIsDeletedFalse()).thenReturn(5L);
        when(trainingExerciseRepository.countByIsDeletedFalse()).thenReturn(7L);
        when(diseaseRepository.countByIsDeletedFalse()).thenReturn(9L);
        when(medicationRepository.countByIsDeletedFalse()).thenReturn(11L);
        when(contentRepository.countByStatusAndIsDeletedFalse(ContentStatus.PENDING)).thenReturn(2L);
        when(contentRepository.countByStatusAndPublishedAtBetweenAndIsDeletedFalse(
                org.mockito.ArgumentMatchers.eq(ContentStatus.PUBLISHED), any(), any())).thenReturn(4L);
        when(userRepository.countByIsDeletedFalse()).thenReturn(13L);
        when(contentRepository.findByIsDeletedFalse(any()))
                .thenReturn(new PageImpl<>(List.of(published, pending), PageRequest.of(0, 10), 2));

        DashboardStatsResponse response = dashboardService.getStats();

        assertThat(response.getTotalBreeds()).isEqualTo(5L);
        assertThat(response.getTotalExercises()).isEqualTo(7L);
        assertThat(response.getTotalDiseases()).isEqualTo(9L);
        assertThat(response.getTotalMedications()).isEqualTo(11L);
        assertThat(response.getPendingReviewsCount()).isEqualTo(2L);
        assertThat(response.getPublishedThisMonth()).isEqualTo(4L);
        assertThat(response.getTotalUsers()).isEqualTo(13L);
        assertThat(response.getRecentActivities()).hasSize(2);
        assertThat(response.getRecentActivities())
                .extracting(DashboardStatsResponse.RecentActivityItem::getActivityType)
                .containsExactly("CONTENT_PUBLISHED", "CONTENT_PENDING");
        assertThat(response.getRecentActivities().get(0).getActorName()).isEqualTo("Editor Name");
        assertThat(response.getRecentActivities().get(0).getActivityAt())
                .isEqualTo(LocalDateTime.of(2026, 4, 2, 10, 0));
    }

    @Test
    void getStats_usesCreatedAtWhenUpdatedAtMissingAndAllowsNullAuthor() {
        Content draft = Content.builder()
                .contentId(12)
                .title("Draft article")
                .status(ContentStatus.DRAFT)
                .author(null)
                .createdAt(LocalDateTime.of(2026, 4, 3, 7, 30))
                .updatedAt(null)
                .build();

        when(dogBreedRepository.countByIsDeletedFalse()).thenReturn(0L);
        when(trainingExerciseRepository.countByIsDeletedFalse()).thenReturn(0L);
        when(diseaseRepository.countByIsDeletedFalse()).thenReturn(0L);
        when(medicationRepository.countByIsDeletedFalse()).thenReturn(0L);
        when(contentRepository.countByStatusAndIsDeletedFalse(ContentStatus.PENDING)).thenReturn(0L);
        when(contentRepository.countByStatusAndPublishedAtBetweenAndIsDeletedFalse(
                org.mockito.ArgumentMatchers.eq(ContentStatus.PUBLISHED), any(), any())).thenReturn(0L);
        when(userRepository.countByIsDeletedFalse()).thenReturn(1L);
        when(contentRepository.findByIsDeletedFalse(any()))
                .thenReturn(new PageImpl<>(List.of(draft), PageRequest.of(0, 10), 1));

        DashboardStatsResponse response = dashboardService.getStats();

        assertThat(response.getRecentActivities()).hasSize(1);
        assertThat(response.getRecentActivities().get(0).getActorName()).isNull();
        assertThat(response.getRecentActivities().get(0).getActivityAt())
                .isEqualTo(LocalDateTime.of(2026, 4, 3, 7, 30));
    }

    @Test
    void getTrainerStats_returnsDatabaseBackedSummary() {
        User trainer = User.builder()
                .userId(7)
                .username("trainer7")
                .passwordHash("hash")
                .fullName("Trainer 7")
                .role(UserRole.TRAINER)
                .build();

        DogBreed breed = DogBreed.builder()
                .breedId(3)
                .breedName("Malinois")
                .build();

        DogProfile rex = DogProfile.builder()
                .dogId(11)
                .dogCode("DK011")
                .dogName("Rex")
                .dogBreed(breed)
                .imageUrl("uploads/rex.jpg")
                .isDeleted(false)
                .build();

        DogProfile ghost = DogProfile.builder()
                .dogId(12)
                .dogCode("DK012")
                .dogName("Ghost")
                .dogBreed(breed)
                .isDeleted(true)
                .build();

        DogProfile max = DogProfile.builder()
                .dogId(13)
                .dogCode("DK013")
                .dogName("Max")
                .dogBreed(breed)
                .isDeleted(false)
                .build();

        DogAssignment rexAssignment = DogAssignment.builder()
                .assignmentId(101)
                .trainer(trainer)
                .dogProfile(rex)
                .assignmentType(AssignmentType.PRIMARY)
                .assignmentScope(AssignmentScope.FULL_TRAINING)
                .startDate(LocalDate.of(2026, 3, 20))
                .isActive(true)
                .build();

        DogAssignment deletedDogAssignment = DogAssignment.builder()
                .assignmentId(102)
                .trainer(trainer)
                .dogProfile(ghost)
                .assignmentType(AssignmentType.SECONDARY)
                .assignmentScope(AssignmentScope.CARE_ONLY)
                .startDate(LocalDate.of(2026, 3, 19))
                .isActive(true)
                .build();

        DogAssignment maxAssignment = DogAssignment.builder()
                .assignmentId(103)
                .trainer(trainer)
                .dogProfile(max)
                .assignmentType(AssignmentType.PRIMARY)
                .assignmentScope(AssignmentScope.FULL_TRAINING)
                .startDate(LocalDate.of(2026, 3, 18))
                .isActive(true)
                .build();

        when(userRepository.findById(7)).thenReturn(Optional.of(trainer));
        when(dogAssignmentRepository.findEffectiveByTrainerUserId(7, LocalDate.now()))
                .thenReturn(List.of(maxAssignment, deletedDogAssignment, rexAssignment));
        when(fieldNoteRepository.findByTrainerUserIdAndIsDeletedFalseOrderByRecordingDateDesc(any(), any()))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 1), 9));
        when(operationReportRepository.findByTrainerUserIdAndIsDeletedFalseOrderByReportDateDesc(any(), any()))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 1), 4));

        TrainerDashboardStatsResponse response = dashboardService.getTrainerStats(7);

        assertThat(response.getTotalFieldNotes()).isEqualTo(9);
        assertThat(response.getTotalReports()).isEqualTo(4);
        assertThat(response.getAssignedDogs()).hasSize(2);
        assertThat(response.getAssignedDogs())
                .extracting(TrainerDashboardStatsResponse.AssignedDogItem::getDogName)
                .containsExactly("Rex", "Max");
        assertThat(response.getAssignedDogs().get(0).getBreedName()).isEqualTo("Malinois");
        assertThat(response.getAssignedDogs().get(0).getImageUrl()).isEqualTo("uploads/rex.jpg");
    }

    @Test
    void getTrainerStats_userNotFound_throwsResourceNotFoundException() {
        when(userRepository.findById(99)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> dashboardService.getTrainerStats(99))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("99");
    }

    @Test
    void getTrainerStats_deduplicatesSameDogAndHandlesMissingBreed() {
        User trainer = User.builder()
                .userId(7)
                .username("trainer7")
                .passwordHash("hash")
                .fullName("Trainer 7")
                .role(UserRole.TRAINER)
                .build();

        DogProfile dog = DogProfile.builder()
                .dogId(11)
                .dogCode("DK011")
                .dogName("Rex")
                .dogBreed(null)
                .isDeleted(false)
                .build();

        DogAssignment latestAssignment = DogAssignment.builder()
                .assignmentId(105)
                .trainer(trainer)
                .dogProfile(dog)
                .assignmentType(AssignmentType.SECONDARY)
                .assignmentScope(AssignmentScope.CARE_ONLY)
                .startDate(LocalDate.of(2026, 3, 22))
                .endDate(LocalDate.of(2026, 3, 25))
                .isActive(true)
                .build();

        DogAssignment olderAssignment = DogAssignment.builder()
                .assignmentId(104)
                .trainer(trainer)
                .dogProfile(dog)
                .assignmentType(AssignmentType.PRIMARY)
                .assignmentScope(AssignmentScope.FULL_TRAINING)
                .startDate(LocalDate.of(2026, 3, 20))
                .isActive(true)
                .build();

        when(userRepository.findById(7)).thenReturn(Optional.of(trainer));
        when(dogAssignmentRepository.findEffectiveByTrainerUserId(7, LocalDate.now()))
                .thenReturn(List.of(olderAssignment, latestAssignment));
        when(fieldNoteRepository.findByTrainerUserIdAndIsDeletedFalseOrderByRecordingDateDesc(any(), any()))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 1), 0));
        when(operationReportRepository.findByTrainerUserIdAndIsDeletedFalseOrderByReportDateDesc(any(), any()))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 1), 0));

        TrainerDashboardStatsResponse response = dashboardService.getTrainerStats(7);

        assertThat(response.getAssignedDogs()).hasSize(1);
        assertThat(response.getAssignedDogs().get(0).getDogName()).isEqualTo("Rex");
        assertThat(response.getAssignedDogs().get(0).getBreedName()).isNull();
        assertThat(response.getAssignedDogs().get(0).getAssignmentType()).isEqualTo("SECONDARY");
        assertThat(response.getAssignedDogs().get(0).getAssignmentScope()).isEqualTo("CARE_ONLY");
    }
}
