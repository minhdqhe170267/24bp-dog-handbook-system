package vn.edu.fpt.doghandbook.backend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import vn.edu.fpt.doghandbook.backend.dto.request.HealthSessionRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.SessionFollowUpRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.FollowUpItemResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.HealthSessionResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.entity.DiagnosisRecord;
import vn.edu.fpt.doghandbook.backend.entity.DogAssignment;
import vn.edu.fpt.doghandbook.backend.entity.DogProfile;
import vn.edu.fpt.doghandbook.backend.entity.HealthSession;
import vn.edu.fpt.doghandbook.backend.entity.SessionFollowUp;
import vn.edu.fpt.doghandbook.backend.entity.SyncConflictLog;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.ConflictStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.FollowUpStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.NotificationType;
import vn.edu.fpt.doghandbook.backend.entity.enums.SessionSeverity;
import vn.edu.fpt.doghandbook.backend.entity.enums.SessionStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.exception.SyncConflictException;
import vn.edu.fpt.doghandbook.backend.repository.DiagnosisRecordRepository;
import vn.edu.fpt.doghandbook.backend.repository.DogAssignmentRepository;
import vn.edu.fpt.doghandbook.backend.repository.DogProfileRepository;
import vn.edu.fpt.doghandbook.backend.repository.HealthSessionRepository;
import vn.edu.fpt.doghandbook.backend.repository.SessionFollowUpRepository;
import vn.edu.fpt.doghandbook.backend.repository.SyncConflictLogRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.HealthSessionService;
import vn.edu.fpt.doghandbook.backend.service.NotificationService;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class HealthSessionServiceImpl implements HealthSessionService {

    private final HealthSessionRepository healthSessionRepository;
    private final SessionFollowUpRepository sessionFollowUpRepository;
    private final DogProfileRepository dogProfileRepository;
    private final UserRepository userRepository;
    private final DiagnosisRecordRepository diagnosisRecordRepository;
    private final DogAssignmentRepository dogAssignmentRepository;
    private final NotificationService notificationService;
    private final SyncConflictLogRepository syncConflictLogRepository;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public HealthSessionResponse create(HealthSessionRequest request, Integer trainerId) {
        if (request.getLocalId() != null) {
            var existing = healthSessionRepository.findByLocalId(request.getLocalId());
            if (existing.isPresent()) {
                return toResponse(existing.get());
            }
        }

        DogProfile dog = dogProfileRepository.findByDogIdAndIsDeletedFalse(request.getDogId())
                .orElseThrow(() -> new RuntimeException("Dog not found: " + request.getDogId()));

        User trainer = userRepository.findByUserIdAndIsDeletedFalse(trainerId)
                .orElseThrow(() -> new RuntimeException("Trainer not found: " + trainerId));

        HealthSession session = HealthSession.builder()
                .localId(request.getLocalId())
                .dogProfile(dog)
                .trainer(trainer)
                .issueSummary(request.getIssueSummary())
                .severity(SessionSeverity.valueOf(request.getSeverity()))
                .followUpDate(request.getFollowUpDate())
                .build();

        if (request.getInitialDiagnosisId() != null) {
            DiagnosisRecord diagnosis = diagnosisRecordRepository.findById(request.getInitialDiagnosisId())
                    .orElseThrow(() -> new RuntimeException("Diagnosis not found: " + request.getInitialDiagnosisId()));
            session.setInitialDiagnosis(diagnosis);
        }

        session = healthSessionRepository.save(session);

        // Trainer-only: notify other trainers assigned to this dog
        String title = "Phiên sức khỏe mới: " + dog.getDogName();
        String message = trainer.getFullName() + " tạo phiên theo dõi sức khỏe cho " + dog.getDogName()
                + " (" + dog.getDogCode() + ") - " + request.getIssueSummary();
        for (DogAssignment a : dogAssignmentRepository.findByDogProfileDogIdAndIsActiveTrue(dog.getDogId())) {
            if (!a.getTrainer().getUserId().equals(trainerId)) {
                notificationService.notifyUser(
                        a.getTrainer(), trainer,
                        NotificationType.HEALTH_SESSION_CREATED,
                        title, message,
                        "HEALTH_SESSION", session.getSessionId()
                );
            }
        }

        return toResponse(session);
    }

    @Override
    @Transactional(readOnly = true)
    public HealthSessionResponse getById(Integer sessionId) {
        HealthSession session = healthSessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found: " + sessionId));
        return toResponse(session);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<HealthSessionResponse> getByTrainer(Integer trainerId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<HealthSession> sessionPage = healthSessionRepository
                .findByTrainer_UserIdOrderByStartedAtDesc(trainerId, pageable);
        return toPageResponse(sessionPage);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<HealthSessionResponse> getByDog(Integer dogId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<HealthSession> sessionPage = healthSessionRepository
                .findByDogProfile_DogIdOrderByStartedAtDesc(dogId, pageable);
        return toPageResponse(sessionPage);
    }

    @Override
    @Transactional
    public HealthSessionResponse addFollowUp(SessionFollowUpRequest request, Integer trainerId) {
        HealthSession session = healthSessionRepository.findBySessionId(request.getSessionId())
                .orElseThrow(() -> new RuntimeException("Session not found: " + request.getSessionId()));

        // Conflict detection
        if (request.getLocalUpdatedAt() != null
                && session.getUpdatedAt() != null
                && session.getUpdatedAt().isAfter(request.getLocalUpdatedAt())) {
            log.warn("[SYNC:CONFLICT] health_session id={} serverTime={} > localTime={}",
                    request.getSessionId(), session.getUpdatedAt(), request.getLocalUpdatedAt());

            try {
                SyncConflictLog conflictLog = SyncConflictLog.builder()
                        .entityType("health_session")
                        .entityId(session.getSessionId())
                        .localId(session.getLocalId())
                        .localData(objectMapper.writeValueAsString(request))
                        .serverData(objectMapper.writeValueAsString(toResponse(session)))
                        .status(ConflictStatus.PENDING)
                        .trainerId(trainerId)
                        .trainerName(session.getTrainer().getFullName())
                        .conflictDetectedAt(LocalDateTime.now())
                        .build();
                syncConflictLogRepository.save(conflictLog);
                log.info("[SYNC:CONFLICT] Saved conflict log: health_session id={}", session.getSessionId());
            } catch (Exception ex) {
                log.error("[SYNC:CONFLICT] Failed to save conflict log: health_session id={}, error={}",
                        session.getSessionId(), ex.getMessage());
            }

            throw new SyncConflictException("Record modified on server", toResponse(session));
        }

        FollowUpStatus statusUpdate = FollowUpStatus.valueOf(request.getStatusUpdate());

        SessionFollowUp followUp = SessionFollowUp.builder()
                .healthSession(session)
                .statusUpdate(statusUpdate)
                .notes(request.getNotes())
                .weightKg(request.getWeightKg())
                .temperatureC(request.getTemperatureC())
                .nextAction(request.getNextAction())
                .build();

        sessionFollowUpRepository.save(followUp);

        session.setLastUpdateAt(LocalDateTime.now());

        if (statusUpdate == FollowUpStatus.RESOLVED) {
            session.setStatus(SessionStatus.RESOLVED);
            session.setResolvedAt(LocalDateTime.now());
        }

        if (statusUpdate == FollowUpStatus.WORSE) {
            session.setSeverity(SessionSeverity.HIGH);
        }

        healthSessionRepository.save(session);
        return toResponse(session);
    }

    @Override
    @Transactional
    public HealthSessionResponse resolve(Integer sessionId, String resolutionNotes, Integer trainerId,
                                          LocalDateTime localUpdatedAt) {
        HealthSession session = healthSessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found: " + sessionId));

        // Conflict detection
        if (localUpdatedAt != null
                && session.getUpdatedAt() != null
                && session.getUpdatedAt().isAfter(localUpdatedAt)) {
            log.warn("[SYNC:CONFLICT] health_session id={} serverTime={} > localTime={}",
                    sessionId, session.getUpdatedAt(), localUpdatedAt);

            try {
                SyncConflictLog conflictLog = SyncConflictLog.builder()
                        .entityType("health_session")
                        .entityId(sessionId)
                        .localId(session.getLocalId())
                        .localData(objectMapper.writeValueAsString(java.util.Map.of(
                                "resolutionNotes", resolutionNotes != null ? resolutionNotes : "")))
                        .serverData(objectMapper.writeValueAsString(toResponse(session)))
                        .status(ConflictStatus.PENDING)
                        .trainerId(trainerId)
                        .trainerName(session.getTrainer().getFullName())
                        .conflictDetectedAt(LocalDateTime.now())
                        .build();
                syncConflictLogRepository.save(conflictLog);
                log.info("[SYNC:CONFLICT] Saved conflict log: health_session id={}", sessionId);
            } catch (Exception ex) {
                log.error("[SYNC:CONFLICT] Failed to save conflict log: health_session id={}, error={}",
                        sessionId, ex.getMessage());
            }

            throw new SyncConflictException("Record modified on server", toResponse(session));
        }

        session.setStatus(SessionStatus.RESOLVED);
        session.setResolvedAt(LocalDateTime.now());
        session.setResolutionNotes(resolutionNotes);

        session = healthSessionRepository.save(session);

        User trainer = userRepository.findByUserIdAndIsDeletedFalse(trainerId).orElse(null);
        DogProfile dog = session.getDogProfile();
        String resolveTitle = "Phiên sức khỏe đã xử lý: " + dog.getDogName();
        String resolveMessage = "Phiên theo dõi sức khỏe của " + dog.getDogName() + " (" + dog.getDogCode()
                + ") đã được xử lý xong";
        // Trainer-only: notify other trainers assigned to this dog
        for (DogAssignment a : dogAssignmentRepository.findByDogProfileDogIdAndIsActiveTrue(dog.getDogId())) {
            if (!a.getTrainer().getUserId().equals(trainerId)) {
                notificationService.notifyUser(
                        a.getTrainer(), trainer,
                        NotificationType.HEALTH_SESSION_RESOLVED,
                        resolveTitle, resolveMessage,
                        "HEALTH_SESSION", session.getSessionId()
                );
            }
        }

        return toResponse(session);
    }

    private HealthSessionResponse toResponse(HealthSession session) {
        List<SessionFollowUp> followUps = sessionFollowUpRepository
                .findByHealthSession_SessionIdOrderByFollowupDateDesc(session.getSessionId());

        List<FollowUpItemResponse> followUpItems = followUps.stream()
                .map(fu -> FollowUpItemResponse.builder()
                        .followupId(fu.getFollowupId())
                        .followupDate(fu.getFollowupDate())
                        .statusUpdate(fu.getStatusUpdate().name())
                        .notes(fu.getNotes())
                        .weightKg(fu.getWeightKg())
                        .temperatureC(fu.getTemperatureC())
                        .nextAction(fu.getNextAction())
                        .build())
                .toList();

        return HealthSessionResponse.builder()
                .sessionId(session.getSessionId())
                .dogId(session.getDogProfile().getDogId())
                .dogName(session.getDogProfile().getDogName())
                .dogCode(session.getDogProfile().getDogCode())
                .trainerId(session.getTrainer().getUserId())
                .trainerName(session.getTrainer().getFullName())
                .issueSummary(session.getIssueSummary())
                .initialDiagnosisId(session.getInitialDiagnosis() != null
                        ? session.getInitialDiagnosis().getDiagnosisId() : null)
                .status(session.getStatus().name())
                .severity(session.getSeverity().name())
                .startedAt(session.getStartedAt())
                .lastUpdateAt(session.getLastUpdateAt())
                .followUpDate(session.getFollowUpDate())
                .resolutionNotes(session.getResolutionNotes())
                .resolvedAt(session.getResolvedAt())
                .followUps(followUpItems)
                .build();
    }

    private PageResponse<HealthSessionResponse> toPageResponse(Page<HealthSession> sessionPage) {
        return PageResponse.<HealthSessionResponse>builder()
                .content(sessionPage.getContent().stream().map(this::toResponse).toList())
                .page(sessionPage.getNumber())
                .size(sessionPage.getSize())
                .totalElements(sessionPage.getTotalElements())
                .totalPages(sessionPage.getTotalPages())
                .build();
    }
}
