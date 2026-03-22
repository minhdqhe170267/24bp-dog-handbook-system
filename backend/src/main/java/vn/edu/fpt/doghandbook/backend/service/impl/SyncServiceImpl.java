package vn.edu.fpt.doghandbook.backend.service.impl;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import vn.edu.fpt.doghandbook.backend.dto.request.SyncPushRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncPushBatchResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncPushItemResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncQueueResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncStatusResponse;
import vn.edu.fpt.doghandbook.backend.entity.ContentSuggestion;
import vn.edu.fpt.doghandbook.backend.entity.DiagnosisRecord;
import vn.edu.fpt.doghandbook.backend.entity.Disease;
import vn.edu.fpt.doghandbook.backend.entity.DogProfile;
import vn.edu.fpt.doghandbook.backend.entity.FieldNote;
import vn.edu.fpt.doghandbook.backend.entity.HealthRecord;
import vn.edu.fpt.doghandbook.backend.entity.HealthSession;
import vn.edu.fpt.doghandbook.backend.entity.OperationReport;
import vn.edu.fpt.doghandbook.backend.entity.SessionFollowUp;
import vn.edu.fpt.doghandbook.backend.entity.SyncQueue;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.WeightAssessment;
import vn.edu.fpt.doghandbook.backend.entity.enums.AppetiteLevel;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.DogActivityLevel;
import vn.edu.fpt.doghandbook.backend.entity.enums.FecesStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.FollowUpStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.ReportType;
import vn.edu.fpt.doghandbook.backend.entity.enums.SessionSeverity;
import vn.edu.fpt.doghandbook.backend.entity.enums.SuggestionStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.SuggestionType;
import vn.edu.fpt.doghandbook.backend.entity.enums.SyncActionType;
import vn.edu.fpt.doghandbook.backend.entity.enums.SyncStatus;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.SyncConflictException;
import vn.edu.fpt.doghandbook.backend.entity.enums.WeightStatus;
import vn.edu.fpt.doghandbook.backend.repository.ContentSuggestionRepository;
import vn.edu.fpt.doghandbook.backend.repository.DiagnosisRecordRepository;
import vn.edu.fpt.doghandbook.backend.repository.DiseaseRepository;
import vn.edu.fpt.doghandbook.backend.repository.DogProfileRepository;
import vn.edu.fpt.doghandbook.backend.repository.FieldNoteRepository;
import vn.edu.fpt.doghandbook.backend.repository.HealthRecordRepository;
import vn.edu.fpt.doghandbook.backend.repository.HealthSessionRepository;
import vn.edu.fpt.doghandbook.backend.repository.OperationReportRepository;
import vn.edu.fpt.doghandbook.backend.repository.SessionFollowUpRepository;
import vn.edu.fpt.doghandbook.backend.repository.SyncQueueRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.repository.WeightAssessmentRepository;
import vn.edu.fpt.doghandbook.backend.service.NotificationService;
import vn.edu.fpt.doghandbook.backend.service.SyncService;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SyncServiceImpl implements SyncService {

    private static final int MAX_BATCH_SIZE = 100;
    private static final int MAX_RETRY_COUNT = 3;

    private final NamedParameterJdbcTemplate namedParameterJdbcTemplate;
    private final SyncQueueRepository syncQueueRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final PlatformTransactionManager transactionManager;

    // Entity repositories for sync push processing
    private final FieldNoteRepository fieldNoteRepository;
    private final HealthRecordRepository healthRecordRepository;
    private final ContentSuggestionRepository contentSuggestionRepository;
    private final HealthSessionRepository healthSessionRepository;
    private final SessionFollowUpRepository sessionFollowUpRepository;
    private final WeightAssessmentRepository weightAssessmentRepository;
    private final OperationReportRepository operationReportRepository;
    private final DiagnosisRecordRepository diagnosisRecordRepository;
    private final DogProfileRepository dogProfileRepository;
    private final DiseaseRepository diseaseRepository;
    private final NotificationService notificationService;

    @Override
    public SyncResponse getUpdatedContent(LocalDateTime lastSyncAt, Integer userId) {
        SyncWindow syncWindow = resolveSyncWindow(lastSyncAt);

        Map<String, List<?>> data = new LinkedHashMap<>();

        // --- 6 existing entities (with status + is_deleted) ---
        data.put("breeds", fetchSyncItems(
                "dog_breed",
                "breed_id AS breedId, breed_name AS breedName, description, image_url AS imageUrl",
                "breed_id",
                syncWindow,
                this::toBreedItem
        ));
        data.put("exercises", fetchSyncItems(
                "training_exercise",
                "exercise_id AS exerciseId, exercise_name AS exerciseName, description, difficulty_level AS difficultyLevel",
                "exercise_id",
                syncWindow,
                this::toExerciseItem
        ));
        data.put("diseases", fetchSyncItems(
                "disease",
                "disease_id AS diseaseId, disease_name AS diseaseName, description, severity_level AS severityLevel, is_contagious AS isContagious",
                "disease_id",
                syncWindow,
                this::toDiseaseItem
        ));
        data.put("medications", fetchSyncItems(
                "medication",
                "medication_id AS medicationId, medication_name AS medicationName, description, dosage_instructions AS dosageInstructions, administration_method AS administrationMethod",
                "medication_id",
                syncWindow,
                this::toMedicationItem
        ));
        data.put("firstAidGuides", fetchSyncItems(
                "first_aid_guide",
                "guide_id AS guideId, guide_title AS guideTitle, emergency_type AS emergencyType, description",
                "guide_id",
                syncWindow,
                this::toFirstAidItem
        ));
        data.put("contents", fetchSyncItems(
                "content",
                "content_id AS contentId, title, content_type AS contentType, summary, published_at AS publishedAt",
                "content_id",
                syncWindow,
                this::toContentItem
        ));

        // --- 6 new entities with status + is_deleted ---
        data.put("symptoms", fetchSyncItemsNoSoftDelete(
                "symptom",
                "symptom_id AS symptomId, symptom_code AS symptomCode, symptom_name AS symptomName, category, severity_indicator AS severityIndicator, description",
                "symptom_id",
                syncWindow,
                this::toSymptomItem
        ));
        data.put("trainingMethods", fetchSyncItems(
                "training_method",
                "method_id AS methodId, method_name AS methodName, description, advantages, disadvantages, instructions",
                "method_id",
                syncWindow,
                this::toTrainingMethodItem
        ));
        data.put("nutritionStandards", fetchSyncItems(
                "nutrition_standard",
                "standard_id AS standardId, breed_id AS breedId, ration_code AS rationCode, ration_name AS rationName, description, target_age_min_months AS targetAgeMinMonths, target_age_max_months AS targetAgeMaxMonths, activity_level AS activityLevel, health_condition AS healthCondition, special_notes AS specialNotes",
                "standard_id",
                syncWindow,
                this::toNutritionStandardItem
        ));
        data.put("developmentStages", fetchSyncItems(
                "development_stage",
                "stage_id AS stageId, breed_id AS breedId, stage_name AS stageName, age_min_months AS ageMinMonths, age_max_months AS ageMaxMonths, stage_order AS stageOrder, physical_milestones AS physicalMilestones, behavioral_milestones AS behavioralMilestones, training_notes AS trainingNotes, nutrition_notes AS nutritionNotes",
                "stage_id",
                syncWindow,
                this::toDevelopmentStageItem
        ));
        data.put("roadmaps", fetchSyncItems(
                "training_roadmap",
                "roadmap_id AS roadmapId, roadmap_name AS roadmapName, breed_id AS breedId, target_role AS targetRole, description, total_duration_weeks AS totalDurationWeeks, phase_name AS phaseName, phase_order AS phaseOrder, phase_duration_weeks AS phaseDurationWeeks, phase_objectives AS phaseObjectives, assessment_criteria AS assessmentCriteria",
                "roadmap_id",
                syncWindow,
                this::toRoadmapItem
        ));
        data.put("dogProfiles", fetchSyncItemsDogProfile(
                syncWindow,
                this::toDogProfileItem
        ));

        // --- 2 junction tables (no audit fields) ---
        data.put("diseaseSymptomMappings", fetchJunctionItems(
                "disease_symptom_mapping",
                "mapping_id AS mappingId, disease_id AS diseaseId, symptom_id AS symptomId, weight, is_primary AS isPrimary, notes",
                "mapping_id",
                this::toDiseaseSymptomMappingItem
        ));
        data.put("roadmapExercises", fetchJunctionItems(
                "roadmap_exercise",
                "roadmap_exercise_id AS roadmapExerciseId, roadmap_id AS roadmapId, exercise_id AS exerciseId, exercise_order AS exerciseOrder, is_mandatory AS isMandatory",
                "roadmap_exercise_id",
                this::toRoadmapExerciseItem
        ));

        // --- dogAssignments: filtered by current user ---
        data.put("dogAssignments", fetchDogAssignments(syncWindow, userId));

        // --- notifications for this user since last sync ---
        data.put("notifications", notificationService.getNotificationsSince(
                userId, syncWindow.lastSyncAt()));

        return SyncResponse.builder()
                .data(data)
                .syncTimestamp(syncWindow.syncTimestamp())
                .build();
    }

    @Override
    @Transactional
    public SyncQueueResponse pushToQueue(SyncPushRequest request, Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        SyncQueue entity = SyncQueue.builder()
                .user(user)
                .localId(request.getLocalId())
                .entityType(request.getEntityType())
                .entityId(request.getEntityId())
                .actionType(SyncActionType.valueOf(request.getActionType()))
                .payloadData(request.getPayloadData())
                .syncStatus(SyncStatus.PENDING)
                .retryCount(0)
                .queuedAt(LocalDateTime.now())
                .build();

        SyncQueue saved = syncQueueRepository.save(entity);
        return toSyncQueueResponse(saved);
    }

    @Override
    public SyncPushBatchResponse pushBatch(List<SyncPushRequest> items, Integer userId) {
        if (items == null) {
            throw new BadRequestException("Danh sách sync push không được để trống");
        }
        if (items.size() > MAX_BATCH_SIZE) {
            throw new BadRequestException("Batch sync push tối đa 100 items");
        }

        LocalDateTime serverTime = LocalDateTime.now();
        List<SyncPushItemResponse> results = new ArrayList<>(items.size());
        for (SyncPushRequest item : items) {
            results.add(processBatchItem(item, userId));
        }

        int totalSynced = 0;
        int totalConflicts = 0;
        int totalFailed = 0;
        for (SyncPushItemResponse result : results) {
            String syncStatus = result.getSyncStatus();
            if ("SYNCED".equals(syncStatus)) {
                totalSynced++;
            } else if ("CONFLICT".equals(syncStatus)) {
                totalConflicts++;
            } else if ("FAILED".equals(syncStatus)) {
                totalFailed++;
            }
        }

        return SyncPushBatchResponse.builder()
                .results(results)
                .serverTime(serverTime)
                .totalSynced(totalSynced)
                .totalConflicts(totalConflicts)
                .totalFailed(totalFailed)
                .build();
    }

    @Override
    @Transactional
    public List<SyncPushItemResponse> processPending(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        List<SyncQueue> pendingItems = syncQueueRepository
                .findByUserUserIdAndSyncStatusOrderByQueuedAtAsc(userId, SyncStatus.PENDING);

        List<SyncPushItemResponse> results = new ArrayList<>();
        for (SyncQueue item : pendingItems) {
            SyncPushItemResponse result = processItem(item, user);
            results.add(result);
        }

        return results;
    }

    // ── Sync Push Processing ──

    private SyncPushItemResponse processItem(SyncQueue item, User user) {
        String entityType = item.getEntityType();
        String localId = item.getLocalId();
        SyncActionType action = item.getActionType();

        try {
            Map<String, Object> payload = parsePayload(item.getPayloadData());

            // Idempotency: check if localId already processed
            if (localId != null && action == SyncActionType.CREATE) {
                Integer existingServerId = findExistingServerId(entityType, localId);
                if (existingServerId != null) {
                    log.info("[SYNC:PUSH] Idempotent skip {} {} localId={} → serverId={}",
                            entityType, action, localId, existingServerId);
                    item.setSyncStatus(SyncStatus.COMPLETED);
                    item.setSyncedAt(LocalDateTime.now());
                    syncQueueRepository.save(item);
                    return SyncPushItemResponse.synced(localId, existingServerId, entityType);
                }
            }

            Integer serverId = switch (entityType) {
                case "field_note" -> processFieldNote(action, localId, payload, user);
                case "health_record" -> processHealthRecord(action, localId, payload, user);
                case "health_session" -> processHealthSession(action, localId, payload, user);
                case "session_follow_up" -> processSessionFollowUp(action, localId, payload);
                case "content_suggestion" -> processContentSuggestion(action, localId, payload, user);
                case "weight_assessment" -> processWeightAssessment(action, localId, payload, user);
                case "operation_report" -> processOperationReport(action, localId, payload, user);
                case "diagnosis_record" -> processDiagnosisRecord(action, localId, payload, user);
                default -> throw new IllegalArgumentException("Unknown entity type: " + entityType);
            };

            item.setEntityId(serverId);
            item.setSyncStatus(SyncStatus.COMPLETED);
            item.setSyncedAt(LocalDateTime.now());
            syncQueueRepository.save(item);

            log.info("[SYNC:PUSH] Processing {} {} localId={} → serverId={}",
                    entityType, action, localId, serverId);

            return SyncPushItemResponse.synced(localId, serverId, entityType);

        } catch (SyncConflictException e) {
            log.warn("[SYNC:CONFLICT] {} localId={}: {}", entityType, localId, e.getMessage());
            item.setSyncStatus(SyncStatus.CONFLICT);
            item.setErrorMessage(e.getMessage());
            syncQueueRepository.save(item);
            // Convert serverData to a safe string to avoid LazyInitializationException
            // when Jackson serializes outside the transaction
            Object safeServerData = e.getServerData() != null
                    ? e.getServerData().toString()
                    : null;
            return SyncPushItemResponse.conflict(localId, entityType, safeServerData);

        } catch (Exception e) {
            log.error("[SYNC:PUSH] Failed {} {} localId={}: {}",
                    entityType, action, localId, e.getMessage());

            item.setRetryCount(item.getRetryCount() + 1);
            if (item.getRetryCount() >= MAX_RETRY_COUNT) {
                item.setSyncStatus(SyncStatus.FAILED);
            }
            item.setErrorMessage(e.getMessage());
            syncQueueRepository.save(item);

            return SyncPushItemResponse.failed(localId, entityType, e.getMessage());
        }
    }

    SyncPushItemResponse processBatchItem(SyncPushRequest item, Integer userId) {
        try {
            TransactionTemplate transactionTemplate = new TransactionTemplate(transactionManager);
            transactionTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
            SyncPushItemResponse result = transactionTemplate.execute(status -> {
                User user = userRepository.findById(userId)
                        .orElseThrow(() -> new RuntimeException("User not found: " + userId));

                try {
                    SyncQueue queueItem = SyncQueue.builder()
                            .user(user)
                            .localId(item.getLocalId())
                            .entityType(item.getEntityType())
                            .entityId(item.getEntityId())
                            .actionType(SyncActionType.valueOf(item.getActionType()))
                            .payloadData(item.getPayloadData())
                            .syncStatus(SyncStatus.PENDING)
                            .retryCount(0)
                            .queuedAt(LocalDateTime.now())
                            .build();
                    queueItem = syncQueueRepository.save(queueItem);
                    return processItem(queueItem, user);
                } catch (Exception e) {
                    log.error("[SYNC:PUSH] Failed to enqueue {} {} localId={}: {}",
                            item.getEntityType(), item.getActionType(), item.getLocalId(), e.getMessage());
                    return SyncPushItemResponse.failed(item.getLocalId(), item.getEntityType(), e.getMessage());
                }
            });

            if (result != null) {
                return result;
            }
        } catch (Exception e) {
            log.error("[SYNC:PUSH] Failed to process batch item {} {} localId={}: {}",
                    item.getEntityType(), item.getActionType(), item.getLocalId(), e.getMessage());
        }

        return SyncPushItemResponse.failed(item.getLocalId(), item.getEntityType(),
                "Unable to process batch item");
    }

    private Map<String, Object> parsePayload(String payloadData) {
        if (payloadData == null || payloadData.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(payloadData, new TypeReference<>() {});
        } catch (Exception e) {
            throw new RuntimeException("Invalid payload JSON: " + e.getMessage());
        }
    }

    private Integer findExistingServerId(String entityType, String localId) {
        return switch (entityType) {
            case "field_note" -> fieldNoteRepository.findByLocalId(localId).map(FieldNote::getNoteId).orElse(null);
            case "health_record" -> healthRecordRepository.findByLocalId(localId).map(HealthRecord::getRecordId).orElse(null);
            case "health_session" -> healthSessionRepository.findByLocalId(localId).map(HealthSession::getSessionId).orElse(null);
            case "session_follow_up" -> sessionFollowUpRepository.findByLocalId(localId).map(SessionFollowUp::getFollowupId).orElse(null);
            case "content_suggestion" -> contentSuggestionRepository.findByLocalId(localId).map(ContentSuggestion::getSuggestionId).orElse(null);
            case "weight_assessment" -> weightAssessmentRepository.findByLocalId(localId).map(WeightAssessment::getAssessmentId).orElse(null);
            case "operation_report" -> operationReportRepository.findByLocalId(localId).map(OperationReport::getReportId).orElse(null);
            case "diagnosis_record" -> diagnosisRecordRepository.findByLocalId(localId).map(DiagnosisRecord::getDiagnosisId).orElse(null);
            default -> null;
        };
    }

    // ── Entity Processors ──

    private Integer processFieldNote(SyncActionType action, String localId,
                                      Map<String, Object> payload, User user) {
        return switch (action) {
            case CREATE -> {
                DogProfile dog = resolveDog(payload);
                FieldNote note = FieldNote.builder()
                        .localId(localId)
                        .trainer(user)
                        .dogProfile(dog)
                        .title(getString(payload, "title"))
                        .content(getString(payload, "content"))
                        .photoUrls(getString(payload, "photoUrls"))
                        .recordingDate(getDateTime(payload, "recordingDate", LocalDateTime.now()))
                        .location(getString(payload, "location"))
                        .linkedContentId(getInteger(payload, "linkedContentId"))
                        .isDeleted(false)
                        .build();
                yield fieldNoteRepository.save(note).getNoteId();
            }
            case UPDATE -> {
                Integer serverId = requireServerId(payload);
                FieldNote note = fieldNoteRepository.findByNoteIdAndIsDeletedFalse(serverId)
                        .orElseThrow(() -> new RuntimeException("FieldNote not found: " + serverId));
                checkConflict("field_note", serverId, note.getUpdatedAt(), payload, note);
                if (payload.containsKey("title")) note.setTitle(getString(payload, "title"));
                if (payload.containsKey("content")) note.setContent(getString(payload, "content"));
                if (payload.containsKey("photoUrls")) note.setPhotoUrls(getString(payload, "photoUrls"));
                if (payload.containsKey("location")) note.setLocation(getString(payload, "location"));
                if (payload.containsKey("dogId")) note.setDogProfile(resolveDog(payload));
                yield fieldNoteRepository.save(note).getNoteId();
            }
            case DELETE -> {
                Integer serverId = requireServerId(payload);
                FieldNote note = fieldNoteRepository.findByNoteIdAndIsDeletedFalse(serverId)
                        .orElseThrow(() -> new RuntimeException("FieldNote not found: " + serverId));
                note.setIsDeleted(true);
                note.setDeletedAt(LocalDateTime.now());
                fieldNoteRepository.save(note);
                yield serverId;
            }
        };
    }

    private Integer processHealthRecord(SyncActionType action, String localId,
                                         Map<String, Object> payload, User user) {
        return switch (action) {
            case CREATE -> {
                DogProfile dog = resolveDogRequired(payload);
                HealthRecord record = HealthRecord.builder()
                        .localId(localId)
                        .dogProfile(dog)
                        .examiner(user)
                        .examinationDate(getDateTime(payload, "examinationDate", LocalDateTime.now()))
                        .weightKg(getBigDecimal(payload, "weightKg"))
                        .temperatureC(getBigDecimal(payload, "temperatureC"))
                        .fecesStatus(getEnum(payload, "fecesStatus", FecesStatus.class, FecesStatus.NOT_CHECKED))
                        .appetiteLevel(getEnum(payload, "appetiteLevel", AppetiteLevel.class, null))
                        .activityLevel(getEnum(payload, "activityLevel", DogActivityLevel.class, null))
                        .observedSymptoms(getString(payload, "observedSymptoms"))
                        .diagnosis(getString(payload, "diagnosis"))
                        .treatmentGiven(getString(payload, "treatmentGiven"))
                        .nextCheckupDate(getLocalDate(payload, "nextCheckupDate"))
                        .notes(getString(payload, "notes"))
                        .isDeleted(false)
                        .build();
                record = healthRecordRepository.save(record);
                // Update dog's current weight
                if (record.getWeightKg() != null) {
                    dog.setCurrentWeightKg(record.getWeightKg());
                    dogProfileRepository.save(dog);
                }
                yield record.getRecordId();
            }
            case UPDATE -> {
                Integer serverId = requireServerId(payload);
                HealthRecord record = healthRecordRepository.findByRecordIdAndIsDeletedFalse(serverId)
                        .orElseThrow(() -> new RuntimeException("HealthRecord not found: " + serverId));
                checkConflict("health_record", serverId, record.getUpdatedAt(), payload, record);
                if (payload.containsKey("weightKg")) record.setWeightKg(getBigDecimal(payload, "weightKg"));
                if (payload.containsKey("temperatureC")) record.setTemperatureC(getBigDecimal(payload, "temperatureC"));
                if (payload.containsKey("observedSymptoms")) record.setObservedSymptoms(getString(payload, "observedSymptoms"));
                if (payload.containsKey("diagnosis")) record.setDiagnosis(getString(payload, "diagnosis"));
                if (payload.containsKey("treatmentGiven")) record.setTreatmentGiven(getString(payload, "treatmentGiven"));
                if (payload.containsKey("notes")) record.setNotes(getString(payload, "notes"));
                yield healthRecordRepository.save(record).getRecordId();
            }
            case DELETE -> {
                Integer serverId = requireServerId(payload);
                HealthRecord record = healthRecordRepository.findByRecordIdAndIsDeletedFalse(serverId)
                        .orElseThrow(() -> new RuntimeException("HealthRecord not found: " + serverId));
                record.setIsDeleted(true);
                record.setDeletedAt(LocalDateTime.now());
                healthRecordRepository.save(record);
                yield serverId;
            }
        };
    }

    private Integer processHealthSession(SyncActionType action, String localId,
                                          Map<String, Object> payload, User user) {
        return switch (action) {
            case CREATE -> {
                DogProfile dog = resolveDogRequired(payload);
                HealthSession session = HealthSession.builder()
                        .localId(localId)
                        .dogProfile(dog)
                        .trainer(user)
                        .issueSummary(getString(payload, "issueSummary"))
                        .severity(getEnum(payload, "severity", SessionSeverity.class, SessionSeverity.MEDIUM))
                        .followUpDate(getLocalDate(payload, "followUpDate"))
                        .build();
                // Link initial diagnosis if provided
                Integer diagId = getInteger(payload, "initialDiagnosisId");
                if (diagId != null) {
                    session.setInitialDiagnosis(diagnosisRecordRepository.findById(diagId).orElse(null));
                }
                yield healthSessionRepository.save(session).getSessionId();
            }
            case UPDATE -> {
                Integer serverId = requireServerId(payload);
                HealthSession session = healthSessionRepository.findBySessionId(serverId)
                        .orElseThrow(() -> new RuntimeException("HealthSession not found: " + serverId));
                checkConflict("health_session", serverId, session.getLastUpdateAt(), payload, session);
                if (payload.containsKey("issueSummary")) session.setIssueSummary(getString(payload, "issueSummary"));
                if (payload.containsKey("severity")) session.setSeverity(getEnum(payload, "severity", SessionSeverity.class, session.getSeverity()));
                if (payload.containsKey("resolutionNotes")) session.setResolutionNotes(getString(payload, "resolutionNotes"));
                yield healthSessionRepository.save(session).getSessionId();
            }
            case DELETE -> {
                // HealthSession has no soft-delete, skip
                Integer serverId = requireServerId(payload);
                log.warn("[SYNC:PUSH] DELETE not supported for health_session, serverId={}", serverId);
                yield serverId;
            }
        };
    }

    private Integer processSessionFollowUp(SyncActionType action, String localId,
                                             Map<String, Object> payload) {
        return switch (action) {
            case CREATE -> {
                Integer sessionId = getInteger(payload, "sessionId");
                HealthSession session = healthSessionRepository.findBySessionId(sessionId)
                        .orElseThrow(() -> new RuntimeException("HealthSession not found: " + sessionId));
                SessionFollowUp followUp = SessionFollowUp.builder()
                        .localId(localId)
                        .healthSession(session)
                        .statusUpdate(getEnum(payload, "statusUpdate", FollowUpStatus.class, FollowUpStatus.SAME))
                        .notes(getString(payload, "notes"))
                        .weightKg(getBigDecimal(payload, "weightKg"))
                        .temperatureC(getBigDecimal(payload, "temperatureC"))
                        .nextAction(getString(payload, "nextAction"))
                        .build();
                yield sessionFollowUpRepository.save(followUp).getFollowupId();
            }
            case UPDATE -> {
                Integer serverId = requireServerId(payload);
                SessionFollowUp followUp = sessionFollowUpRepository.findById(serverId)
                        .orElseThrow(() -> new RuntimeException("SessionFollowUp not found: " + serverId));
                checkConflict("session_follow_up", serverId, followUp.getFollowupDate(), payload, followUp);
                if (payload.containsKey("notes")) followUp.setNotes(getString(payload, "notes"));
                if (payload.containsKey("nextAction")) followUp.setNextAction(getString(payload, "nextAction"));
                yield sessionFollowUpRepository.save(followUp).getFollowupId();
            }
            case DELETE -> {
                Integer serverId = requireServerId(payload);
                log.warn("[SYNC:PUSH] DELETE not supported for session_follow_up, serverId={}", serverId);
                yield serverId;
            }
        };
    }

    private Integer processContentSuggestion(SyncActionType action, String localId,
                                              Map<String, Object> payload, User user) {
        return switch (action) {
            case CREATE -> {
                ContentSuggestion suggestion = ContentSuggestion.builder()
                        .localId(localId)
                        .trainer(user)
                        .suggestionType(getEnum(payload, "suggestionType", SuggestionType.class, null))
                        .title(getString(payload, "title"))
                        .description(getString(payload, "description"))
                        .status(SuggestionStatus.SUBMITTED)
                        .submittedAt(LocalDateTime.now())
                        .build();
                yield contentSuggestionRepository.save(suggestion).getSuggestionId();
            }
            case UPDATE -> {
                Integer serverId = requireServerId(payload);
                ContentSuggestion suggestion = contentSuggestionRepository.findById(serverId)
                        .orElseThrow(() -> new RuntimeException("ContentSuggestion not found: " + serverId));
                checkConflict("content_suggestion", serverId, suggestion.getSubmittedAt(), payload, suggestion);
                if (payload.containsKey("title")) suggestion.setTitle(getString(payload, "title"));
                if (payload.containsKey("description")) suggestion.setDescription(getString(payload, "description"));
                yield contentSuggestionRepository.save(suggestion).getSuggestionId();
            }
            case DELETE -> {
                Integer serverId = requireServerId(payload);
                log.warn("[SYNC:PUSH] DELETE not supported for content_suggestion, serverId={}", serverId);
                yield serverId;
            }
        };
    }

    private Integer processWeightAssessment(SyncActionType action, String localId,
                                             Map<String, Object> payload, User user) {
        return switch (action) {
            case CREATE -> {
                DogProfile dog = resolveDogRequired(payload);
                WeightAssessment assessment = WeightAssessment.builder()
                        .localId(localId)
                        .dogProfile(dog)
                        .assessor(user)
                        .recordedWeightKg(getBigDecimal(payload, "recordedWeightKg"))
                        .standardMinKg(getBigDecimal(payload, "standardMinKg"))
                        .standardMaxKg(getBigDecimal(payload, "standardMaxKg"))
                        .status(getEnum(payload, "status", WeightStatus.class, WeightStatus.NORMAL))
                        .deviationPercent(getBigDecimal(payload, "deviationPercent"))
                        .recommendation(getString(payload, "recommendation"))
                        .followUpWeeks(getInteger(payload, "followUpWeeks"))
                        .build();
                yield weightAssessmentRepository.save(assessment).getAssessmentId();
            }
            case UPDATE, DELETE -> {
                Integer serverId = requireServerId(payload);
                log.warn("[SYNC:PUSH] {} not supported for weight_assessment, serverId={}", action, serverId);
                yield serverId;
            }
        };
    }

    private Integer processOperationReport(SyncActionType action, String localId,
                                            Map<String, Object> payload, User user) {
        return switch (action) {
            case CREATE -> {
                DogProfile dog = resolveDogRequired(payload);
                OperationReport report = OperationReport.builder()
                        .localId(localId)
                        .trainer(user)
                        .dogProfile(dog)
                        .reportType(getEnum(payload, "reportType", ReportType.class, ReportType.TRAINING))
                        .reportTitle(getString(payload, "reportTitle"))
                        .reportDate(getLocalDate(payload, "reportDate") != null
                                ? getLocalDate(payload, "reportDate") : LocalDate.now())
                        .reportContent(getString(payload, "reportContent"))
                        .metadata(getString(payload, "metadata"))
                        .isDeleted(false)
                        .build();
                yield operationReportRepository.save(report).getReportId();
            }
            case UPDATE -> {
                Integer serverId = requireServerId(payload);
                OperationReport report = operationReportRepository.findByReportIdAndIsDeletedFalse(serverId)
                        .orElseThrow(() -> new RuntimeException("OperationReport not found: " + serverId));
                checkConflict("operation_report", serverId, report.getUpdatedAt(), payload, report);
                if (payload.containsKey("reportTitle")) report.setReportTitle(getString(payload, "reportTitle"));
                if (payload.containsKey("reportContent")) report.setReportContent(getString(payload, "reportContent"));
                if (payload.containsKey("metadata")) report.setMetadata(getString(payload, "metadata"));
                if (payload.containsKey("reportType")) report.setReportType(getEnum(payload, "reportType", ReportType.class, report.getReportType()));
                yield operationReportRepository.save(report).getReportId();
            }
            case DELETE -> {
                Integer serverId = requireServerId(payload);
                OperationReport report = operationReportRepository.findByReportIdAndIsDeletedFalse(serverId)
                        .orElseThrow(() -> new RuntimeException("OperationReport not found: " + serverId));
                report.setIsDeleted(true);
                report.setDeletedAt(LocalDateTime.now());
                operationReportRepository.save(report);
                yield serverId;
            }
        };
    }

    private Integer processDiagnosisRecord(SyncActionType action, String localId,
                                            Map<String, Object> payload, User user) {
        return switch (action) {
            case CREATE -> {
                DogProfile dog = resolveDogRequired(payload);
                DiagnosisRecord record = DiagnosisRecord.builder()
                        .localId(localId)
                        .dogProfile(dog)
                        .trainer(user)
                        .selectedSymptoms(getString(payload, "selectedSymptoms"))
                        .matchScore(getBigDecimal(payload, "matchScore"))
                        .allResults(getString(payload, "allResults"))
                        .actionTaken(getString(payload, "actionTaken"))
                        .build();
                // Link matched disease if provided
                Integer diseaseId = getInteger(payload, "matchedDiseaseId");
                if (diseaseId != null) {
                    record.setMatchedDisease(diseaseRepository.findById(diseaseId).orElse(null));
                }
                yield diagnosisRecordRepository.save(record).getDiagnosisId();
            }
            case UPDATE -> {
                Integer serverId = requireServerId(payload);
                DiagnosisRecord record = diagnosisRecordRepository.findById(serverId)
                        .orElseThrow(() -> new RuntimeException("DiagnosisRecord not found: " + serverId));
                checkConflict("diagnosis_record", serverId, record.getDiagnosedAt(), payload, record);
                if (payload.containsKey("actionTaken")) record.setActionTaken(getString(payload, "actionTaken"));
                yield diagnosisRecordRepository.save(record).getDiagnosisId();
            }
            case DELETE -> {
                Integer serverId = requireServerId(payload);
                log.warn("[SYNC:PUSH] DELETE not supported for diagnosis_record, serverId={}", serverId);
                yield serverId;
            }
        };
    }

    // ── Conflict Detection ──

    private void checkConflict(String entityType, Integer serverId,
                                LocalDateTime serverUpdatedAt, Map<String, Object> payload,
                                Object serverData) {
        LocalDateTime localUpdatedAt = getDateTime(payload, "localUpdatedAt", null);
        if (localUpdatedAt != null && serverUpdatedAt != null
                && serverUpdatedAt.isAfter(localUpdatedAt)) {
            log.warn("[SYNC:CONFLICT] {} id={} serverTime={} > localTime={}",
                    entityType, serverId, serverUpdatedAt, localUpdatedAt);
            throw new SyncConflictException("Record modified on server", serverData);
        }
    }

    // ── Payload Helpers ──

    private DogProfile resolveDog(Map<String, Object> payload) {
        Integer dogId = getInteger(payload, "dogId");
        if (dogId == null) return null;
        return dogProfileRepository.findByDogIdAndIsDeletedFalse(dogId).orElse(null);
    }

    private DogProfile resolveDogRequired(Map<String, Object> payload) {
        Integer dogId = getInteger(payload, "dogId");
        if (dogId == null) throw new RuntimeException("dogId is required in payload");
        return dogProfileRepository.findByDogIdAndIsDeletedFalse(dogId)
                .orElseThrow(() -> new RuntimeException("Dog not found: " + dogId));
    }

    private Integer requireServerId(Map<String, Object> payload) {
        Integer serverId = getInteger(payload, "serverId");
        if (serverId == null) throw new RuntimeException("serverId is required for UPDATE/DELETE");
        return serverId;
    }

    private String getString(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        return value == null ? null : String.valueOf(value);
    }

    private Integer getInteger(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        if (value == null) return null;
        if (value instanceof Number number) return number.intValue();
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private BigDecimal getBigDecimal(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        if (value == null) return null;
        if (value instanceof Number number) return BigDecimal.valueOf(number.doubleValue());
        try {
            return new BigDecimal(String.valueOf(value));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private LocalDateTime getDateTime(Map<String, Object> payload, String key, LocalDateTime defaultValue) {
        Object value = payload.get(key);
        if (value == null) return defaultValue;
        try {
            return LocalDateTime.parse(String.valueOf(value));
        } catch (Exception e) {
            return defaultValue;
        }
    }

    private LocalDate getLocalDate(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        if (value == null) return null;
        try {
            return LocalDate.parse(String.valueOf(value));
        } catch (Exception e) {
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private <E extends Enum<E>> E getEnum(Map<String, Object> payload, String key,
                                           Class<E> enumClass, E defaultValue) {
        Object value = payload.get(key);
        if (value == null) return defaultValue;
        try {
            return Enum.valueOf(enumClass, String.valueOf(value).toUpperCase());
        } catch (IllegalArgumentException e) {
            return defaultValue;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public SyncStatusResponse getStatus(Integer userId) {
        long pending = syncQueueRepository.countByUserUserIdAndSyncStatus(userId, SyncStatus.PENDING);
        long completed = syncQueueRepository.countByUserUserIdAndSyncStatus(userId, SyncStatus.COMPLETED);
        long failed = syncQueueRepository.countByUserUserIdAndSyncStatus(userId, SyncStatus.FAILED);
        long conflict = syncQueueRepository.countByUserUserIdAndSyncStatus(userId, SyncStatus.CONFLICT);

        List<SyncQueue> pendingItems = syncQueueRepository
                .findByUserUserIdAndSyncStatusOrderByQueuedAtAsc(userId, SyncStatus.PENDING);

        // lastSyncAt = most recent COMPLETED item's syncedAt
        List<SyncQueue> completedItems = syncQueueRepository
                .findByUserUserIdAndSyncStatusOrderByQueuedAtAsc(userId, SyncStatus.COMPLETED);
        LocalDateTime lastSyncAt = completedItems.stream()
                .map(SyncQueue::getSyncedAt)
                .filter(Objects::nonNull)
                .max(LocalDateTime::compareTo)
                .orElse(null);

        return SyncStatusResponse.builder()
                .totalPending((int) pending)
                .totalCompleted((int) completed)
                .totalFailed((int) failed)
                .totalConflict((int) conflict)
                .lastSyncAt(lastSyncAt)
                .pendingItems(pendingItems.stream().map(this::toSyncQueueResponse).toList())
                .build();
    }

    private SyncQueueResponse toSyncQueueResponse(SyncQueue entity) {
        return SyncQueueResponse.builder()
                .queueId(entity.getQueueId())
                .userId(entity.getUser().getUserId())
                .entityType(entity.getEntityType())
                .entityId(entity.getEntityId())
                .actionType(entity.getActionType().name())
                .syncStatus(entity.getSyncStatus().name())
                .retryCount(entity.getRetryCount())
                .errorMessage(entity.getErrorMessage())
                .queuedAt(entity.getQueuedAt())
                .syncedAt(entity.getSyncedAt())
                .build();
    }

    private SyncWindow resolveSyncWindow(LocalDateTime lastSyncAt) {
        LocalDateTime syncTimestamp = LocalDateTime.now();
        if (lastSyncAt != null && lastSyncAt.isAfter(syncTimestamp)) {
            syncTimestamp = lastSyncAt;
        }
        return new SyncWindow(lastSyncAt, syncTimestamp);
    }

    private List<Map<String, Object>> fetchSyncItems(
            String tableName,
            String selectClause,
            String idColumn,
            SyncWindow syncWindow,
            Function<Map<String, Object>, Map<String, Object>> payloadMapper
    ) {
        String sql = buildSyncSql(tableName, selectClause, idColumn, syncWindow.lastSyncAt());
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("lastSyncAt", syncWindow.lastSyncAt())
                .addValue("syncTimestamp", syncWindow.syncTimestamp())
                .addValue("publishedStatus", ContentStatus.PUBLISHED.name());

        return namedParameterJdbcTemplate.queryForList(sql, params)
                .stream()
                .map(row -> mapSyncItem(row, syncWindow.lastSyncAt(), payloadMapper))
                .filter(Objects::nonNull)
                .toList();
    }

    private String buildSyncSql(String tableName, String selectClause, String idColumn, LocalDateTime lastSyncAt) {
        String auditColumns = selectClause
                + ", status AS status, created_at AS createdAt, updated_at AS updatedAt, deleted_at AS deletedAt, is_deleted AS isDeleted";

        if (lastSyncAt == null) {
            return """
                    SELECT %s
                    FROM %s
                    WHERE status = :publishedStatus
                      AND is_deleted = 0
                    ORDER BY updated_at ASC, %s ASC
                    """.formatted(auditColumns, tableName, idColumn);
        }

        return """
                SELECT %s
                FROM %s
                WHERE updated_at > :lastSyncAt
                  AND updated_at <= :syncTimestamp
                ORDER BY updated_at ASC, %s ASC
                """.formatted(auditColumns, tableName, idColumn);
    }

    private Map<String, Object> mapSyncItem(
            Map<String, Object> row,
            LocalDateTime lastSyncAt,
            Function<Map<String, Object>, Map<String, Object>> payloadMapper
    ) {
        boolean isDeleted = toBoolean(row.get("isDeleted"));
        String status = toText(row.get("status"));
        LocalDateTime createdAt = toLocalDateTime(row.get("createdAt"));

        if (lastSyncAt != null && (isDeleted || !ContentStatus.PUBLISHED.name().equals(status))) {
            if (createdAt != null && createdAt.isAfter(lastSyncAt) && !isDeleted) {
                return null;
            }
            return toDeleteItem(row);
        }

        Map<String, Object> item = payloadMapper.apply(row);
        item.put("status", status);
        item.put("updatedAt", toLocalDateTime(row.get("updatedAt")));
        item.put("syncAction", resolveSyncAction(lastSyncAt, createdAt));
        return item;
    }

    private String resolveSyncAction(LocalDateTime lastSyncAt, LocalDateTime createdAt) {
        if (lastSyncAt == null) {
            return SyncActionType.CREATE.name();
        }
        if (createdAt != null && createdAt.isAfter(lastSyncAt)) {
            return SyncActionType.CREATE.name();
        }
        return SyncActionType.UPDATE.name();
    }

    private Map<String, Object> toDeleteItem(Map<String, Object> row) {
        Map<String, Object> item = new LinkedHashMap<>();
        row.forEach((key, value) -> {
            if (key.endsWith("Id")) {
                item.put(key, value);
            }
        });
        item.put("status", toText(row.get("status")));
        item.put("updatedAt", toLocalDateTime(row.get("updatedAt")));
        item.put("deletedAt", toLocalDateTime(row.get("deletedAt")));
        item.put("isDeleted", toBoolean(row.get("isDeleted")));
        item.put("syncAction", SyncActionType.DELETE.name());
        return item;
    }

    private Map<String, Object> toBreedItem(Map<String, Object> row) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("breedId", row.get("breedId"));
        item.put("breedName", row.get("breedName"));
        item.put("description", row.get("description"));
        item.put("imageUrl", row.get("imageUrl"));
        return item;
    }

    private Map<String, Object> toExerciseItem(Map<String, Object> row) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("exerciseId", row.get("exerciseId"));
        item.put("exerciseName", row.get("exerciseName"));
        item.put("description", row.get("description"));
        item.put("difficultyLevel", row.get("difficultyLevel"));
        return item;
    }

    private Map<String, Object> toDiseaseItem(Map<String, Object> row) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("diseaseId", row.get("diseaseId"));
        item.put("diseaseName", row.get("diseaseName"));
        item.put("description", row.get("description"));
        item.put("severityLevel", row.get("severityLevel"));
        item.put("isContagious", toBoolean(row.get("isContagious")));
        return item;
    }

    private Map<String, Object> toMedicationItem(Map<String, Object> row) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("medicationId", row.get("medicationId"));
        item.put("medicationName", row.get("medicationName"));
        item.put("description", row.get("description"));
        item.put("dosageInstructions", row.get("dosageInstructions"));
        item.put("administrationMethod", row.get("administrationMethod"));
        return item;
    }

    private Map<String, Object> toFirstAidItem(Map<String, Object> row) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("guideId", row.get("guideId"));
        item.put("guideTitle", row.get("guideTitle"));
        item.put("emergencyType", row.get("emergencyType"));
        item.put("description", row.get("description"));
        return item;
    }

    // ── Fetch methods for entities without soft-delete (Symptom) ──

    private List<Map<String, Object>> fetchSyncItemsNoSoftDelete(
            String tableName,
            String selectClause,
            String idColumn,
            SyncWindow syncWindow,
            Function<Map<String, Object>, Map<String, Object>> payloadMapper
    ) {
        String auditColumns = selectClause
                + ", created_at AS createdAt, updated_at AS updatedAt";
        String sql;
        if (syncWindow.lastSyncAt() == null) {
            sql = """
                    SELECT %s
                    FROM %s
                    ORDER BY updated_at ASC, %s ASC
                    """.formatted(auditColumns, tableName, idColumn);
        } else {
            sql = """
                    SELECT %s
                    FROM %s
                    WHERE updated_at > :lastSyncAt
                      AND updated_at <= :syncTimestamp
                    ORDER BY updated_at ASC, %s ASC
                    """.formatted(auditColumns, tableName, idColumn);
        }
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("lastSyncAt", syncWindow.lastSyncAt())
                .addValue("syncTimestamp", syncWindow.syncTimestamp());

        return namedParameterJdbcTemplate.queryForList(sql, params)
                .stream()
                .map(row -> {
                    Map<String, Object> item = payloadMapper.apply(row);
                    item.put("updatedAt", toLocalDateTime(row.get("updatedAt")));
                    item.put("syncAction", resolveSyncAction(syncWindow.lastSyncAt(),
                            toLocalDateTime(row.get("createdAt"))));
                    return item;
                })
                .toList();
    }

    // ── Fetch method for DogProfile (uses DogStatus instead of ContentStatus) ──

    private List<Map<String, Object>> fetchSyncItemsDogProfile(
            SyncWindow syncWindow,
            Function<Map<String, Object>, Map<String, Object>> payloadMapper
    ) {
        String selectClause = "dog_id AS dogId, dog_code AS dogCode, dog_name AS dogName, "
                + "breed_id AS breedId, birth_date AS birthDate, gender, "
                + "current_weight_kg AS currentWeightKg, height_cm AS heightCm, color, "
                + "microchip_id AS microchipId, status AS status, assignment_date AS assignmentDate, "
                + "is_sterilized AS isSterilized, image_url AS imageUrl, notes, "
                + "created_at AS createdAt, updated_at AS updatedAt, "
                + "deleted_at AS deletedAt, is_deleted AS isDeleted";
        String sql;
        if (syncWindow.lastSyncAt() == null) {
            sql = """
                    SELECT %s
                    FROM dog_profile
                    WHERE is_deleted = 0
                    ORDER BY updated_at ASC, dog_id ASC
                    """.formatted(selectClause);
        } else {
            sql = """
                    SELECT %s
                    FROM dog_profile
                    WHERE updated_at > :lastSyncAt
                      AND updated_at <= :syncTimestamp
                    ORDER BY updated_at ASC, dog_id ASC
                    """.formatted(selectClause);
        }
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("lastSyncAt", syncWindow.lastSyncAt())
                .addValue("syncTimestamp", syncWindow.syncTimestamp());

        return namedParameterJdbcTemplate.queryForList(sql, params)
                .stream()
                .map(row -> {
                    boolean isDeleted = toBoolean(row.get("isDeleted"));
                    LocalDateTime createdAt = toLocalDateTime(row.get("createdAt"));

                    if (syncWindow.lastSyncAt() != null && isDeleted) {
                        if (createdAt != null && createdAt.isAfter(syncWindow.lastSyncAt())) {
                            return null;
                        }
                        return toDeleteItem(row);
                    }
                    Map<String, Object> item = payloadMapper.apply(row);
                    item.put("status", toText(row.get("status")));
                    item.put("updatedAt", toLocalDateTime(row.get("updatedAt")));
                    item.put("syncAction", resolveSyncAction(syncWindow.lastSyncAt(), createdAt));
                    return item;
                })
                .filter(Objects::nonNull)
                .toList();
    }

    // ── Fetch method for junction tables (no audit fields — always full sync) ──

    private List<Map<String, Object>> fetchJunctionItems(
            String tableName,
            String selectClause,
            String idColumn,
            Function<Map<String, Object>, Map<String, Object>> payloadMapper
    ) {
        String sql = "SELECT %s FROM %s ORDER BY %s ASC".formatted(selectClause, tableName, idColumn);
        MapSqlParameterSource params = new MapSqlParameterSource();

        return namedParameterJdbcTemplate.queryForList(sql, params)
                .stream()
                .map(row -> {
                    Map<String, Object> item = payloadMapper.apply(row);
                    item.put("syncAction", SyncActionType.CREATE.name());
                    return item;
                })
                .toList();
    }

    // ── Fetch method for DogAssignment (filtered by userId, uses is_active) ──

    private List<Map<String, Object>> fetchDogAssignments(SyncWindow syncWindow, Integer userId) {
        String selectClause = "da.assignment_id AS assignmentId, da.trainer_id AS trainerId, "
                + "da.dog_id AS dogId, da.assignment_type AS assignmentType, "
                + "da.start_date AS startDate, da.end_date AS endDate, "
                + "da.is_active AS isActive, da.notes, "
                + "da.created_at AS createdAt, da.updated_at AS updatedAt, "
                + "u.full_name AS trainerName, "
                + "dp.dog_name AS dogName, dp.dog_code AS dogCode";
        String sql;
        if (syncWindow.lastSyncAt() == null) {
            sql = """
                    SELECT %s
                    FROM dog_assignment da
                    LEFT JOIN user u ON u.user_id = da.trainer_id
                    LEFT JOIN dog_profile dp ON dp.dog_id = da.dog_id
                    WHERE da.trainer_id = :userId
                    ORDER BY da.updated_at ASC, da.assignment_id ASC
                    """.formatted(selectClause);
        } else {
            sql = """
                    SELECT %s
                    FROM dog_assignment da
                    LEFT JOIN user u ON u.user_id = da.trainer_id
                    LEFT JOIN dog_profile dp ON dp.dog_id = da.dog_id
                    WHERE da.trainer_id = :userId
                      AND da.updated_at > :lastSyncAt
                      AND da.updated_at <= :syncTimestamp
                    ORDER BY da.updated_at ASC, da.assignment_id ASC
                    """.formatted(selectClause);
        }
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("userId", userId)
                .addValue("lastSyncAt", syncWindow.lastSyncAt())
                .addValue("syncTimestamp", syncWindow.syncTimestamp());

        return namedParameterJdbcTemplate.queryForList(sql, params)
                .stream()
                .map(row -> {
                    Map<String, Object> item = toDogAssignmentItem(row);
                    item.put("updatedAt", toLocalDateTime(row.get("updatedAt")));
                    item.put("syncAction", resolveSyncAction(syncWindow.lastSyncAt(),
                            toLocalDateTime(row.get("createdAt"))));
                    return item;
                })
                .toList();
    }

    // ── Mapper methods for new entities ──

    private Map<String, Object> toSymptomItem(Map<String, Object> row) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("symptomId", row.get("symptomId"));
        item.put("symptomCode", row.get("symptomCode"));
        item.put("symptomName", row.get("symptomName"));
        item.put("category", toText(row.get("category")));
        item.put("severityIndicator", row.get("severityIndicator"));
        item.put("description", row.get("description"));
        return item;
    }

    private Map<String, Object> toTrainingMethodItem(Map<String, Object> row) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("methodId", row.get("methodId"));
        item.put("methodName", row.get("methodName"));
        item.put("description", row.get("description"));
        item.put("advantages", row.get("advantages"));
        item.put("disadvantages", row.get("disadvantages"));
        item.put("instructions", row.get("instructions"));
        return item;
    }

    private Map<String, Object> toNutritionStandardItem(Map<String, Object> row) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("standardId", row.get("standardId"));
        item.put("breedId", row.get("breedId"));
        item.put("rationCode", row.get("rationCode"));
        item.put("rationName", row.get("rationName"));
        item.put("description", row.get("description"));
        item.put("targetAgeMinMonths", row.get("targetAgeMinMonths"));
        item.put("targetAgeMaxMonths", row.get("targetAgeMaxMonths"));
        item.put("activityLevel", toText(row.get("activityLevel")));
        item.put("healthCondition", toText(row.get("healthCondition")));
        item.put("specialNotes", row.get("specialNotes"));
        return item;
    }

    private Map<String, Object> toDevelopmentStageItem(Map<String, Object> row) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("stageId", row.get("stageId"));
        item.put("breedId", row.get("breedId"));
        item.put("stageName", row.get("stageName"));
        item.put("ageMinMonths", row.get("ageMinMonths"));
        item.put("ageMaxMonths", row.get("ageMaxMonths"));
        item.put("stageOrder", row.get("stageOrder"));
        item.put("physicalMilestones", row.get("physicalMilestones"));
        item.put("behavioralMilestones", row.get("behavioralMilestones"));
        item.put("trainingNotes", row.get("trainingNotes"));
        item.put("nutritionNotes", row.get("nutritionNotes"));
        return item;
    }

    private Map<String, Object> toRoadmapItem(Map<String, Object> row) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("roadmapId", row.get("roadmapId"));
        item.put("roadmapName", row.get("roadmapName"));
        item.put("breedId", row.get("breedId"));
        item.put("targetRole", row.get("targetRole"));
        item.put("description", row.get("description"));
        item.put("totalDurationWeeks", row.get("totalDurationWeeks"));
        item.put("phaseName", row.get("phaseName"));
        item.put("phaseOrder", row.get("phaseOrder"));
        item.put("phaseDurationWeeks", row.get("phaseDurationWeeks"));
        item.put("phaseObjectives", row.get("phaseObjectives"));
        item.put("assessmentCriteria", row.get("assessmentCriteria"));
        return item;
    }

    private Map<String, Object> toDogProfileItem(Map<String, Object> row) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("dogId", row.get("dogId"));
        item.put("dogCode", row.get("dogCode"));
        item.put("dogName", row.get("dogName"));
        item.put("breedId", row.get("breedId"));
        item.put("birthDate", row.get("birthDate"));
        item.put("gender", toText(row.get("gender")));
        item.put("currentWeightKg", row.get("currentWeightKg"));
        item.put("heightCm", row.get("heightCm"));
        item.put("color", row.get("color"));
        item.put("microchipId", row.get("microchipId"));
        item.put("assignmentDate", row.get("assignmentDate"));
        item.put("isSterilized", toBoolean(row.get("isSterilized")));
        item.put("imageUrl", row.get("imageUrl"));
        item.put("notes", row.get("notes"));
        return item;
    }

    private Map<String, Object> toDiseaseSymptomMappingItem(Map<String, Object> row) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("mappingId", row.get("mappingId"));
        item.put("diseaseId", row.get("diseaseId"));
        item.put("symptomId", row.get("symptomId"));
        item.put("weight", row.get("weight"));
        item.put("isPrimary", toBoolean(row.get("isPrimary")));
        item.put("notes", row.get("notes"));
        return item;
    }

    private Map<String, Object> toRoadmapExerciseItem(Map<String, Object> row) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("roadmapExerciseId", row.get("roadmapExerciseId"));
        item.put("roadmapId", row.get("roadmapId"));
        item.put("exerciseId", row.get("exerciseId"));
        item.put("exerciseOrder", row.get("exerciseOrder"));
        item.put("isMandatory", toBoolean(row.get("isMandatory")));
        return item;
    }

    private Map<String, Object> toDogAssignmentItem(Map<String, Object> row) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("assignmentId", row.get("assignmentId"));
        item.put("trainerId", row.get("trainerId"));
        item.put("dogId", row.get("dogId"));
        item.put("assignmentType", toText(row.get("assignmentType")));
        item.put("startDate", row.get("startDate"));
        item.put("endDate", row.get("endDate"));
        item.put("isActive", toBoolean(row.get("isActive")));
        item.put("notes", row.get("notes"));
        item.put("trainerName", row.get("trainerName"));
        item.put("dogName", row.get("dogName"));
        item.put("dogCode", row.get("dogCode"));
        return item;
    }

    private Map<String, Object> toContentItem(Map<String, Object> row) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("contentId", row.get("contentId"));
        item.put("title", row.get("title"));
        item.put("contentType", row.get("contentType"));
        item.put("summary", row.get("summary"));
        item.put("publishedAt", toLocalDateTime(row.get("publishedAt")));
        return item;
    }

    private LocalDateTime toLocalDateTime(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof LocalDateTime localDateTime) {
            return localDateTime;
        }
        if (value instanceof Timestamp timestamp) {
            return timestamp.toLocalDateTime();
        }
        if (value instanceof java.util.Date date) {
            return new Timestamp(date.getTime()).toLocalDateTime();
        }
        return LocalDateTime.parse(String.valueOf(value));
    }

    private boolean toBoolean(Object value) {
        if (value == null) {
            return false;
        }
        if (value instanceof Boolean bool) {
            return bool;
        }
        if (value instanceof Number number) {
            return number.intValue() != 0;
        }
        return Boolean.parseBoolean(String.valueOf(value));
    }

    private String toText(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private record SyncWindow(LocalDateTime lastSyncAt, LocalDateTime syncTimestamp) {
    }
}
