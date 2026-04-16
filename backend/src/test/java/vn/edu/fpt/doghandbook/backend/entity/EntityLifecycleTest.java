package vn.edu.fpt.doghandbook.backend.entity;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import vn.edu.fpt.doghandbook.backend.entity.enums.ApprovalDecision;
import vn.edu.fpt.doghandbook.backend.entity.enums.AssignmentScope;
import vn.edu.fpt.doghandbook.backend.entity.enums.AssignmentType;
import vn.edu.fpt.doghandbook.backend.entity.enums.ConflictStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.DogStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.EnrollmentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.ExerciseProgressStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.FecesStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.FollowUpStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.HealthCondition;
import vn.edu.fpt.doghandbook.backend.entity.enums.NotificationType;
import vn.edu.fpt.doghandbook.backend.entity.enums.SessionSeverity;
import vn.edu.fpt.doghandbook.backend.entity.enums.SessionStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.SuggestionStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.SyncStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class EntityLifecycleTest {

    @Test
    void baseEntity_onCreate_setsAuditFieldsAndDeletionDefault() {
        BaseEntity entity = new BaseEntity() {
        };
        ReflectionTestUtils.setField(entity, "isDeleted", null);

        invokeCreate(entity);

        assertThat(readField(entity, "createdAt", LocalDateTime.class)).isNotNull();
        assertThat(readField(entity, "updatedAt", LocalDateTime.class)).isNotNull();
        assertThat(readField(entity, "isDeleted", Boolean.class)).isFalse();
    }

    @Test
    void baseEntity_onCreate_preservesExplicitDeletionFlag() {
        BaseEntity entity = new BaseEntity() {
        };
        ReflectionTestUtils.setField(entity, "isDeleted", true);

        invokeCreate(entity);

        assertThat(readField(entity, "isDeleted", Boolean.class)).isTrue();
    }

    @Test
    void contentStyleEntities_onCreate_applyDefaultsWhenValuesMissing() {
        Content content = new Content();
        content.setStatus(null);
        content.setVersion(0);
        content.setIsDeleted(null);
        invokeCreate(content);
        assertThat(readField(content, "status", ContentStatus.class)).isEqualTo(ContentStatus.DRAFT);
        assertThat(content.getVersion()).isEqualTo(1);
        assertThat(readField(content, "isDeleted", Boolean.class)).isFalse();

        DevelopmentStage developmentStage = new DevelopmentStage();
        developmentStage.setStatus(null);
        developmentStage.setIsDeleted(null);
        invokeCreate(developmentStage);
        assertThat(readField(developmentStage, "status", ContentStatus.class)).isEqualTo(ContentStatus.DRAFT);
        assertThat(readField(developmentStage, "isDeleted", Boolean.class)).isFalse();

        Disease disease = new Disease();
        disease.setIsContagious(null);
        disease.setStatus(null);
        disease.setIsDeleted(null);
        invokeCreate(disease);
        assertThat(readField(disease, "isContagious", Boolean.class)).isFalse();
        assertThat(readField(disease, "status", ContentStatus.class)).isEqualTo(ContentStatus.DRAFT);
        assertThat(readField(disease, "isDeleted", Boolean.class)).isFalse();

        FirstAidGuide firstAidGuide = new FirstAidGuide();
        firstAidGuide.setStatus(null);
        firstAidGuide.setIsDeleted(null);
        invokeCreate(firstAidGuide);
        assertThat(readField(firstAidGuide, "status", ContentStatus.class)).isEqualTo(ContentStatus.DRAFT);
        assertThat(readField(firstAidGuide, "isDeleted", Boolean.class)).isFalse();

        Medication medication = new Medication();
        medication.setStatus(null);
        medication.setIsDeleted(null);
        invokeCreate(medication);
        assertThat(readField(medication, "status", ContentStatus.class)).isEqualTo(ContentStatus.DRAFT);
        assertThat(readField(medication, "isDeleted", Boolean.class)).isFalse();

        TrainingExercise trainingExercise = new TrainingExercise();
        trainingExercise.setStatus(null);
        trainingExercise.setIsDeleted(null);
        invokeCreate(trainingExercise);
        assertThat(readField(trainingExercise, "status", ContentStatus.class)).isEqualTo(ContentStatus.DRAFT);
        assertThat(readField(trainingExercise, "isDeleted", Boolean.class)).isFalse();

        TrainingMethod trainingMethod = new TrainingMethod();
        trainingMethod.setStatus(null);
        trainingMethod.setIsDeleted(null);
        invokeCreate(trainingMethod);
        assertThat(readField(trainingMethod, "status", ContentStatus.class)).isEqualTo(ContentStatus.DRAFT);
        assertThat(readField(trainingMethod, "isDeleted", Boolean.class)).isFalse();

        TrainingPhase trainingPhase = new TrainingPhase();
        trainingPhase.setStatus(null);
        trainingPhase.setIsDeleted(null);
        invokeCreate(trainingPhase);
        assertThat(readField(trainingPhase, "status", ContentStatus.class)).isEqualTo(ContentStatus.DRAFT);
        assertThat(readField(trainingPhase, "isDeleted", Boolean.class)).isFalse();

        TrainingRoadmap trainingRoadmap = new TrainingRoadmap();
        trainingRoadmap.setStatus(null);
        trainingRoadmap.setRoadmapOrder(0);
        trainingRoadmap.setIsDeleted(null);
        invokeCreate(trainingRoadmap);
        assertThat(readField(trainingRoadmap, "status", ContentStatus.class)).isEqualTo(ContentStatus.DRAFT);
        assertThat(trainingRoadmap.getRoadmapOrder()).isEqualTo(1);
        assertThat(readField(trainingRoadmap, "isDeleted", Boolean.class)).isFalse();

        DogBreed dogBreed = new DogBreed();
        dogBreed.setStatus(null);
        dogBreed.setIsDeleted(null);
        invokeCreate(dogBreed);
        assertThat(readField(dogBreed, "status", ContentStatus.class)).isEqualTo(ContentStatus.DRAFT);
        assertThat(readField(dogBreed, "isDeleted", Boolean.class)).isFalse();
    }

    @Test
    void contentStyleEntities_onCreate_preserveExplicitValuesWhenPresent() {
        Content content = new Content();
        content.setStatus(ContentStatus.PUBLISHED);
        content.setVersion(3);
        content.setIsDeleted(true);
        invokeCreate(content);
        assertThat(readField(content, "status", ContentStatus.class)).isEqualTo(ContentStatus.PUBLISHED);
        assertThat(content.getVersion()).isEqualTo(3);
        assertThat(readField(content, "isDeleted", Boolean.class)).isTrue();

        DevelopmentStage developmentStage = new DevelopmentStage();
        developmentStage.setStatus(ContentStatus.APPROVED);
        developmentStage.setIsDeleted(true);
        invokeCreate(developmentStage);
        assertThat(readField(developmentStage, "status", ContentStatus.class)).isEqualTo(ContentStatus.APPROVED);
        assertThat(readField(developmentStage, "isDeleted", Boolean.class)).isTrue();

        Disease disease = new Disease();
        disease.setIsContagious(true);
        disease.setStatus(ContentStatus.REJECTED);
        disease.setIsDeleted(true);
        invokeCreate(disease);
        assertThat(readField(disease, "isContagious", Boolean.class)).isTrue();
        assertThat(readField(disease, "status", ContentStatus.class)).isEqualTo(ContentStatus.REJECTED);
        assertThat(readField(disease, "isDeleted", Boolean.class)).isTrue();

        TrainingRoadmap trainingRoadmap = new TrainingRoadmap();
        trainingRoadmap.setStatus(ContentStatus.PUBLISHED);
        trainingRoadmap.setRoadmapOrder(4);
        trainingRoadmap.setIsDeleted(true);
        invokeCreate(trainingRoadmap);
        assertThat(readField(trainingRoadmap, "status", ContentStatus.class)).isEqualTo(ContentStatus.PUBLISHED);
        assertThat(trainingRoadmap.getRoadmapOrder()).isEqualTo(4);
        assertThat(readField(trainingRoadmap, "isDeleted", Boolean.class)).isTrue();
    }

    @Test
    void dogAndTrainingEntities_onCreate_applyDefaultsWhenValuesMissing() {
        DogAssignment dogAssignment = new DogAssignment();
        dogAssignment.setAssignmentType(null);
        dogAssignment.setAssignmentScope(null);
        dogAssignment.setIsActive(null);
        invokeCreate(dogAssignment);
        assertThat(readField(dogAssignment, "assignmentType", AssignmentType.class)).isEqualTo(AssignmentType.PRIMARY);
        assertThat(readField(dogAssignment, "assignmentScope", AssignmentScope.class)).isEqualTo(AssignmentScope.FULL_TRAINING);
        assertThat(readField(dogAssignment, "isActive", Boolean.class)).isTrue();

        DogProfile dogProfile = new DogProfile();
        dogProfile.setStatus(null);
        dogProfile.setIsSterilized(null);
        dogProfile.setIsDeleted(null);
        invokeCreate(dogProfile);
        assertThat(readField(dogProfile, "status", DogStatus.class)).isEqualTo(DogStatus.ACTIVE);
        assertThat(readField(dogProfile, "isSterilized", Boolean.class)).isFalse();
        assertThat(readField(dogProfile, "isDeleted", Boolean.class)).isFalse();

        DogExerciseProgress exerciseProgress = new DogExerciseProgress();
        exerciseProgress.setRoadmapOrder(0);
        exerciseProgress.setPhaseOrder(-1);
        exerciseProgress.setExerciseOrder(0);
        exerciseProgress.setStatus(null);
        invokeCreate(exerciseProgress);
        assertThat(exerciseProgress.getRoadmapOrder()).isEqualTo(1);
        assertThat(exerciseProgress.getPhaseOrder()).isEqualTo(1);
        assertThat(exerciseProgress.getExerciseOrder()).isEqualTo(1);
        assertThat(readField(exerciseProgress, "status", ExerciseProgressStatus.class))
                .isEqualTo(ExerciseProgressStatus.NOT_STARTED);

        DogSpecialtyEnrollment enrollment = new DogSpecialtyEnrollment();
        enrollment.setProgressPercent(null);
        enrollment.setTemplateVersion(0);
        enrollment.setStatus(null);
        enrollment.setIsDeleted(null);
        invokeCreate(enrollment);
        assertThat(enrollment.getProgressPercent()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(enrollment.getTemplateVersion()).isEqualTo(1);
        assertThat(readField(enrollment, "status", EnrollmentStatus.class)).isEqualTo(EnrollmentStatus.ENROLLED);
        assertThat(readField(enrollment, "isDeleted", Boolean.class)).isFalse();

        TrainingSpecialty trainingSpecialty = new TrainingSpecialty();
        trainingSpecialty.setVersion(0);
        trainingSpecialty.setIsActive(null);
        trainingSpecialty.setIsDeleted(null);
        invokeCreate(trainingSpecialty);
        assertThat(trainingSpecialty.getVersion()).isEqualTo(1);
        assertThat(readField(trainingSpecialty, "isActive", Boolean.class)).isTrue();
        assertThat(readField(trainingSpecialty, "isDeleted", Boolean.class)).isFalse();

        FieldNote fieldNote = new FieldNote();
        fieldNote.setRecordingDate(null);
        fieldNote.setIsDeleted(null);
        invokeCreate(fieldNote);
        assertThat(fieldNote.getRecordingDate()).isNotNull();
        assertThat(readField(fieldNote, "isDeleted", Boolean.class)).isFalse();

        Media media = new Media();
        media.setCreatedAt(null);
        media.setDisplayOrder(0);
        media.setIsDeleted(null);
        invokeCreate(media);
        assertThat(media.getCreatedAt()).isNotNull();
        assertThat(media.getDisplayOrder()).isEqualTo(1);
        assertThat(readField(media, "isDeleted", Boolean.class)).isFalse();
    }

    @Test
    void dogAndTrainingEntities_onCreate_preserveExplicitValuesWhenPresent() {
        DogAssignment dogAssignment = new DogAssignment();
        dogAssignment.setAssignmentType(AssignmentType.SECONDARY);
        dogAssignment.setAssignmentScope(AssignmentScope.CARE_ONLY);
        dogAssignment.setIsActive(false);
        invokeCreate(dogAssignment);
        assertThat(readField(dogAssignment, "assignmentType", AssignmentType.class)).isEqualTo(AssignmentType.SECONDARY);
        assertThat(readField(dogAssignment, "assignmentScope", AssignmentScope.class)).isEqualTo(AssignmentScope.CARE_ONLY);
        assertThat(readField(dogAssignment, "isActive", Boolean.class)).isFalse();

        DogProfile dogProfile = new DogProfile();
        dogProfile.setStatus(DogStatus.RETIRED);
        dogProfile.setIsSterilized(true);
        dogProfile.setIsDeleted(true);
        invokeCreate(dogProfile);
        assertThat(readField(dogProfile, "status", DogStatus.class)).isEqualTo(DogStatus.RETIRED);
        assertThat(readField(dogProfile, "isSterilized", Boolean.class)).isTrue();
        assertThat(readField(dogProfile, "isDeleted", Boolean.class)).isTrue();

        DogExerciseProgress exerciseProgress = new DogExerciseProgress();
        exerciseProgress.setRoadmapOrder(2);
        exerciseProgress.setPhaseOrder(3);
        exerciseProgress.setExerciseOrder(4);
        exerciseProgress.setStatus(ExerciseProgressStatus.IN_PROGRESS);
        invokeCreate(exerciseProgress);
        assertThat(exerciseProgress.getRoadmapOrder()).isEqualTo(2);
        assertThat(exerciseProgress.getPhaseOrder()).isEqualTo(3);
        assertThat(exerciseProgress.getExerciseOrder()).isEqualTo(4);
        assertThat(readField(exerciseProgress, "status", ExerciseProgressStatus.class))
                .isEqualTo(ExerciseProgressStatus.IN_PROGRESS);

        DogSpecialtyEnrollment enrollment = new DogSpecialtyEnrollment();
        LocalDateTime enrolledAt = LocalDateTime.now().minusDays(2);
        enrollment.setEnrolledAt(enrolledAt);
        enrollment.setProgressPercent(new BigDecimal("42.5"));
        enrollment.setTemplateVersion(3);
        enrollment.setStatus(EnrollmentStatus.IN_PROGRESS);
        enrollment.setIsDeleted(true);
        invokeCreate(enrollment);
        assertThat(enrollment.getEnrolledAt()).isEqualTo(enrolledAt);
        assertThat(enrollment.getProgressPercent()).isEqualByComparingTo("42.5");
        assertThat(enrollment.getTemplateVersion()).isEqualTo(3);
        assertThat(readField(enrollment, "status", EnrollmentStatus.class)).isEqualTo(EnrollmentStatus.IN_PROGRESS);
        assertThat(readField(enrollment, "isDeleted", Boolean.class)).isTrue();

        Media media = new Media();
        LocalDateTime createdAt = LocalDateTime.now().minusDays(1);
        media.setCreatedAt(createdAt);
        media.setDisplayOrder(7);
        media.setIsDeleted(true);
        invokeCreate(media);
        assertThat(media.getCreatedAt()).isEqualTo(createdAt);
        assertThat(media.getDisplayOrder()).isEqualTo(7);
        assertThat(readField(media, "isDeleted", Boolean.class)).isTrue();
    }

    @Test
    void healthAndSyncEntities_onCreate_applyDefaultsWhenValuesMissing() {
        HealthRecord healthRecord = new HealthRecord();
        healthRecord.setFecesStatus(null);
        healthRecord.setIsDeleted(null);
        invokeCreate(healthRecord);
        assertThat(readField(healthRecord, "fecesStatus", FecesStatus.class)).isEqualTo(FecesStatus.NOT_CHECKED);
        assertThat(readField(healthRecord, "isDeleted", Boolean.class)).isFalse();

        HealthSession healthSession = new HealthSession();
        healthSession.setStartedAt(null);
        healthSession.setLastUpdateAt(null);
        healthSession.setStatus(null);
        healthSession.setSeverity(null);
        healthSession.setIsDeleted(null);
        invokeCreate(healthSession);
        assertThat(healthSession.getStartedAt()).isNotNull();
        assertThat(healthSession.getLastUpdateAt()).isNotNull();
        assertThat(readField(healthSession, "status", SessionStatus.class)).isEqualTo(SessionStatus.ACTIVE);
        assertThat(readField(healthSession, "severity", SessionSeverity.class)).isEqualTo(SessionSeverity.MEDIUM);
        assertThat(readField(healthSession, "isDeleted", Boolean.class)).isFalse();
        assertThat(healthSession.getUpdatedAt()).isNotNull();

        DiagnosisRecord diagnosisRecord = new DiagnosisRecord();
        diagnosisRecord.setDiagnosedAt(null);
        diagnosisRecord.setIsDeleted(null);
        invokeCreate(diagnosisRecord);
        assertThat(diagnosisRecord.getDiagnosedAt()).isNotNull();
        assertThat(readField(diagnosisRecord, "isDeleted", Boolean.class)).isFalse();

        WeightAssessment weightAssessment = new WeightAssessment();
        weightAssessment.setAssessedAt(null);
        weightAssessment.setIsDeleted(null);
        invokeCreate(weightAssessment);
        assertThat(weightAssessment.getAssessedAt()).isNotNull();
        assertThat(readField(weightAssessment, "isDeleted", Boolean.class)).isFalse();

        ContentSuggestion contentSuggestion = new ContentSuggestion();
        contentSuggestion.setStatus(null);
        contentSuggestion.setSubmittedAt(null);
        contentSuggestion.setIsDeleted(null);
        invokeCreate(contentSuggestion);
        assertThat(readField(contentSuggestion, "status", SuggestionStatus.class)).isEqualTo(SuggestionStatus.SUBMITTED);
        assertThat(contentSuggestion.getSubmittedAt()).isNotNull();
        assertThat(readField(contentSuggestion, "isDeleted", Boolean.class)).isFalse();

        SessionFollowUp sessionFollowUp = new SessionFollowUp();
        sessionFollowUp.setFollowupDate(null);
        sessionFollowUp.setIsDeleted(null);
        invokeCreate(sessionFollowUp);
        assertThat(sessionFollowUp.getFollowupDate()).isNotNull();
        assertThat(readField(sessionFollowUp, "isDeleted", Boolean.class)).isFalse();

        SyncConflictLog syncConflictLog = new SyncConflictLog();
        syncConflictLog.setConflictDetectedAt(null);
        syncConflictLog.setStatus(null);
        invokeCreate(syncConflictLog);
        assertThat(syncConflictLog.getConflictDetectedAt()).isNotNull();
        assertThat(readField(syncConflictLog, "status", ConflictStatus.class)).isEqualTo(ConflictStatus.PENDING);

        SyncQueue syncQueue = new SyncQueue();
        syncQueue.setSyncStatus(null);
        syncQueue.setRetryCount(-1);
        syncQueue.setQueuedAt(null);
        invokeCreate(syncQueue);
        assertThat(readField(syncQueue, "syncStatus", SyncStatus.class)).isEqualTo(SyncStatus.PENDING);
        assertThat(syncQueue.getRetryCount()).isZero();
        assertThat(syncQueue.getQueuedAt()).isNotNull();

        SearchHistory searchHistory = new SearchHistory();
        searchHistory.setSearchedAt(null);
        invokeCreate(searchHistory);
        assertThat(searchHistory.getSearchedAt()).isNotNull();

        Notification notification = new Notification();
        notification.setIsRead(null);
        invokeCreate(notification);
        assertThat(readField(notification, "isRead", Boolean.class)).isFalse();
        assertThat(notification.getCreatedAt()).isNotNull();

        ApprovalRecord approvalRecord = new ApprovalRecord();
        approvalRecord.setReviewedAt(null);
        invokeCreate(approvalRecord);
        assertThat(approvalRecord.getReviewedAt()).isNotNull();

        AuditLog auditLog = new AuditLog();
        auditLog.setActionTimestamp(null);
        invokeCreate(auditLog);
        assertThat(auditLog.getActionTimestamp()).isNotNull();
    }

    @Test
    void healthAndSyncEntities_onCreate_preserveExplicitValuesWhenPresent() {
        HealthRecord healthRecord = new HealthRecord();
        healthRecord.setFecesStatus(FecesStatus.NORMAL);
        healthRecord.setIsDeleted(true);
        invokeCreate(healthRecord);
        assertThat(readField(healthRecord, "fecesStatus", FecesStatus.class)).isEqualTo(FecesStatus.NORMAL);
        assertThat(readField(healthRecord, "isDeleted", Boolean.class)).isTrue();

        HealthSession healthSession = new HealthSession();
        LocalDateTime startedAt = LocalDateTime.now().minusDays(4);
        LocalDateTime lastUpdateAt = LocalDateTime.now().minusDays(2);
        healthSession.setStartedAt(startedAt);
        healthSession.setLastUpdateAt(lastUpdateAt);
        healthSession.setStatus(SessionStatus.RESOLVED);
        healthSession.setSeverity(SessionSeverity.HIGH);
        healthSession.setIsDeleted(true);
        invokeCreate(healthSession);
        assertThat(healthSession.getStartedAt()).isEqualTo(startedAt);
        assertThat(healthSession.getLastUpdateAt()).isEqualTo(lastUpdateAt);
        assertThat(readField(healthSession, "status", SessionStatus.class)).isEqualTo(SessionStatus.RESOLVED);
        assertThat(readField(healthSession, "severity", SessionSeverity.class)).isEqualTo(SessionSeverity.HIGH);
        assertThat(readField(healthSession, "isDeleted", Boolean.class)).isTrue();

        DiagnosisRecord diagnosisRecord = new DiagnosisRecord();
        LocalDateTime diagnosedAt = LocalDateTime.now().minusHours(6);
        diagnosisRecord.setDiagnosedAt(diagnosedAt);
        diagnosisRecord.setIsDeleted(true);
        invokeCreate(diagnosisRecord);
        assertThat(diagnosisRecord.getDiagnosedAt()).isEqualTo(diagnosedAt);
        assertThat(readField(diagnosisRecord, "isDeleted", Boolean.class)).isTrue();

        WeightAssessment weightAssessment = new WeightAssessment();
        LocalDateTime assessedAt = LocalDateTime.now().minusHours(8);
        weightAssessment.setAssessedAt(assessedAt);
        weightAssessment.setIsDeleted(true);
        invokeCreate(weightAssessment);
        assertThat(weightAssessment.getAssessedAt()).isEqualTo(assessedAt);
        assertThat(readField(weightAssessment, "isDeleted", Boolean.class)).isTrue();

        ContentSuggestion contentSuggestion = new ContentSuggestion();
        LocalDateTime submittedAt = LocalDateTime.now().minusHours(7);
        contentSuggestion.setStatus(SuggestionStatus.ACCEPTED);
        contentSuggestion.setSubmittedAt(submittedAt);
        contentSuggestion.setIsDeleted(true);
        invokeCreate(contentSuggestion);
        assertThat(readField(contentSuggestion, "status", SuggestionStatus.class)).isEqualTo(SuggestionStatus.ACCEPTED);
        assertThat(contentSuggestion.getSubmittedAt()).isEqualTo(submittedAt);
        assertThat(readField(contentSuggestion, "isDeleted", Boolean.class)).isTrue();

        SessionFollowUp sessionFollowUp = new SessionFollowUp();
        LocalDateTime followUpDate = LocalDateTime.now().minusHours(3);
        sessionFollowUp.setFollowupDate(followUpDate);
        sessionFollowUp.setStatusUpdate(FollowUpStatus.IMPROVED);
        sessionFollowUp.setIsDeleted(true);
        invokeCreate(sessionFollowUp);
        assertThat(sessionFollowUp.getFollowupDate()).isEqualTo(followUpDate);
        assertThat(readField(sessionFollowUp, "isDeleted", Boolean.class)).isTrue();

        SyncConflictLog syncConflictLog = new SyncConflictLog();
        LocalDateTime detectedAt = LocalDateTime.now().minusMinutes(30);
        syncConflictLog.setConflictDetectedAt(detectedAt);
        syncConflictLog.setStatus(ConflictStatus.RESOLVED);
        invokeCreate(syncConflictLog);
        assertThat(syncConflictLog.getConflictDetectedAt()).isEqualTo(detectedAt);
        assertThat(readField(syncConflictLog, "status", ConflictStatus.class)).isEqualTo(ConflictStatus.RESOLVED);

        SyncQueue syncQueue = new SyncQueue();
        LocalDateTime queuedAt = LocalDateTime.now().minusMinutes(15);
        syncQueue.setSyncStatus(SyncStatus.FAILED);
        syncQueue.setRetryCount(4);
        syncQueue.setQueuedAt(queuedAt);
        invokeCreate(syncQueue);
        assertThat(readField(syncQueue, "syncStatus", SyncStatus.class)).isEqualTo(SyncStatus.FAILED);
        assertThat(syncQueue.getRetryCount()).isEqualTo(4);
        assertThat(syncQueue.getQueuedAt()).isEqualTo(queuedAt);

        SearchHistory searchHistory = new SearchHistory();
        LocalDateTime searchedAt = LocalDateTime.now().minusMinutes(20);
        searchHistory.setSearchedAt(searchedAt);
        invokeCreate(searchHistory);
        assertThat(searchHistory.getSearchedAt()).isEqualTo(searchedAt);

        Notification notification = new Notification();
        notification.setType(NotificationType.SYNC_CONFLICT);
        notification.setIsRead(true);
        invokeCreate(notification);
        assertThat(readField(notification, "isRead", Boolean.class)).isTrue();

        ApprovalRecord approvalRecord = new ApprovalRecord();
        LocalDateTime reviewedAt = LocalDateTime.now().minusDays(1);
        approvalRecord.setDecision(ApprovalDecision.APPROVED);
        approvalRecord.setReviewedAt(reviewedAt);
        invokeCreate(approvalRecord);
        assertThat(approvalRecord.getReviewedAt()).isEqualTo(reviewedAt);

        AuditLog auditLog = new AuditLog();
        LocalDateTime actionTimestamp = LocalDateTime.now().minusDays(1);
        auditLog.setActionTimestamp(actionTimestamp);
        invokeCreate(auditLog);
        assertThat(auditLog.getActionTimestamp()).isEqualTo(actionTimestamp);
    }

    @Test
    void lightweightEntities_onCreate_initializeTimestamps() {
        DiseaseFirstAidMapping diseaseFirstAidMapping = new DiseaseFirstAidMapping();
        invokeCreate(diseaseFirstAidMapping);
        assertThat(diseaseFirstAidMapping.getUpdatedAt()).isNotNull();

        DiseaseMedicationMapping diseaseMedicationMapping = new DiseaseMedicationMapping();
        invokeCreate(diseaseMedicationMapping);
        assertThat(diseaseMedicationMapping.getUpdatedAt()).isNotNull();

        DiseaseSymptomMapping diseaseSymptomMapping = new DiseaseSymptomMapping();
        invokeCreate(diseaseSymptomMapping);
        assertThat(diseaseSymptomMapping.getUpdatedAt()).isNotNull();

        RoadmapExercise roadmapExercise = new RoadmapExercise();
        invokeCreate(roadmapExercise);
        assertThat(roadmapExercise.getUpdatedAt()).isNotNull();

        SystemSetting systemSetting = new SystemSetting();
        invokeCreate(systemSetting);
        assertThat(systemSetting.getCreatedAt()).isNotNull();
        assertThat(systemSetting.getUpdatedAt()).isNotNull();

        OperationReport operationReport = new OperationReport();
        operationReport.setIsDeleted(null);
        invokeCreate(operationReport);
        assertThat(operationReport.getCreatedAt()).isNotNull();
        assertThat(operationReport.getUpdatedAt()).isNotNull();
        assertThat(readField(operationReport, "isDeleted", Boolean.class)).isFalse();
    }

    @Test
    void updateLifecycle_refreshesUpdatedTimestamps() {
        assertUpdatedAtRefreshes(new Content(), Content::setUpdatedAt, Content::getUpdatedAt);
        assertUpdatedAtRefreshes(new DogBreed(), DogBreed::setUpdatedAt, DogBreed::getUpdatedAt);
        assertUpdatedAtRefreshes(new DogProfile(), DogProfile::setUpdatedAt, DogProfile::getUpdatedAt);
        assertUpdatedAtRefreshes(new DogAssignment(), DogAssignment::setUpdatedAt, DogAssignment::getUpdatedAt);
        assertUpdatedAtRefreshes(new DogExerciseProgress(), DogExerciseProgress::setUpdatedAt, DogExerciseProgress::getUpdatedAt);
        assertUpdatedAtRefreshes(new DogSpecialtyEnrollment(), DogSpecialtyEnrollment::setUpdatedAt, DogSpecialtyEnrollment::getUpdatedAt);
        assertUpdatedAtRefreshes(new TrainingSpecialty(), TrainingSpecialty::setUpdatedAt, TrainingSpecialty::getUpdatedAt);
        assertUpdatedAtRefreshes(new TrainingRoadmap(), TrainingRoadmap::setUpdatedAt, TrainingRoadmap::getUpdatedAt);
        assertUpdatedAtRefreshes(new TrainingExercise(), TrainingExercise::setUpdatedAt, TrainingExercise::getUpdatedAt);
        assertUpdatedAtRefreshes(new TrainingMethod(), TrainingMethod::setUpdatedAt, TrainingMethod::getUpdatedAt);
        assertUpdatedAtRefreshes(new TrainingPhase(), TrainingPhase::setUpdatedAt, TrainingPhase::getUpdatedAt);
        assertUpdatedAtRefreshes(new DevelopmentStage(), DevelopmentStage::setUpdatedAt, DevelopmentStage::getUpdatedAt);
        assertUpdatedAtRefreshes(new Disease(), Disease::setUpdatedAt, Disease::getUpdatedAt);
        assertUpdatedAtRefreshes(new FirstAidGuide(), FirstAidGuide::setUpdatedAt, FirstAidGuide::getUpdatedAt);
        assertUpdatedAtRefreshes(new Medication(), Medication::setUpdatedAt, Medication::getUpdatedAt);
        assertUpdatedAtRefreshes(new HealthRecord(), HealthRecord::setUpdatedAt, HealthRecord::getUpdatedAt);
        assertUpdatedAtRefreshes(new DiagnosisRecord(), DiagnosisRecord::setUpdatedAt, DiagnosisRecord::getUpdatedAt);
        assertUpdatedAtRefreshes(new WeightAssessment(), WeightAssessment::setUpdatedAt, WeightAssessment::getUpdatedAt);
        assertUpdatedAtRefreshes(new ContentSuggestion(), ContentSuggestion::setUpdatedAt, ContentSuggestion::getUpdatedAt);
        assertUpdatedAtRefreshes(new SessionFollowUp(), SessionFollowUp::setUpdatedAt, SessionFollowUp::getUpdatedAt);
        assertUpdatedAtRefreshes(new SyncConflictLog(), SyncConflictLog::setUpdatedAt, SyncConflictLog::getUpdatedAt);
        assertUpdatedAtRefreshes(new SyncQueue(), SyncQueue::setUpdatedAt, SyncQueue::getUpdatedAt);
        assertUpdatedAtRefreshes(new SearchHistory(), SearchHistory::setUpdatedAt, SearchHistory::getUpdatedAt);
        assertUpdatedAtRefreshes(new ApprovalRecord(), ApprovalRecord::setUpdatedAt, ApprovalRecord::getUpdatedAt);
        assertUpdatedAtRefreshes(new AuditLog(), AuditLog::setUpdatedAt, AuditLog::getUpdatedAt);
        assertUpdatedAtRefreshes(new Media(), Media::setUpdatedAt, Media::getUpdatedAt);
        assertUpdatedAtRefreshes(new FieldNote(), FieldNote::setUpdatedAt, FieldNote::getUpdatedAt);
        assertUpdatedAtRefreshes(new DiseaseFirstAidMapping(), DiseaseFirstAidMapping::setUpdatedAt, DiseaseFirstAidMapping::getUpdatedAt);
        assertUpdatedAtRefreshes(new DiseaseMedicationMapping(), DiseaseMedicationMapping::setUpdatedAt, DiseaseMedicationMapping::getUpdatedAt);
        assertUpdatedAtRefreshes(new DiseaseSymptomMapping(), DiseaseSymptomMapping::setUpdatedAt, DiseaseSymptomMapping::getUpdatedAt);
        assertUpdatedAtRefreshes(new OperationReport(), OperationReport::setUpdatedAt, OperationReport::getUpdatedAt);
        assertUpdatedAtRefreshes(new RoadmapExercise(), RoadmapExercise::setUpdatedAt, RoadmapExercise::getUpdatedAt);
        assertUpdatedAtRefreshes(new SystemSetting(), SystemSetting::setUpdatedAt, SystemSetting::getUpdatedAt);

        HealthSession healthSession = new HealthSession();
        LocalDateTime old = LocalDateTime.now().minusDays(1);
        healthSession.setLastUpdateAt(old);
        healthSession.setUpdatedAt(old);
        invokeUpdate(healthSession);
        assertThat(healthSession.getLastUpdateAt()).isAfter(old);
        assertThat(healthSession.getUpdatedAt()).isAfter(old);
    }

    @Test
    void nutritionStandard_onCreate_applyDefaultsAndAccessorsConvertValues() {
        NutritionStandard nutritionStandard = new NutritionStandard();
        nutritionStandard.setStatusEnum(null);
        nutritionStandard.setHealthConditionEnum(null);
        nutritionStandard.setIsDeleted(null);
        nutritionStandard.setId(12L);
        nutritionStandard.setActivityLevel("  high  ");
        nutritionStandard.setHealthCondition("normal");
        nutritionStandard.setStatus("published");

        invokeCreate(nutritionStandard);

        assertThat(nutritionStandard.getId()).isEqualTo(12L);
        assertThat(nutritionStandard.getActivityLevel()).isEqualTo("HIGH");
        assertThat(nutritionStandard.getHealthCondition()).isEqualTo("NORMAL");
        assertThat(nutritionStandard.getStatus()).isEqualTo("PUBLISHED");
        assertThat(nutritionStandard.getActivityLevelEnum().name()).isEqualTo("HIGH");
        assertThat(nutritionStandard.getHealthConditionEnum()).isEqualTo(HealthCondition.NORMAL);
        assertThat(nutritionStandard.getStatusEnum()).isEqualTo(ContentStatus.PUBLISHED);

        nutritionStandard.setActivityLevel(" ");
        nutritionStandard.setHealthCondition(null);
        nutritionStandard.setStatus(" ");
        assertThat(nutritionStandard.getActivityLevelEnum()).isNull();
        assertThat(nutritionStandard.getHealthConditionEnum()).isNull();
        assertThat(nutritionStandard.getStatusEnum()).isNull();

        nutritionStandard.setStatusEnum(null);
        nutritionStandard.setHealthConditionEnum(null);
        nutritionStandard.setIsDeleted(null);
        invokeCreate(nutritionStandard);
        assertThat(nutritionStandard.getStatusEnum()).isEqualTo(ContentStatus.DRAFT);
        assertThat(nutritionStandard.getHealthConditionEnum()).isEqualTo(HealthCondition.NORMAL);
        assertThat(readField(nutritionStandard, "isDeleted", Boolean.class)).isFalse();
    }

    @Test
    void nutritionStandard_onCreate_preservesExplicitValues() {
        NutritionStandard nutritionStandard = new NutritionStandard();
        nutritionStandard.setStatusEnum(ContentStatus.APPROVED);
        nutritionStandard.setHealthConditionEnum(HealthCondition.NORMAL);
        nutritionStandard.setIsDeleted(true);

        invokeCreate(nutritionStandard);

        assertThat(nutritionStandard.getStatusEnum()).isEqualTo(ContentStatus.APPROVED);
        assertThat(nutritionStandard.getHealthConditionEnum()).isEqualTo(HealthCondition.NORMAL);
        assertThat(readField(nutritionStandard, "isDeleted", Boolean.class)).isTrue();
        assertThat(readField(nutritionStandard, "createdAt", LocalDateTime.class)).isNotNull();
    }

    @Test
    void dogBreed_idAccessors_convertBetweenIntegerAndLong() {
        DogBreed dogBreed = new DogBreed();

        assertThat(dogBreed.getId()).isNull();

        dogBreed.setId(25L);
        assertThat(dogBreed.getBreedId()).isEqualTo(25);
        assertThat(dogBreed.getId()).isEqualTo(25L);

        dogBreed.setId(null);
        assertThat(dogBreed.getBreedId()).isNull();
        assertThat(dogBreed.getId()).isNull();
    }

    private static void invokeCreate(Object target) {
        ReflectionTestUtils.invokeMethod(target, "onCreate");
    }

    private static void invokeUpdate(Object target) {
        ReflectionTestUtils.invokeMethod(target, "onUpdate");
    }

    private static <T> T readField(Object target, String name, Class<T> type) {
        return type.cast(ReflectionTestUtils.getField(target, name));
    }

    private static <T> void assertUpdatedAtRefreshes(
            T target,
            java.util.function.BiConsumer<T, LocalDateTime> setter,
            java.util.function.Function<T, LocalDateTime> getter
    ) {
        LocalDateTime old = LocalDateTime.now().minusDays(1);
        setter.accept(target, old);
        invokeUpdate(target);
        assertThat(getter.apply(target)).isAfter(old);
    }
}
