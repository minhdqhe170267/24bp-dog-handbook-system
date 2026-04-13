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
import tools.jackson.databind.ObjectMapper;
import vn.edu.fpt.doghandbook.backend.dto.request.HealthSessionRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.SessionFollowUpRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.HealthSessionResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.entity.*;
import vn.edu.fpt.doghandbook.backend.entity.enums.*;
import vn.edu.fpt.doghandbook.backend.exception.SyncConflictException;
import vn.edu.fpt.doghandbook.backend.repository.*;
import vn.edu.fpt.doghandbook.backend.service.impl.HealthSessionServiceImpl;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HealthSessionServiceImplTest {

    @Mock private HealthSessionRepository healthSessionRepository;
    @Mock private SessionFollowUpRepository sessionFollowUpRepository;
    @Mock private DogProfileRepository dogProfileRepository;
    @Mock private UserRepository userRepository;
    @Mock private DiagnosisRecordRepository diagnosisRecordRepository;
    @Mock private DogAssignmentRepository dogAssignmentRepository;
    @Mock private NotificationService notificationService;
    @Mock private SyncConflictLogRepository syncConflictLogRepository;
    @Mock private ObjectMapper objectMapper;

    @InjectMocks private HealthSessionServiceImpl service;

    private DogProfile dog;
    private User trainer;
    private HealthSession session;

    @BeforeEach
    void setUp() {
        DogBreed breed = DogBreed.builder().breedId(1).breedName("GSD").build();
        dog = DogProfile.builder()
                .dogId(1).dogCode("DK001").dogName("Rex").dogBreed(breed)
                .gender(DogGender.MALE).status(DogStatus.ACTIVE)
                .build();
        dog.setIsDeleted(false);

        trainer = User.builder()
                .userId(10).username("trainer01").passwordHash("h").fullName("Trainer A")
                .role(UserRole.TRAINER).isActive(true).isLocked(false).failedLoginCount(0)
                .build();

        session = HealthSession.builder()
                .sessionId(1).dogProfile(dog).trainer(trainer)
                .issueSummary("Limping").severity(SessionSeverity.MEDIUM)
                .status(SessionStatus.ACTIVE)
                .startedAt(LocalDateTime.now().minusDays(2))
                .lastUpdateAt(LocalDateTime.now().minusDays(1))
                .build();
        session.setUpdatedAt(LocalDateTime.now().minusHours(1));
    }

    // ──────────────────── create ────────────────────

    @Test
    void create_success_savesSession() {
        HealthSessionRequest request = new HealthSessionRequest();
        request.setDogId(1);
        request.setIssueSummary("Fever");
        request.setSeverity("HIGH");

        when(dogProfileRepository.findByDogIdAndIsDeletedFalse(1)).thenReturn(Optional.of(dog));
        when(userRepository.findByUserIdAndIsDeletedFalse(10)).thenReturn(Optional.of(trainer));
        when(healthSessionRepository.save(any(HealthSession.class))).thenReturn(session);
        when(dogAssignmentRepository.findEffectiveByDogProfileDogId(eq(1), any(LocalDate.class))).thenReturn(List.of());
        when(sessionFollowUpRepository.findByHealthSession_SessionIdOrderByFollowupDateDesc(1)).thenReturn(List.of());

        HealthSessionResponse result = service.create(request, 10);

        assertThat(result).isNotNull();
        assertThat(result.getSessionId()).isEqualTo(1);
        verify(healthSessionRepository).save(any(HealthSession.class));
    }

    @Test
    void create_duplicateLocalId_returnsExisting() {
        HealthSessionRequest request = new HealthSessionRequest();
        request.setLocalId("local-abc");
        request.setDogId(1);
        request.setSeverity("MEDIUM");

        when(healthSessionRepository.findByLocalId("local-abc")).thenReturn(Optional.of(session));
        when(sessionFollowUpRepository.findByHealthSession_SessionIdOrderByFollowupDateDesc(1)).thenReturn(List.of());

        HealthSessionResponse result = service.create(request, 10);

        assertThat(result.getSessionId()).isEqualTo(1);
        verify(healthSessionRepository, never()).save(any());
    }

    @Test
    void create_dogNotFound_throwsException() {
        HealthSessionRequest request = new HealthSessionRequest();
        request.setDogId(99);
        request.setSeverity("MEDIUM");

        when(dogProfileRepository.findByDogIdAndIsDeletedFalse(99)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(request, 10))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void create_trainerNotFound_throwsException() {
        HealthSessionRequest request = new HealthSessionRequest();
        request.setDogId(1);
        request.setSeverity("MEDIUM");

        when(dogProfileRepository.findByDogIdAndIsDeletedFalse(1)).thenReturn(Optional.of(dog));
        when(userRepository.findByUserIdAndIsDeletedFalse(99)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(request, 99))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void create_notifiesOtherTrainersAssignedToDog() {
        User otherTrainer = User.builder().userId(20).username("t2").passwordHash("h")
                .fullName("Trainer B").role(UserRole.TRAINER).isActive(true).isLocked(false).failedLoginCount(0).build();
        DogAssignment assignment = DogAssignment.builder().assignmentId(1).trainer(otherTrainer).dogProfile(dog).build();

        HealthSessionRequest request = new HealthSessionRequest();
        request.setDogId(1);
        request.setIssueSummary("Fever");
        request.setSeverity("HIGH");

        when(dogProfileRepository.findByDogIdAndIsDeletedFalse(1)).thenReturn(Optional.of(dog));
        when(userRepository.findByUserIdAndIsDeletedFalse(10)).thenReturn(Optional.of(trainer));
        when(healthSessionRepository.save(any(HealthSession.class))).thenReturn(session);
        when(dogAssignmentRepository.findEffectiveByDogProfileDogId(eq(1), any(LocalDate.class)))
                .thenReturn(List.of(assignment));
        when(sessionFollowUpRepository.findByHealthSession_SessionIdOrderByFollowupDateDesc(1)).thenReturn(List.of());

        service.create(request, 10);

        verify(notificationService).notifyUser(eq(otherTrainer), eq(trainer), eq(NotificationType.HEALTH_SESSION_CREATED),
                any(), any(), eq("HEALTH_SESSION"), eq(1));
    }

    @Test
    void create_doesNotNotifySelf() {
        DogAssignment selfAssignment = DogAssignment.builder().assignmentId(1).trainer(trainer).dogProfile(dog).build();

        HealthSessionRequest request = new HealthSessionRequest();
        request.setDogId(1);
        request.setIssueSummary("Fever");
        request.setSeverity("HIGH");

        when(dogProfileRepository.findByDogIdAndIsDeletedFalse(1)).thenReturn(Optional.of(dog));
        when(userRepository.findByUserIdAndIsDeletedFalse(10)).thenReturn(Optional.of(trainer));
        when(healthSessionRepository.save(any(HealthSession.class))).thenReturn(session);
        when(dogAssignmentRepository.findEffectiveByDogProfileDogId(eq(1), any(LocalDate.class)))
                .thenReturn(List.of(selfAssignment));
        when(sessionFollowUpRepository.findByHealthSession_SessionIdOrderByFollowupDateDesc(1)).thenReturn(List.of());

        service.create(request, 10);

        verifyNoInteractions(notificationService);
    }

    // ──────────────────── getById ────────────────────

    @Test
    void getById_found_returnsResponse() {
        when(healthSessionRepository.findBySessionId(1)).thenReturn(Optional.of(session));
        when(sessionFollowUpRepository.findByHealthSession_SessionIdOrderByFollowupDateDesc(1)).thenReturn(List.of());

        HealthSessionResponse result = service.getById(1);

        assertThat(result.getSessionId()).isEqualTo(1);
        assertThat(result.getDogName()).isEqualTo("Rex");
        assertThat(result.getTrainerName()).isEqualTo("Trainer A");
    }

    @Test
    void getById_notFound_throwsException() {
        when(healthSessionRepository.findBySessionId(99)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getById(99))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void getById_mapsAllFields() {
        when(healthSessionRepository.findBySessionId(1)).thenReturn(Optional.of(session));
        when(sessionFollowUpRepository.findByHealthSession_SessionIdOrderByFollowupDateDesc(1)).thenReturn(List.of());

        HealthSessionResponse result = service.getById(1);

        assertThat(result.getIssueSummary()).isEqualTo("Limping");
        assertThat(result.getSeverity()).isEqualTo("MEDIUM");
        assertThat(result.getStatus()).isEqualTo("ACTIVE");
    }

    @Test
    void getById_includesFollowUps() {
        SessionFollowUp fu = SessionFollowUp.builder()
                .followupId(1).healthSession(session)
                .statusUpdate(FollowUpStatus.IMPROVED).notes("Doing OK")
                .followupDate(LocalDateTime.now())
                .build();

        when(healthSessionRepository.findBySessionId(1)).thenReturn(Optional.of(session));
        when(sessionFollowUpRepository.findByHealthSession_SessionIdOrderByFollowupDateDesc(1)).thenReturn(List.of(fu));

        HealthSessionResponse result = service.getById(1);

        assertThat(result.getFollowUps()).hasSize(1);
        assertThat(result.getFollowUps().get(0).getStatusUpdate()).isEqualTo("IMPROVED");
    }

    @Test
    void getById_noFollowUps_returnsEmptyList() {
        when(healthSessionRepository.findBySessionId(1)).thenReturn(Optional.of(session));
        when(sessionFollowUpRepository.findByHealthSession_SessionIdOrderByFollowupDateDesc(1)).thenReturn(List.of());

        HealthSessionResponse result = service.getById(1);

        assertThat(result.getFollowUps()).isEmpty();
    }

    // ──────────────────── getByTrainer ────────────────────

    @Test
    void getByTrainer_returnsPage() {
        Page<HealthSession> page = new PageImpl<>(List.of(session), PageRequest.of(0, 10), 1);
        when(healthSessionRepository.findByTrainer_UserIdOrderByStartedAtDesc(eq(10), any())).thenReturn(page);
        when(sessionFollowUpRepository.findByHealthSession_SessionIdOrderByFollowupDateDesc(1)).thenReturn(List.of());

        PageResponse<HealthSessionResponse> result = service.getByTrainer(10, 0, 10);

        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    void getByTrainer_emptyResult() {
        Page<HealthSession> page = new PageImpl<>(List.of(), PageRequest.of(0, 10), 0);
        when(healthSessionRepository.findByTrainer_UserIdOrderByStartedAtDesc(eq(99), any())).thenReturn(page);

        PageResponse<HealthSessionResponse> result = service.getByTrainer(99, 0, 10);

        assertThat(result.getContent()).isEmpty();
    }

    @Test
    void getByTrainer_callsCorrectRepo() {
        Page<HealthSession> page = new PageImpl<>(List.of(), PageRequest.of(0, 10), 0);
        when(healthSessionRepository.findByTrainer_UserIdOrderByStartedAtDesc(eq(10), any())).thenReturn(page);

        service.getByTrainer(10, 0, 10);

        verify(healthSessionRepository).findByTrainer_UserIdOrderByStartedAtDesc(eq(10), any());
    }

    @Test
    void getByTrainer_mapsResponse() {
        Page<HealthSession> page = new PageImpl<>(List.of(session), PageRequest.of(0, 10), 1);
        when(healthSessionRepository.findByTrainer_UserIdOrderByStartedAtDesc(eq(10), any())).thenReturn(page);
        when(sessionFollowUpRepository.findByHealthSession_SessionIdOrderByFollowupDateDesc(1)).thenReturn(List.of());

        PageResponse<HealthSessionResponse> result = service.getByTrainer(10, 0, 10);

        assertThat(((HealthSessionResponse) result.getContent().get(0)).getTrainerName()).isEqualTo("Trainer A");
    }

    @Test
    void getByTrainer_pageMetadata() {
        Page<HealthSession> page = new PageImpl<>(List.of(session), PageRequest.of(1, 5), 8);
        when(healthSessionRepository.findByTrainer_UserIdOrderByStartedAtDesc(eq(10), any())).thenReturn(page);
        when(sessionFollowUpRepository.findByHealthSession_SessionIdOrderByFollowupDateDesc(1)).thenReturn(List.of());

        PageResponse<HealthSessionResponse> result = service.getByTrainer(10, 1, 5);

        assertThat(result.getPage()).isEqualTo(1);
        assertThat(result.getTotalPages()).isEqualTo(2);
    }

    // ──────────────────── getByDog ────────────────────

    @Test
    void getByDog_returnsPage() {
        Page<HealthSession> page = new PageImpl<>(List.of(session), PageRequest.of(0, 10), 1);
        when(healthSessionRepository.findByDogProfile_DogIdOrderByStartedAtDesc(eq(1), any())).thenReturn(page);
        when(sessionFollowUpRepository.findByHealthSession_SessionIdOrderByFollowupDateDesc(1)).thenReturn(List.of());

        PageResponse<HealthSessionResponse> result = service.getByDog(1, 0, 10);

        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    void getByDog_emptyResult() {
        Page<HealthSession> page = new PageImpl<>(List.of(), PageRequest.of(0, 10), 0);
        when(healthSessionRepository.findByDogProfile_DogIdOrderByStartedAtDesc(eq(99), any())).thenReturn(page);

        PageResponse<HealthSessionResponse> result = service.getByDog(99, 0, 10);

        assertThat(result.getContent()).isEmpty();
    }

    @Test
    void getByDog_callsCorrectRepo() {
        Page<HealthSession> page = new PageImpl<>(List.of(), PageRequest.of(0, 10), 0);
        when(healthSessionRepository.findByDogProfile_DogIdOrderByStartedAtDesc(eq(1), any())).thenReturn(page);

        service.getByDog(1, 0, 10);

        verify(healthSessionRepository).findByDogProfile_DogIdOrderByStartedAtDesc(eq(1), any());
    }

    @Test
    void getByDog_mapsResponse() {
        Page<HealthSession> page = new PageImpl<>(List.of(session), PageRequest.of(0, 10), 1);
        when(healthSessionRepository.findByDogProfile_DogIdOrderByStartedAtDesc(eq(1), any())).thenReturn(page);
        when(sessionFollowUpRepository.findByHealthSession_SessionIdOrderByFollowupDateDesc(1)).thenReturn(List.of());

        PageResponse<HealthSessionResponse> result = service.getByDog(1, 0, 10);

        assertThat(((HealthSessionResponse) result.getContent().get(0)).getDogCode()).isEqualTo("DK001");
    }

    @Test
    void getByDog_pageMetadata() {
        Page<HealthSession> page = new PageImpl<>(List.of(session), PageRequest.of(0, 5), 5);
        when(healthSessionRepository.findByDogProfile_DogIdOrderByStartedAtDesc(eq(1), any())).thenReturn(page);
        when(sessionFollowUpRepository.findByHealthSession_SessionIdOrderByFollowupDateDesc(1)).thenReturn(List.of());

        PageResponse<HealthSessionResponse> result = service.getByDog(1, 0, 5);

        assertThat(result.getSize()).isEqualTo(5);
    }

    // ──────────────────── addFollowUp ────────────────────

    @Test
    void addFollowUp_success_savesFollowUp() {
        SessionFollowUpRequest request = new SessionFollowUpRequest();
        request.setSessionId(1);
        request.setStatusUpdate("IMPROVED");
        request.setNotes("Better");

        when(healthSessionRepository.findBySessionId(1)).thenReturn(Optional.of(session));
        when(sessionFollowUpRepository.save(any(SessionFollowUp.class))).thenReturn(SessionFollowUp.builder().build());
        when(healthSessionRepository.save(any(HealthSession.class))).thenReturn(session);
        when(sessionFollowUpRepository.findByHealthSession_SessionIdOrderByFollowupDateDesc(1)).thenReturn(List.of());

        HealthSessionResponse result = service.addFollowUp(request, 10);

        assertThat(result).isNotNull();
        verify(sessionFollowUpRepository).save(any(SessionFollowUp.class));
    }

    @Test
    void addFollowUp_resolved_changesSessionStatus() {
        SessionFollowUpRequest request = new SessionFollowUpRequest();
        request.setSessionId(1);
        request.setStatusUpdate("RESOLVED");

        when(healthSessionRepository.findBySessionId(1)).thenReturn(Optional.of(session));
        when(sessionFollowUpRepository.save(any())).thenReturn(SessionFollowUp.builder().build());
        when(healthSessionRepository.save(any(HealthSession.class))).thenReturn(session);
        when(sessionFollowUpRepository.findByHealthSession_SessionIdOrderByFollowupDateDesc(1)).thenReturn(List.of());

        service.addFollowUp(request, 10);

        assertThat(session.getStatus()).isEqualTo(SessionStatus.RESOLVED);
        assertThat(session.getResolvedAt()).isNotNull();
    }

    @Test
    void addFollowUp_worse_escalatesSeverity() {
        SessionFollowUpRequest request = new SessionFollowUpRequest();
        request.setSessionId(1);
        request.setStatusUpdate("WORSE");

        when(healthSessionRepository.findBySessionId(1)).thenReturn(Optional.of(session));
        when(sessionFollowUpRepository.save(any())).thenReturn(SessionFollowUp.builder().build());
        when(healthSessionRepository.save(any(HealthSession.class))).thenReturn(session);
        when(sessionFollowUpRepository.findByHealthSession_SessionIdOrderByFollowupDateDesc(1)).thenReturn(List.of());

        service.addFollowUp(request, 10);

        assertThat(session.getSeverity()).isEqualTo(SessionSeverity.HIGH);
    }

    @Test
    void addFollowUp_sessionNotFound_throwsException() {
        SessionFollowUpRequest request = new SessionFollowUpRequest();
        request.setSessionId(99);
        request.setStatusUpdate("IMPROVED");

        when(healthSessionRepository.findBySessionId(99)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.addFollowUp(request, 10))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void addFollowUp_syncConflict_throwsSyncConflictException() {
        SessionFollowUpRequest request = new SessionFollowUpRequest();
        request.setSessionId(1);
        request.setStatusUpdate("IMPROVED");
        request.setLocalUpdatedAt(LocalDateTime.now().minusDays(1));
        session.setUpdatedAt(LocalDateTime.now());

        when(healthSessionRepository.findBySessionId(1)).thenReturn(Optional.of(session));
        when(sessionFollowUpRepository.findByHealthSession_SessionIdOrderByFollowupDateDesc(1)).thenReturn(List.of());

        assertThatThrownBy(() -> service.addFollowUp(request, 10))
                .isInstanceOf(SyncConflictException.class);
    }

    // ──────────────────── resolve ────────────────────

    @Test
    void resolve_success_setsResolvedStatus() {
        when(healthSessionRepository.findBySessionId(1)).thenReturn(Optional.of(session));
        when(healthSessionRepository.save(any(HealthSession.class))).thenReturn(session);
        when(userRepository.findByUserIdAndIsDeletedFalse(10)).thenReturn(Optional.of(trainer));
        when(dogAssignmentRepository.findEffectiveByDogProfileDogId(eq(1), any(LocalDate.class))).thenReturn(List.of());
        when(sessionFollowUpRepository.findByHealthSession_SessionIdOrderByFollowupDateDesc(1)).thenReturn(List.of());

        HealthSessionResponse result = service.resolve(1, "All good", 10, null);

        assertThat(session.getStatus()).isEqualTo(SessionStatus.RESOLVED);
        assertThat(session.getResolvedAt()).isNotNull();
        assertThat(session.getResolutionNotes()).isEqualTo("All good");
    }

    @Test
    void resolve_notFound_throwsException() {
        when(healthSessionRepository.findBySessionId(99)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.resolve(99, "notes", 10, null))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void resolve_syncConflict_throwsSyncConflictException() {
        session.setUpdatedAt(LocalDateTime.now());

        when(healthSessionRepository.findBySessionId(1)).thenReturn(Optional.of(session));
        when(sessionFollowUpRepository.findByHealthSession_SessionIdOrderByFollowupDateDesc(1)).thenReturn(List.of());

        assertThatThrownBy(() -> service.resolve(1, "notes", 10, LocalDateTime.now().minusDays(1)))
                .isInstanceOf(SyncConflictException.class);
    }

    @Test
    void resolve_notifiesOtherTrainers() {
        User otherTrainer = User.builder().userId(20).username("t2").passwordHash("h")
                .fullName("B").role(UserRole.TRAINER).isActive(true).isLocked(false).failedLoginCount(0).build();
        DogAssignment assignment = DogAssignment.builder().assignmentId(1).trainer(otherTrainer).dogProfile(dog).build();

        when(healthSessionRepository.findBySessionId(1)).thenReturn(Optional.of(session));
        when(healthSessionRepository.save(any(HealthSession.class))).thenReturn(session);
        when(userRepository.findByUserIdAndIsDeletedFalse(10)).thenReturn(Optional.of(trainer));
        when(dogAssignmentRepository.findEffectiveByDogProfileDogId(eq(1), any(LocalDate.class)))
                .thenReturn(List.of(assignment));
        when(sessionFollowUpRepository.findByHealthSession_SessionIdOrderByFollowupDateDesc(1)).thenReturn(List.of());

        service.resolve(1, "Done", 10, null);

        verify(notificationService).notifyUser(eq(otherTrainer), eq(trainer),
                eq(NotificationType.HEALTH_SESSION_RESOLVED), any(), any(), eq("HEALTH_SESSION"), eq(1));
    }

    @Test
    void resolve_noConflictWhenLocalUpdatedAtNull() {
        when(healthSessionRepository.findBySessionId(1)).thenReturn(Optional.of(session));
        when(healthSessionRepository.save(any(HealthSession.class))).thenReturn(session);
        when(userRepository.findByUserIdAndIsDeletedFalse(10)).thenReturn(Optional.of(trainer));
        when(dogAssignmentRepository.findEffectiveByDogProfileDogId(eq(1), any(LocalDate.class))).thenReturn(List.of());
        when(sessionFollowUpRepository.findByHealthSession_SessionIdOrderByFollowupDateDesc(1)).thenReturn(List.of());

        HealthSessionResponse result = service.resolve(1, "Done", 10, null);

        assertThat(result).isNotNull();
    }
}
