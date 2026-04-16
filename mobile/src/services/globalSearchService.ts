import { breedService } from './breedService';
import { contentSuggestionService } from './contentSuggestionService';
import { diseaseService } from './diseaseService';
import { enrollmentService } from './enrollmentService';
import { exerciseService } from './exerciseService';
import { fieldNoteService } from './fieldNoteService';
import { firstAidService } from './firstAidService';
import { healthRecordService } from './healthRecordService';
import { healthSessionService } from './healthSessionService';
import { medicationService } from './medicationService';
import { notificationCenterService } from './notificationCenterService';
import { nutritionService } from './nutritionService';
import { reportService } from './reportService';
import { roadmapService } from './roadmapService';
import { symptomService } from './symptomService';
import { trainerDogScopeService } from './trainerDogScopeService';
import { trainingMethodService } from './trainingMethodService';
import { trainingSpecialtyService } from './trainingSpecialtyService';
import type { ContentSuggestionItem } from '../types/contentSuggestion';
import type { Breed } from '../types/breed';
import type { Disease } from '../types/disease';
import type { DogProfile, FieldNote, HealthRecord, HealthSession } from '../types/dogManagement';
import type { FirstAidGuide } from '../types/firstAid';
import type { Medication } from '../types/medication';
import type { NutritionStandard } from '../types/nutrition';
import type { OperationReportItem } from '../types/report';
import type { SymptomItem } from '../types/symptomChecker';
import type {
  TrainingEnrollmentSummary,
  TrainingExercise,
  TrainingMethod,
  TrainingRoadmap,
  TrainingSpecialtyDetail,
} from '../types/training';
import type { NotificationFeedItem } from './notificationCenterService';

export type GlobalSearchFeatureKey =
  | 'DOGS'
  | 'HEALTH'
  | 'TRAINING'
  | 'NUTRITION'
  | 'REPORTS'
  | 'NOTIFICATIONS'
  | 'CONTENT';

export type GlobalSearchFilterKey = 'ALL' | GlobalSearchFeatureKey;

export interface GlobalSearchResult {
  id: string;
  featureKey: GlobalSearchFeatureKey;
  featureLabel: string;
  typeLabel: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  badge?: string | null;
  route: string;
  icon: string;
  updatedAt?: string | null;
  searchableText: string[];
}

export interface GlobalSearchResponse {
  results: GlobalSearchResult[];
  failedSources: string[];
}

const GLOBAL_SEARCH_PAGE_SIZE = 120;
const MAX_GLOBAL_RESULTS = 80;

export const GLOBAL_SEARCH_FILTERS: { key: GlobalSearchFilterKey; label: string; icon: string }[] = [
  { key: 'ALL', label: 'Tất cả', icon: 'search' },
  { key: 'DOGS', label: 'Chó', icon: 'paw' },
  { key: 'HEALTH', label: 'Sức khỏe', icon: 'medkit' },
  { key: 'TRAINING', label: 'Huấn luyện', icon: 'fitness' },
  { key: 'NUTRITION', label: 'Dinh dưỡng', icon: 'restaurant' },
  { key: 'REPORTS', label: 'Báo cáo', icon: 'clipboard' },
  { key: 'NOTIFICATIONS', label: 'Thông báo', icon: 'notifications' },
  { key: 'CONTENT', label: 'Nội dung', icon: 'chatbubbles' },
];

const FEATURE_META: Record<GlobalSearchFeatureKey, { label: string; icon: string }> = {
  DOGS: { label: 'Chó', icon: 'paw' },
  HEALTH: { label: 'Sức khỏe', icon: 'medkit' },
  TRAINING: { label: 'Huấn luyện', icon: 'fitness' },
  NUTRITION: { label: 'Dinh dưỡng', icon: 'restaurant' },
  REPORTS: { label: 'Báo cáo', icon: 'clipboard' },
  NOTIFICATIONS: { label: 'Thông báo', icon: 'notifications' },
  CONTENT: { label: 'Nội dung', icon: 'chatbubbles' },
};

const FEATURE_ORDER: GlobalSearchFeatureKey[] = [
  'DOGS',
  'HEALTH',
  'TRAINING',
  'NUTRITION',
  'REPORTS',
  'NOTIFICATIONS',
  'CONTENT',
];

const normalize = (value: unknown): string =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();

const compactText = (values: unknown[]): string[] =>
  values
    .map((value) => String(value ?? '').trim())
    .filter((value) => value.length > 0);

const firstText = (...values: unknown[]): string | null =>
  compactText(values)[0] ?? null;

const truncate = (value?: string | null, maxLength = 132): string | null => {
  const text = value?.replace(/\s+/g, ' ').trim();
  if (!text) {
    return null;
  }
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trim()}…` : text;
};

const formatDate = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const makeResult = (
  result: Omit<GlobalSearchResult, 'featureLabel' | 'icon' | 'searchableText'> & {
    searchText?: unknown[];
    icon?: string;
  },
): GlobalSearchResult => {
  const meta = FEATURE_META[result.featureKey];
  const searchableText = compactText([
    result.title,
    result.subtitle,
    result.description,
    result.typeLabel,
    result.badge,
    meta.label,
    ...(result.searchText ?? []),
  ]);

  return {
    ...result,
    featureLabel: meta.label,
    icon: result.icon ?? meta.icon,
    searchableText,
  };
};

const matchesKeyword = (result: GlobalSearchResult, keyword: string): boolean =>
  result.searchableText.some((value) => normalize(value).includes(keyword));

const scoreResult = (result: GlobalSearchResult, keyword: string): number => {
  const title = normalize(result.title);
  const subtitle = normalize(result.subtitle);
  const typeLabel = normalize(result.typeLabel);
  const badge = normalize(result.badge);
  const description = normalize(result.description);

  let score = 0;
  if (title === keyword) score += 120;
  if (title.startsWith(keyword)) score += 80;
  if (title.includes(keyword)) score += 55;
  if (subtitle.includes(keyword)) score += 32;
  if (typeLabel.includes(keyword)) score += 28;
  if (badge.includes(keyword)) score += 18;
  if (description.includes(keyword)) score += 12;
  return score;
};

const sortResults = (results: GlobalSearchResult[], keyword: string): GlobalSearchResult[] =>
  [...results].sort((left, right) => {
    const scoreDiff = scoreResult(right, keyword) - scoreResult(left, keyword);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }

    const featureDiff = FEATURE_ORDER.indexOf(left.featureKey) - FEATURE_ORDER.indexOf(right.featureKey);
    if (featureDiff !== 0) {
      return featureDiff;
    }

    return left.title.localeCompare(right.title, 'vi');
  });

const dedupeResults = (results: GlobalSearchResult[]): GlobalSearchResult[] => {
  const byId = new Map<string, GlobalSearchResult>();

  for (const item of results) {
    if (!byId.has(item.id)) {
      byId.set(item.id, item);
    }
  }

  return Array.from(byId.values());
};

const pageContent = <T>(page: { content?: T[] } | null | undefined): T[] => page?.content ?? [];

const loadSource = async <T>(
  sourceName: string,
  failedSources: string[],
  loader: () => Promise<T[]>,
  mapper: (item: T) => GlobalSearchResult | null,
): Promise<GlobalSearchResult[]> => {
  try {
    return (await loader()).map(mapper).filter((item): item is GlobalSearchResult => Boolean(item));
  } catch (error) {
    console.log(`[GLOBAL_SEARCH] ${sourceName} failed:`, error);
    failedSources.push(sourceName);
    return [];
  }
};

const getReportTypeLabel = (value?: string | null): string => {
  switch ((value ?? '').toUpperCase()) {
    case 'TRAINING':
      return 'Huấn luyện';
    case 'HEALTH':
      return 'Sức khỏe';
    default:
      return value || 'Báo cáo';
  }
};

const getContentSuggestionStatusLabel = (value?: string | null): string => {
  switch ((value ?? '').toUpperCase()) {
    case 'SUBMITTED':
      return 'Đã gửi';
    case 'UNDER_REVIEW':
      return 'Đang xem';
    case 'ACCEPTED':
      return 'Đã chấp nhận';
    case 'REJECTED':
      return 'Bị từ chối';
    case 'IMPLEMENTED':
      return 'Đã áp dụng';
    default:
      return value || 'Góp ý';
  }
};

const getContentSuggestionTypeLabel = (value?: string | null): string => {
  switch ((value ?? '').toUpperCase()) {
    case 'NEW_CONTENT':
      return 'Đề xuất nội dung mới';
    case 'UPDATE_EXISTING':
      return 'Cập nhật nội dung';
    case 'ERROR_REPORT':
      return 'Báo lỗi nội dung';
    case 'GENERAL_FEEDBACK':
      return 'Góp ý chung';
    default:
      return value || 'Góp ý nội dung';
  }
};

const getStaticDestinations = (): GlobalSearchResult[] => [
  makeResult({
    id: 'screen:dog-management',
    featureKey: 'DOGS',
    typeLabel: 'Màn chức năng',
    title: 'Hồ sơ chó',
    subtitle: 'Quản lý chó, phân công, ghi chú thực địa',
    description: 'Mở khu vực quản lý chó và các dữ liệu thực tế theo phạm vi trainer.',
    route: '/dog-management',
    searchText: ['dog management', 'quản lý chó', 'phân công chó'],
  }),
  makeResult({
    id: 'screen:breeds',
    featureKey: 'DOGS',
    typeLabel: 'Màn chức năng',
    title: 'Giống chó',
    subtitle: 'Tra cứu giống, năng lực và hồ sơ chi tiết',
    route: '/(tabs)/breeds',
    searchText: ['breed', 'giống chó', 'so sánh giống'],
  }),
  makeResult({
    id: 'screen:breed-compare',
    featureKey: 'DOGS',
    typeLabel: 'Công cụ',
    title: 'So sánh giống chó',
    subtitle: 'Đối chiếu thông tin giữa các giống chó',
    route: '/breeds/compare',
    searchText: ['compare', 'so sánh'],
  }),
  makeResult({
    id: 'screen:health',
    featureKey: 'HEALTH',
    typeLabel: 'Màn chức năng',
    title: 'Sức khỏe',
    subtitle: 'Bệnh lý, thuốc, sơ cứu và theo dõi sức khỏe',
    route: '/(tabs)/health',
    searchText: ['bệnh', 'thuốc', 'sơ cứu', 'health'],
  }),
  makeResult({
    id: 'screen:symptom-checker',
    featureKey: 'HEALTH',
    typeLabel: 'Công cụ',
    title: 'Kiểm tra triệu chứng',
    subtitle: 'Chọn triệu chứng để gợi ý hướng xử lý',
    route: '/health/symptom-checker',
    searchText: ['symptom checker', 'triệu chứng', 'chẩn đoán'],
  }),
  makeResult({
    id: 'screen:first-aid',
    featureKey: 'HEALTH',
    typeLabel: 'Màn chức năng',
    title: 'Sơ cứu khẩn cấp',
    subtitle: 'Quy trình xử lý nhanh sự cố ngoài hiện trường',
    route: '/health/first-aid',
    searchText: ['first aid', 'khẩn cấp'],
  }),
  makeResult({
    id: 'screen:training',
    featureKey: 'TRAINING',
    typeLabel: 'Màn chức năng',
    title: 'Huấn luyện',
    subtitle: 'Bài tập, phương pháp, lộ trình và tiến độ',
    route: '/(tabs)/training',
    searchText: ['training', 'bài tập', 'lộ trình'],
  }),
  makeResult({
    id: 'screen:nutrition',
    featureKey: 'NUTRITION',
    typeLabel: 'Màn chức năng',
    title: 'Dinh dưỡng',
    subtitle: 'Tiêu chuẩn khẩu phần và máy tính dinh dưỡng',
    route: '/(tabs)/nutrition',
    searchText: ['nutrition', 'khẩu phần'],
  }),
  makeResult({
    id: 'screen:nutrition-calculator',
    featureKey: 'NUTRITION',
    typeLabel: 'Công cụ',
    title: 'Máy tính dinh dưỡng',
    subtitle: 'Tính khẩu phần dựa trên giống, cân nặng và độ tuổi',
    route: '/nutrition/calculator',
    searchText: ['calculator', 'tính khẩu phần'],
  }),
  makeResult({
    id: 'screen:reports',
    featureKey: 'REPORTS',
    typeLabel: 'Màn chức năng',
    title: 'Báo cáo công tác',
    subtitle: 'Báo cáo huấn luyện, sức khỏe và trạng thái đồng bộ',
    route: '/reports',
    searchText: ['report', 'báo cáo trainer'],
  }),
  makeResult({
    id: 'screen:notifications',
    featureKey: 'NOTIFICATIONS',
    typeLabel: 'Màn chức năng',
    title: 'Thông báo',
    subtitle: 'Hộp thư hệ thống và cảnh báo trên thiết bị',
    route: '/notifications',
    searchText: ['notification', 'hộp thư', 'cảnh báo'],
  }),
  makeResult({
    id: 'screen:content-suggestions',
    featureKey: 'CONTENT',
    typeLabel: 'Màn chức năng',
    title: 'Góp ý nội dung',
    subtitle: 'Gửi đề xuất, báo lỗi và theo dõi phản hồi',
    route: '/content-suggestions',
    searchText: ['feedback', 'suggestion', 'đề xuất nội dung'],
  }),
  makeResult({
    id: 'screen:sync',
    featureKey: 'CONTENT',
    typeLabel: 'Màn chức năng',
    title: 'Đồng bộ dữ liệu',
    subtitle: 'Theo dõi trạng thái sync và xung đột dữ liệu',
    route: '/sync',
    searchText: ['sync', 'đồng bộ', 'offline'],
  }),
];

const mapBreed = (item: Breed): GlobalSearchResult =>
  makeResult({
    id: `breed:${item.breedId}`,
    featureKey: 'DOGS',
    typeLabel: 'Giống chó',
    title: item.breedName,
    subtitle: firstText(item.origin, item.sizeClassification, item.trainabilityLevel),
    description: truncate(item.description),
    badge: item.operationalCapabilities ?? null,
    route: `/breeds/${item.breedId}`,
    searchText: [
      item.origin,
      item.sizeClassification,
      item.trainabilityLevel,
      item.operationalCapabilities,
      item.temperament?.join(' '),
      item.careInstructions,
      item.trainingTips,
    ],
  });

const mapDog = (item: DogProfile): GlobalSearchResult =>
  makeResult({
    id: `dog:${item.dogId}`,
    featureKey: 'DOGS',
    typeLabel: 'Hồ sơ chó',
    title: item.dogName || `Chó #${item.dogId}`,
    subtitle: compactText([item.dogCode, item.breedName, item.status]).join(' • '),
    description: truncate(item.notes),
    badge: item.currentWeightKg ? `${item.currentWeightKg} kg` : null,
    route: `/dog-management/dogs/${item.dogId}`,
    searchText: [item.gender, item.color, item.microchipId, item.ageMonths, item.heightCm],
  });

const mapDisease = (item: Disease): GlobalSearchResult =>
  makeResult({
    id: `disease:${item.diseaseId}`,
    featureKey: 'HEALTH',
    typeLabel: 'Bệnh lý',
    title: item.diseaseName,
    subtitle: compactText([item.severityLevel, item.isContagious ? 'Lây nhiễm' : null]).join(' • '),
    description: truncate(item.symptomSummary || item.description),
    badge: item.incubationPeriod,
    route: `/health/diseases/${item.diseaseId}`,
    searchText: [item.treatmentGuidelines, item.preventionMeasures, item.status],
  });

const mapFirstAid = (item: FirstAidGuide): GlobalSearchResult =>
  makeResult({
    id: `first-aid:${item.guideId}`,
    featureKey: 'HEALTH',
    typeLabel: 'Sơ cứu',
    title: item.guideTitle,
    subtitle: item.emergencyType,
    description: truncate(item.description || item.immediateSteps),
    badge: 'Khẩn cấp',
    route: `/health/first-aid/${item.guideId}`,
    searchText: [item.requiredMaterials, item.doNotActions, item.whenToSeekVet, item.status],
  });

const mapMedication = (item: Medication): GlobalSearchResult =>
  makeResult({
    id: `medication:${item.medicationId}`,
    featureKey: 'HEALTH',
    typeLabel: 'Thuốc',
    title: item.medicationName,
    subtitle: item.administrationMethod,
    description: truncate(item.description || item.dosageInstructions),
    route: `/health/medications/${item.medicationId}`,
    searchText: [item.sideEffects, item.contraindications, item.storageRequirements, item.status],
  });

const mapSymptom = (item: SymptomItem): GlobalSearchResult =>
  makeResult({
    id: `symptom:${item.symptomId}`,
    featureKey: 'HEALTH',
    typeLabel: 'Triệu chứng',
    title: item.symptomName,
    subtitle: compactText([item.symptomCode, item.category]).join(' • '),
    description: truncate(item.description),
    badge: `Mức ${item.severityIndicator}`,
    route: '/health/symptom-checker',
    searchText: [item.category, item.symptomCode],
  });

const mapHealthRecord = (item: HealthRecord): GlobalSearchResult =>
  makeResult({
    id: `health-record:${item.recordId}`,
    featureKey: 'HEALTH',
    typeLabel: 'Hồ sơ khám',
    title: item.dogName ? `Khám sức khỏe ${item.dogName}` : `Hồ sơ khám #${item.recordId}`,
    subtitle: compactText([item.dogCode, formatDate(item.examinationDate), item.examinerName]).join(' • '),
    description: truncate(firstText(item.diagnosis, item.observedSymptoms, item.treatmentGiven, item.notes)),
    badge: item.syncStatus,
    route: `/dog-management/health-records/${item.recordId}`,
    searchText: [
      item.weightKg,
      item.temperatureC,
      item.fecesStatus,
      item.appetiteLevel,
      item.activityLevel,
      item.nextCheckupDate,
    ],
  });

const mapHealthSession = (item: HealthSession): GlobalSearchResult =>
  makeResult({
    id: `health-session:${item.sessionId}`,
    featureKey: 'HEALTH',
    typeLabel: 'Phiên theo dõi',
    title: item.issueSummary || `Phiên theo dõi #${item.sessionId}`,
    subtitle: compactText([item.dogName, item.dogCode, item.status]).join(' • '),
    description: truncate(firstText(item.resolutionNotes, item.timeline?.map((entry) => entry.notes).join(' '))),
    badge: item.severity,
    route: `/dog-management/health-sessions/${item.sessionId}`,
    searchText: [
      item.handlerName,
      item.unitName,
      item.startedAt,
      item.lastUpdatedAt,
      item.followUpDate,
      item.syncStatus,
    ],
  });

const mapNutrition = (item: NutritionStandard): GlobalSearchResult =>
  makeResult({
    id: `nutrition:${item.standardId}`,
    featureKey: 'NUTRITION',
    typeLabel: 'Tiêu chuẩn dinh dưỡng',
    title: item.rationName,
    subtitle: compactText([item.rationCode, item.breedName, item.activityLevel]).join(' • '),
    description: truncate(item.description || item.specialNotes),
    badge: item.healthCondition,
    route: `/nutrition/${item.standardId}`,
    searchText: [
      item.targetAgeMinMonths,
      item.targetAgeMaxMonths,
      item.metadata,
      item.status,
      item.createdByName,
    ],
  });

const mapTrainingMethod = (item: TrainingMethod): GlobalSearchResult =>
  makeResult({
    id: `training-method:${item.methodId}`,
    featureKey: 'TRAINING',
    typeLabel: 'Phương pháp',
    title: item.methodName,
    subtitle: item.createdByName,
    description: truncate(item.description || item.instructions),
    badge: item.status,
    route: `/training/methods/${item.methodId}`,
    searchText: [item.advantages, item.disadvantages, item.instructions],
  });

const mapExercise = (item: TrainingExercise): GlobalSearchResult =>
  makeResult({
    id: `exercise:${item.exerciseId}`,
    featureKey: 'TRAINING',
    typeLabel: 'Bài tập',
    title: item.exerciseName,
    subtitle: compactText([item.methodName, item.difficultyLevel]).join(' • '),
    description: truncate(item.description || item.instructions),
    badge: item.durationMinutes ? `${item.durationMinutes} phút` : item.status,
    route: `/training/exercises/${item.exerciseId}`,
    searchText: [item.requiredEquipment, item.safetyPrecautions, item.createdByName],
  });

const mapRoadmap = (item: TrainingRoadmap): GlobalSearchResult =>
  makeResult({
    id: `roadmap:${item.roadmapId}`,
    featureKey: 'TRAINING',
    typeLabel: 'Lộ trình',
    title: item.roadmapName,
    subtitle: compactText([item.specialtyName, item.breedName, item.targetRole]).join(' • '),
    description: truncate(item.description || item.phaseObjectives),
    badge: item.totalDurationWeeks ? `${item.totalDurationWeeks} tuần` : item.status,
    route: `/training/roadmaps/${item.roadmapId}`,
    searchText: [item.phaseName, item.assessmentCriteria, item.createdByName],
  });

const mapSpecialty = (item: TrainingSpecialtyDetail): GlobalSearchResult =>
  makeResult({
    id: `specialty:${item.specialtyId}`,
    featureKey: 'TRAINING',
    typeLabel: 'Chuyên ngành',
    title: item.specialtyName,
    subtitle: compactText([item.specialtyCode, `${item.roadmapCount} lộ trình`]).join(' • '),
    description: truncate(item.description),
    badge: item.activeProgramCount ? `${item.activeProgramCount} chương trình` : null,
    route: `/training/specialties/${item.specialtyId}`,
    searchText: [item.enrolledDogCount, item.version, item.roadmaps.map((roadmap) => roadmap.roadmapName).join(' ')],
  });

const mapEnrollment = (item: TrainingEnrollmentSummary): GlobalSearchResult =>
  makeResult({
    id: `enrollment:${item.enrollmentId}`,
    featureKey: 'TRAINING',
    typeLabel: 'Tiến độ huấn luyện',
    title: item.dogName || `Tiến độ #${item.enrollmentId}`,
    subtitle: compactText([item.specialtyName, item.currentRoadmapName, item.currentPhaseName]).join(' • '),
    description: truncate(item.notes),
    badge: `${Math.round(item.progressPercent ?? 0)}%`,
    route: `/training/enrollments/${item.enrollmentId}`,
    searchText: [item.trainerName, item.status, item.enrolledAt, item.completedAt],
  });

const mapFieldNote = (item: FieldNote): GlobalSearchResult =>
  makeResult({
    id: `field-note:${item.noteId}`,
    featureKey: 'DOGS',
    typeLabel: 'Ghi chú thực địa',
    title: item.title,
    subtitle: compactText([item.dogName, item.dogCode, item.location]).join(' • '),
    description: truncate(item.content),
    badge: item.syncStatus,
    route: `/dog-management/field-notes/${item.noteId}`,
    searchText: [item.ownerName, item.unitName, item.category, item.tags?.join(' '), item.recordedAt],
  });

const mapReport = (item: OperationReportItem): GlobalSearchResult =>
  makeResult({
    id: `report:${item.routeId}`,
    featureKey: 'REPORTS',
    typeLabel: 'Báo cáo công tác',
    title: item.reportTitle,
    subtitle: compactText([item.dogName, item.dogCode, getReportTypeLabel(item.reportType)]).join(' • '),
    description: truncate(item.reportContent ?? item.metadata),
    badge: item.syncStatus,
    route: `/reports/${item.routeId}`,
    searchText: [item.trainerName, item.reportDate, item.source],
  });

const mapContentSuggestion = (item: ContentSuggestionItem): GlobalSearchResult =>
  makeResult({
    id: `content-suggestion:${item.routeId}`,
    featureKey: 'CONTENT',
    typeLabel: getContentSuggestionTypeLabel(item.suggestionType),
    title: item.title,
    subtitle: compactText([item.relatedExerciseName, getContentSuggestionStatusLabel(item.status)]).join(' • '),
    description: truncate(firstText(item.description, item.adminResponse)),
    badge: item.syncStatus,
    route: `/content-suggestions/${item.routeId}`,
    searchText: [item.trainerName, item.reviewedByName, item.submittedAt, item.source],
  });

const mapNotification = (item: NotificationFeedItem): GlobalSearchResult =>
  makeResult({
    id: `notification:${item.id}`,
    featureKey: 'NOTIFICATIONS',
    typeLabel: item.categoryLabel,
    title: item.title,
    subtitle: compactText([item.sourceLabel, item.senderName, formatDate(item.createdAt)]).join(' • '),
    description: truncate(item.message),
    badge: item.isRead ? 'Đã đọc' : 'Chưa đọc',
    route: item.route || '/notifications',
    searchText: [item.category, item.entityType, item.route],
  });

export const getGlobalSearchSuggestions = (): GlobalSearchResult[] => getStaticDestinations();

export const searchGlobalMobileContent = async (query: string): Promise<GlobalSearchResponse> => {
  const keyword = normalize(query);
  if (!keyword) {
    return {
      results: [],
      failedSources: [],
    };
  }

  const failedSources: string[] = [];
  const staticResults = getStaticDestinations();

  const dynamicGroups = await Promise.all([
    loadSource('Giống chó', failedSources, async () => pageContent(await breedService.getAll(0, GLOBAL_SEARCH_PAGE_SIZE, query, { forceRemote: true, includeMedia: false })), mapBreed),
    loadSource('Hồ sơ chó', failedSources, () => trainerDogScopeService.getAssignedDogs(true), mapDog),
    loadSource('Bệnh lý', failedSources, async () => pageContent(await diseaseService.getAll(0, GLOBAL_SEARCH_PAGE_SIZE, query)), mapDisease),
    loadSource('Sơ cứu', failedSources, async () => pageContent(await firstAidService.getAll(0, GLOBAL_SEARCH_PAGE_SIZE, query)), mapFirstAid),
    loadSource('Thuốc', failedSources, async () => pageContent(await medicationService.getAll(0, GLOBAL_SEARCH_PAGE_SIZE, query)), mapMedication),
    loadSource('Triệu chứng', failedSources, () => symptomService.getAll(), mapSymptom),
    loadSource('Hồ sơ khám', failedSources, async () => pageContent(await healthRecordService.getAll(0, GLOBAL_SEARCH_PAGE_SIZE)), mapHealthRecord),
    loadSource('Phiên theo dõi', failedSources, () => healthSessionService.getMine(), mapHealthSession),
    loadSource('Dinh dưỡng', failedSources, async () => pageContent(await nutritionService.getAll(0, GLOBAL_SEARCH_PAGE_SIZE, query)), mapNutrition),
    loadSource('Phương pháp huấn luyện', failedSources, async () => pageContent(await trainingMethodService.getAll(0, GLOBAL_SEARCH_PAGE_SIZE, query)), mapTrainingMethod),
    loadSource('Bài tập huấn luyện', failedSources, async () => pageContent(await exerciseService.getAll(0, GLOBAL_SEARCH_PAGE_SIZE, query)), mapExercise),
    loadSource('Lộ trình huấn luyện', failedSources, async () => pageContent(await roadmapService.getAll(0, GLOBAL_SEARCH_PAGE_SIZE)), mapRoadmap),
    loadSource('Chuyên ngành huấn luyện', failedSources, () => trainingSpecialtyService.getVisibleDetails(query), mapSpecialty),
    loadSource('Tiến độ huấn luyện', failedSources, () => enrollmentService.getMy(), mapEnrollment),
    loadSource('Ghi chú thực địa', failedSources, () => fieldNoteService.getAll(), mapFieldNote),
    loadSource('Báo cáo', failedSources, () => reportService.getMyReports(), mapReport),
    loadSource('Góp ý nội dung', failedSources, () => contentSuggestionService.getMySuggestions(), mapContentSuggestion),
    loadSource('Thông báo', failedSources, async () => (await notificationCenterService.getInbox()).items, mapNotification),
  ]);

  const results = dedupeResults([...staticResults, ...dynamicGroups.flat()])
    .filter((item) => matchesKeyword(item, keyword));

  return {
    results: sortResults(results, keyword).slice(0, MAX_GLOBAL_RESULTS),
    failedSources,
  };
};
