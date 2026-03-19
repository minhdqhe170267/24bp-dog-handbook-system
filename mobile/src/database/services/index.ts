// ── Group A — Content tables (read-only, synced from server) ──
export { breedDBService } from './breedDBService';
export { developmentStageDBService } from './developmentStageDBService';
export { diseaseDBService } from './diseaseDBService';
export { symptomDBService } from './symptomDBService';
export { diseaseSymptomMappingDBService } from './diseaseSymptomMappingDBService';
export { medicationDBService } from './medicationDBService';
export { firstAidDBService } from './firstAidDBService';
export { trainingMethodDBService } from './trainingMethodDBService';
export { exerciseDBService } from './exerciseDBService';
export { roadmapDBService } from './roadmapDBService';
export { roadmapExerciseDBService } from './roadmapExerciseDBService';
export { nutritionDBService } from './nutritionDBService';
export { contentDBService } from './contentDBService';

// ── Group B — Field data tables (writable, synced to server) ──
export { dogProfileDBService } from './dogProfileDBService';
export { dogAssignmentDBService } from './dogAssignmentDBService';
export { fieldNoteDBService } from './fieldNoteDBService';
export { healthRecordDBService } from './healthRecordDBService';
export { healthSessionDBService } from './healthSessionDBService';
export { sessionFollowUpDBService } from './sessionFollowUpDBService';
export { contentSuggestionDBService } from './contentSuggestionDBService';
export { weightAssessmentDBService } from './weightAssessmentDBService';
export { operationReportDBService } from './operationReportDBService';
export { diagnosisRecordDBService } from './diagnosisRecordDBService';

// ── Group C — Sync infrastructure ─────────────────────────────
export { syncQueueDBService } from './syncQueueDBService';
export { syncMetadataDBService } from './syncMetadataDBService';
export { syncConflictDBService } from './syncConflictDBService';
export { userSessionDBService } from './userSessionDBService';
export { offlineCacheDBService } from './offlineCacheDBService';
export { trainingProgressDBService } from './trainingProgressDBService';
