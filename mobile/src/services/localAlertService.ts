import {
  dogAssignmentDBService,
  dogProfileDBService,
  exerciseDBService,
  healthRecordDBService,
  healthSessionDBService,
  offlineCacheDBService,
  syncConflictDBService,
  syncQueueDBService,
  weightAssessmentDBService,
} from '../database/services';
import type { HealthSessionRow, WeightAssessmentRow } from '../database/types';
import { useAuthStore } from '../stores/authStore';
import { useTrainingProgressStore } from '../stores/trainingProgressStore';
import type { NotificationCategory, NotificationFeedItem } from './notificationCenterService';

export type LocalAlertType =
  | 'ASSIGNMENT_NEW'
  | 'FOLLOWUP_DUE'
  | 'FOLLOWUP_OVERDUE_ESCALATION'
  | 'HEALTH_SESSION_NEW'
  | 'HEALTH_SESSION_UPDATED'
  | 'HEALTH_SESSION_CRITICAL'
  | 'CHECKUP_DUE'
  | 'SYNC_FAILED'
  | 'SYNC_CONFLICT'
  | 'REPEATED_SYNC_FAILURE'
  | 'PENDING_SYNC_STALE'
  | 'WEIGHT_ABNORMAL'
  | 'EXERCISE_COMPLETED'
  | 'EXERCISE_STALE'
  | 'NUTRITION_PLAN_CREATED'
  | 'NUTRITION_PLAN_UPDATED'
  | 'FEEDING_TIME_DUE';

interface LocalAlertReadState {
  readIds: Record<string, string>;
}

interface WeightAlertSnapshot {
  dogId: number;
  dogName: string | null;
  dogCode: string | null;
  weightStatus: string | null;
  alertLevel: string | null;
  currentWeightKg: number | null;
  deviationPercent: number | null;
  createdAt: string;
}

export interface NutritionCalculationSnapshot {
  profileKey: string;
  breedId: number;
  breedName: string | null;
  rationId: number | null;
  rationCode: string | null;
  rationName: string | null;
  weightStatus: string | null;
  deviationPercent: number | null;
  dailyCalories: number | null;
  feedingSchedule: string | null;
  createdAt: string;
}

const LOCAL_ALERT_STATE_KEY = 'notification_local_alert_state_v1';
const WEIGHT_ALERT_SNAPSHOTS_KEY = 'notification_weight_alert_snapshots_v1';
const NUTRITION_CALC_SNAPSHOTS_KEY = 'notification_nutrition_calc_snapshots_v1';
const STALE_SESSION_DAYS = 7;
const OVERDUE_ESCALATION_DAYS = 3;
const REPEATED_SYNC_THRESHOLD = 3;
const STALE_PENDING_HOURS = 6;
const STALE_EXERCISE_HOURS = 36;
const CHECKUP_LOOKAHEAD_DAYS = 2;
const RECENT_ASSIGNMENT_DAYS = 7;
const RECENT_SESSION_EVENT_DAYS = 3;
const SESSION_UPDATE_THRESHOLD_MINUTES = 10;

const defaultReadState = (): LocalAlertReadState => ({
  readIds: {},
});

const parseStoredState = (value: string | null): LocalAlertReadState => {
  if (!value) {
    return defaultReadState();
  }

  try {
    const parsed = JSON.parse(value) as Partial<LocalAlertReadState>;
    return {
      readIds:
        parsed.readIds && typeof parsed.readIds === 'object'
          ? Object.fromEntries(
              Object.entries(parsed.readIds).filter(
                (entry): entry is [string, string] => typeof entry[0] === 'string' && typeof entry[1] === 'string',
              ),
            )
          : {},
    };
  } catch {
    return defaultReadState();
  }
};

const loadReadState = async (): Promise<LocalAlertReadState> => {
  const cached = await offlineCacheDBService.get(LOCAL_ALERT_STATE_KEY);
  return parseStoredState(cached);
};

const saveReadState = async (state: LocalAlertReadState): Promise<void> => {
  await offlineCacheDBService.set(LOCAL_ALERT_STATE_KEY, JSON.stringify(state));
};

const loadWeightSnapshots = async (): Promise<WeightAlertSnapshot[]> => {
  const cached = await offlineCacheDBService.get(WEIGHT_ALERT_SNAPSHOTS_KEY);
  if (!cached) {
    return [];
  }

  try {
    const parsed = JSON.parse(cached) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is WeightAlertSnapshot => {
      if (!item || typeof item !== 'object') {
        return false;
      }

      const snapshot = item as Partial<WeightAlertSnapshot>;
      return typeof snapshot.dogId === 'number' && typeof snapshot.createdAt === 'string';
    });
  } catch {
    return [];
  }
};

const saveWeightSnapshots = async (snapshots: WeightAlertSnapshot[]): Promise<void> => {
  await offlineCacheDBService.set(WEIGHT_ALERT_SNAPSHOTS_KEY, JSON.stringify(snapshots));
};

const loadNutritionSnapshots = async (): Promise<NutritionCalculationSnapshot[]> => {
  const cached = await offlineCacheDBService.get(NUTRITION_CALC_SNAPSHOTS_KEY);
  if (!cached) {
    return [];
  }

  try {
    const parsed = JSON.parse(cached) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is NutritionCalculationSnapshot => {
      if (!item || typeof item !== 'object') {
        return false;
      }

      const snapshot = item as Partial<NutritionCalculationSnapshot>;
      return (
        typeof snapshot.profileKey === 'string' &&
        typeof snapshot.breedId === 'number' &&
        typeof snapshot.createdAt === 'string'
      );
    });
  } catch {
    return [];
  }
};

const saveNutritionSnapshots = async (
  snapshots: NutritionCalculationSnapshot[],
): Promise<void> => {
  await offlineCacheDBService.set(
    NUTRITION_CALC_SNAPSHOTS_KEY,
    JSON.stringify(snapshots),
  );
};

const parseDate = (value: string | null | undefined): Date | null => {
  if (!value) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const dateOnly = new Date(`${value}T00:00:00`);
    return Number.isNaN(dateOnly.getTime()) ? null : dateOnly;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDogLine = (dogName: string | null | undefined, dogCode: string | null | undefined): string => {
  if (dogName && dogCode) {
    return `${dogName} (${dogCode})`;
  }

  return dogName || dogCode || 'chưa rõ K9';
};

const formatExerciseLine = (exerciseName: string | null | undefined): string =>
  exerciseName || 'bài tập huấn luyện';

const formatAssignmentType = (assignmentType: string | null | undefined): string => {
  switch ((assignmentType || '').toUpperCase()) {
    case 'PRIMARY':
      return 'ph\u1ee5 tr\u00e1ch ch\u00ednh';
    case 'SECONDARY':
      return 'ph\u1ee5 tr\u00e1ch h\u1ed7 tr\u1ee3';
    case 'TEMPORARY':
      return 'ph\u1ee5 tr\u00e1ch t\u1ea1m th\u1eddi';
    default:
      return '\u0111\u01b0\u1ee3c ph\u00e2n c\u00f4ng';
  }
};

const formatDateShort = (value: string | null | undefined): string => {
  const parsed = parseDate(value);
  if (!parsed) {
    return 'h\u00f4m nay';
  }

  const day = `${parsed.getDate()}`.padStart(2, '0');
  const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
  return `${day}/${month}`;
};

const formatSessionStatus = (status: string | null | undefined): string => {
  switch ((status || '').toUpperCase()) {
    case 'ACTIVE':
      return '\u0111ang theo d\u00f5i';
    case 'MONITORING':
      return '\u0111ang gi\u00e1m s\u00e1t';
    case 'RESOLVED':
      return '\u0111\u00e3 x\u1eed l\u00fd';
    case 'ESCALATED':
      return '\u0111\u00e3 chuy\u1ec3n tuy\u1ebfn';
    default:
      return 'm\u1edbi c\u1eadp nh\u1eadt';
  }
};

const formatWeightStatus = (status: string | null | undefined): string => {
  switch ((status || '').toUpperCase()) {
    case 'SEVERELY_UNDERWEIGHT':
      return 'thi\u1ebfu c\u00e2n nghi\u00eam tr\u1ecdng';
    case 'UNDERWEIGHT':
      return 'thi\u1ebfu c\u00e2n';
    case 'NORMAL':
      return 'b\u00ecnh th\u01b0\u1eddng';
    case 'OVERWEIGHT':
      return 'th\u1eeba c\u00e2n';
    case 'OBESE':
      return 'b\u00e9o ph\u00ec';
    default:
      return 'c\u1ea7n theo d\u00f5i';
  }
};

const parseFeedingSchedule = (
  schedule: string | null | undefined,
): { time: string; portion: string | null }[] => {
  if (!schedule) {
    return [];
  }

  return String(schedule)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/(\d{1,2}:\d{2})\s*(.*)/);
      return {
        time: match ? match[1] : part,
        portion: match && match[2] ? match[2].trim() : null,
      };
    })
    .filter((item) => /^\d{1,2}:\d{2}$/.test(item.time));
};

const getMealLabel = (index: number): string => {
  const labels = ['Bữa sáng', 'Bữa trưa', 'Bữa chiều', 'Bữa tối'];
  return labels[index] ?? `Bữa ${index + 1}`;
};

const buildFingerprint = (
  type: string,
  entityType: string | null,
  entityId: string | number | null,
): string =>
  `${type}:${entityType ?? 'NONE'}:${entityId ?? 'NONE'}`;

const buildAlert = (
  partial: Omit<NotificationFeedItem, 'isRead' | 'sourceLabel' | 'source'>,
  readState: LocalAlertReadState,
): NotificationFeedItem => ({
  ...partial,
  source: 'LOCAL',
  sourceLabel: 'Trên thiết bị',
  isRead: !!readState.readIds[partial.id],
});

const isOpenHealthSession = (row: HealthSessionRow): boolean =>
  !['RESOLVED'].includes((row.status || '').toUpperCase());

const isHighSeverity = (row: HealthSessionRow): boolean =>
  (row.severity || '').toUpperCase() === 'HIGH';

const mapEntityLabel = (entityType: string): string => {
  switch (entityType) {
    case 'field_note':
      return 'Ghi chú thực địa';
    case 'health_record':
      return 'Hồ sơ sức khỏe';
    case 'health_session':
      return 'Phiên sức khỏe';
    case 'session_follow_up':
      return 'Theo dõi sau phiên';
    case 'weight_assessment':
      return 'Đánh giá cân nặng';
    case 'content_suggestion':
      return 'Góp ý nội dung';
    case 'diagnosis_record':
      return 'Chẩn đoán';
    case 'operation_report':
      return 'Báo cáo';
    default:
      return entityType.replace(/_/g, ' ');
  }
};

const makeSyncFailedMessage = (entityType: string, errorMessage: string | null): string => {
  const base = `Đồng bộ ${mapEntityLabel(entityType)} chưa thành công.`;
  if (!errorMessage) {
    return base;
  }
  return `${base} Lý do: ${errorMessage}`;
};

const makeWeightMessage = (row: WeightAssessmentRow, dogLine: string): string => {
  const statusMap: Record<string, string> = {
    SEVERELY_UNDERWEIGHT: 'thiếu cân nghiêm trọng',
    UNDERWEIGHT: 'thiếu cân',
    OVERWEIGHT: 'thừa cân',
    OBESE: 'béo phì',
  };

  const label = statusMap[row.status] ?? 'bất thường';
  const deviation =
    typeof row.deviation_percent === 'number'
      ? `, lệch ${Math.abs(row.deviation_percent).toFixed(1)}%`
      : '';
  return `${dogLine} đang ${label}${deviation}. Nên kiểm tra và cập nhật kế hoạch chăm sóc.`;
};

const getCategoryLabel = (category: NotificationCategory): string => {
  switch (category) {
    case 'ASSIGNMENT':
      return 'Ph\u00e2n c\u00f4ng';
    case 'TRAINING':
      return 'Huấn luyện';
    case 'NUTRITION':
      return 'Dinh dưỡng';
    case 'SYNC':
      return 'Đồng bộ';
    case 'HEALTH':
      return 'Sức khỏe';
    case 'WEIGHT':
      return 'Cân nặng';
    default:
      return 'Thông báo';
  }
};

const createRoute = (entityType: string, entityId: string | number | null, dogId?: number | null): string => {
  switch (entityType) {
    case 'DOG_ASSIGNMENT':
      return '/dog-management/assignments';
    case 'HEALTH_RECORD':
      return entityId != null ? `/dog-management/health-records/${entityId}` : '/dog-management/health-records';
    case 'HEALTH_SESSION':
      return entityId != null ? `/dog-management/health-sessions/${entityId}` : '/dog-management/health-sessions';
    case 'SYNC':
      return '/sync';
    case 'TRAINING_EXERCISE':
      return entityId != null ? `/training/exercises/${entityId}` : '/training/exercises';
    case 'NUTRITION_STANDARD':
      return entityId != null ? `/nutrition/${entityId}` : '/nutrition/calculator';
    case 'WEIGHT_ASSESSMENT':
      return dogId != null ? `/dog-management/weight-assessment/${dogId}` : '/dog-management';
    default:
      return '/notifications';
  }
};

const buildRemoteFingerprintSet = (remoteItems: Pick<NotificationFeedItem, 'type' | 'entityType' | 'entityId'>[]): Set<string> =>
  new Set(
    remoteItems.map((item) => buildFingerprint(item.type ?? 'UNKNOWN', item.entityType, item.entityId)),
  );

export const localAlertService = {
  async getAlerts(
    remoteItems: Pick<NotificationFeedItem, 'type' | 'entityType' | 'entityId'>[] = [],
  ): Promise<NotificationFeedItem[]> {
    const userId = useAuthStore.getState().user?.userId;
    if (!userId) {
      return [];
    }

    const trainingProgress = useTrainingProgressStore.getState().progressByExercise;

    const [
      readState,
      dogs,
      assignments,
      records,
      sessions,
      exercises,
      failedSyncItems,
      pendingSyncItems,
      conflicts,
      weightRows,
      weightSnapshots,
      nutritionSnapshots,
    ] = await Promise.all([
      loadReadState(),
      dogProfileDBService.getAll(),
      dogAssignmentDBService.getByTrainer(userId),
      healthRecordDBService.getAll(),
      healthSessionDBService.getAll(),
      exerciseDBService.getAll(),
      syncQueueDBService.getFailed(),
      syncQueueDBService.getPending(),
      syncConflictDBService.getPending(),
      weightAssessmentDBService.getAll(),
      loadWeightSnapshots(),
      loadNutritionSnapshots(),
    ]);

    const remoteFingerprints = buildRemoteFingerprintSet(remoteItems);
    const dogMap = new Map(dogs.map((dog) => [dog.dog_id, dog]));
    const exerciseMap = new Map(exercises.map((exercise) => [exercise.exercise_id, exercise]));
    const alerts: NotificationFeedItem[] = [];
    const now = Date.now();

    for (const assignment of assignments) {
      const createdAt = parseDate(assignment.created_at) ?? parseDate(assignment.start_date);
      if (!createdAt || now - createdAt.getTime() > RECENT_ASSIGNMENT_DAYS * 24 * 60 * 60 * 1000) {
        continue;
      }

      const fingerprint = buildFingerprint('ASSIGNMENT_CREATED', 'DOG_ASSIGNMENT', assignment.assignment_id);
      if (remoteFingerprints.has(fingerprint)) {
        continue;
      }

      const dogLine = formatDogLine(assignment.dog_name, assignment.dog_code);
      alerts.push(
        buildAlert(
          {
            id: `local-assignment-new:${assignment.assignment_id}:${assignment.created_at}`,
            type: 'ASSIGNMENT_NEW',
            title: `Ph\u00e2n c\u00f4ng m\u1edbi: ${assignment.dog_name || assignment.dog_code || 'K9'}`,
            message: `${dogLine} v\u1eeba \u0111\u01b0\u1ee3c giao cho b\u1ea1n theo vai tr\u00f2 ${formatAssignmentType(assignment.assignment_type)}. Th\u1eddi \u0111i\u1ec3m b\u1eaft \u0111\u1ea7u: ${formatDateShort(assignment.start_date)}.`,
            entityType: 'DOG_ASSIGNMENT',
            entityId: assignment.assignment_id,
            senderName: '\u1ee8ng d\u1ee5ng',
            createdAt: assignment.created_at || assignment.start_date,
            category: 'ASSIGNMENT',
            categoryLabel: getCategoryLabel('ASSIGNMENT'),
            route: createRoute('DOG_ASSIGNMENT', assignment.assignment_id),
            accent: 'primary',
          },
          readState,
        ),
      );
    }

    for (const [exerciseIdText, progress] of Object.entries(trainingProgress)) {
      const exerciseId = Number(exerciseIdText);
      if (!Number.isFinite(exerciseId)) {
        continue;
      }

      const exercise = exerciseMap.get(exerciseId);
      const exerciseName = formatExerciseLine(exercise?.exercise_name);

      if (progress.status === 'COMPLETED' && progress.completedAt) {
        const completedAt = parseDate(progress.completedAt);
        if (completedAt && now - completedAt.getTime() <= 7 * 24 * 60 * 60 * 1000) {
          alerts.push(
            buildAlert(
              {
                id: `local-exercise-completed:${exerciseId}:${progress.completedAt}`,
                type: 'EXERCISE_COMPLETED',
                title: `Hoàn thành bài tập: ${exerciseName}`,
                message: `Bạn đã hoàn thành ${exerciseName}. Có thể mở lại để ôn tập hoặc tiếp tục bài kế tiếp trong lộ trình.`,
                entityType: 'TRAINING_EXERCISE',
                entityId: exerciseId,
                senderName: 'Ứng dụng',
                createdAt: progress.completedAt,
                category: 'TRAINING',
                categoryLabel: getCategoryLabel('TRAINING'),
                route: createRoute('TRAINING_EXERCISE', exerciseId),
                accent: 'success',
              },
              readState,
            ),
          );
        }
      }

      if (progress.status === 'IN_PROGRESS' && progress.startedAt) {
        const startedAt = parseDate(progress.startedAt);
        if (startedAt && now - startedAt.getTime() >= STALE_EXERCISE_HOURS * 60 * 60 * 1000) {
          alerts.push(
            buildAlert(
              {
                id: `local-exercise-stale:${exerciseId}`,
                type: 'EXERCISE_STALE',
                title: `Bài tập đang dang dở: ${exerciseName}`,
                message: `${exerciseName} đã được bắt đầu nhưng chưa hoàn tất. Hãy quay lại để tiếp tục lộ trình huấn luyện.`,
                entityType: 'TRAINING_EXERCISE',
                entityId: exerciseId,
                senderName: 'Ứng dụng',
                createdAt: progress.updatedAt,
                category: 'TRAINING',
                categoryLabel: getCategoryLabel('TRAINING'),
                route: createRoute('TRAINING_EXERCISE', exerciseId),
                accent: 'warning',
              },
              readState,
            ),
          );
        }
      }
    }

    for (const record of records) {
      if (record.examiner_id !== userId) {
        continue;
      }

      const nextCheckupDate = parseDate(record.next_checkup_date);
      if (!nextCheckupDate) {
        continue;
      }

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const diffDays = Math.floor(
        (nextCheckupDate.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000),
      );

      if (diffDays < 0 || diffDays > CHECKUP_LOOKAHEAD_DAYS) {
        continue;
      }

      const dog = dogMap.get(record.dog_id);
      const dogLine = formatDogLine(dog?.dog_name, dog?.dog_code);
      const title =
        diffDays === 0
          ? `Đến hạn kiểm tra: ${dog?.dog_name || 'K9'}`
          : `Nhắc tái khám sắp tới: ${dog?.dog_name || 'K9'}`;
      const message =
        diffDays === 0
          ? `${dogLine} cần được kiểm tra sức khỏe trong hôm nay. Mở hồ sơ sức khỏe để xem lại chẩn đoán và kế hoạch theo dõi.`
          : `${dogLine} có lịch tái khám trong ${diffDays} ngày tới. Bạn nên chuẩn bị lịch theo dõi và cập nhật hồ sơ.`;

      alerts.push(
        buildAlert(
          {
            id: `local-checkup-due:${record.local_id}:${record.next_checkup_date}`,
            type: 'CHECKUP_DUE',
            title,
            message,
            entityType: 'HEALTH_RECORD',
            entityId: record.local_id,
            senderName: 'Ứng dụng',
            createdAt: record.next_checkup_date ?? new Date().toISOString(),
            category: 'HEALTH',
            categoryLabel: getCategoryLabel('HEALTH'),
            route: createRoute('HEALTH_RECORD', record.local_id),
            accent: diffDays === 0 ? 'warning' : 'info',
          },
          readState,
        ),
      );
    }

    const latestNutritionByProfile = new Map<string, NutritionCalculationSnapshot>();
    for (const snapshot of nutritionSnapshots.sort((left, right) => {
      const rightTime = parseDate(right.createdAt)?.getTime() ?? 0;
      const leftTime = parseDate(left.createdAt)?.getTime() ?? 0;
      return rightTime - leftTime;
    })) {
      if (!latestNutritionByProfile.has(snapshot.profileKey)) {
        latestNutritionByProfile.set(snapshot.profileKey, snapshot);
      }
    }

    for (const snapshot of latestNutritionByProfile.values()) {
      const createdAt = parseDate(snapshot.createdAt);
      if (!createdAt || now - createdAt.getTime() > 7 * 24 * 60 * 60 * 1000) {
        continue;
      }

      const previousSnapshot = nutritionSnapshots.find(
        (item) =>
          item.profileKey === snapshot.profileKey &&
          item.createdAt !== snapshot.createdAt &&
          (parseDate(item.createdAt)?.getTime() ?? 0) < createdAt.getTime(),
      );

      const isAdjusted =
        !!previousSnapshot &&
        (previousSnapshot.rationCode !== snapshot.rationCode ||
          previousSnapshot.weightStatus !== snapshot.weightStatus ||
          previousSnapshot.dailyCalories !== snapshot.dailyCalories);

      alerts.push(
        buildAlert(
          {
            id: `local-nutrition-plan:${snapshot.profileKey}:${snapshot.createdAt}`,
            type: isAdjusted ? 'NUTRITION_PLAN_UPDATED' : 'NUTRITION_PLAN_CREATED',
            title: isAdjusted ? 'Khẩu phần đã được điều chỉnh' : 'Kết quả khẩu phần đã sẵn sàng',
            message: snapshot.rationName
              ? `${snapshot.breedName || 'Chó hiện tại'} phù hợp với khẩu phần ${snapshot.rationName}${snapshot.weightStatus ? `, trạng thái ${formatWeightStatus(snapshot.weightStatus)}` : ''}.`
              : `${snapshot.breedName || 'Chó hiện tại'} đã có kết quả tính khẩu phần mới. Mở lại màn dinh dưỡng để xem chi tiết.`,
            entityType: 'NUTRITION_STANDARD',
            entityId: snapshot.rationId,
            senderName: 'Ứng dụng',
            createdAt: snapshot.createdAt,
            category: 'NUTRITION',
            categoryLabel: getCategoryLabel('NUTRITION'),
            route: snapshot.rationId != null ? createRoute('NUTRITION_STANDARD', snapshot.rationId) : '/nutrition/calculator',
            accent: isAdjusted ? 'info' : 'success',
          },
          readState,
        ),
      );

      const feedingSchedule = parseFeedingSchedule(snapshot.feedingSchedule);
      feedingSchedule.forEach((meal, index) => {
        const [hoursText, minutesText] = meal.time.split(':');
        const hours = Number(hoursText);
        const minutes = Number(minutesText);
        if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
          return;
        }

        const mealDate = new Date();
        mealDate.setHours(hours, minutes, 0, 0);
        const diffMinutes = Math.floor((now - mealDate.getTime()) / 60000);
        if (diffMinutes < 0 || diffMinutes > 90) {
          return;
        }

        const dayKey = mealDate.toISOString().slice(0, 10);
        alerts.push(
          buildAlert(
            {
              id: `local-feeding-due:${snapshot.profileKey}:${dayKey}:${meal.time}`,
              type: 'FEEDING_TIME_DUE',
              title: `${getMealLabel(index)} đã đến giờ`,
              message: `${snapshot.rationName || 'Khẩu phần hiện tại'} đến khung cho ăn ${meal.time}${meal.portion ? ` (${meal.portion})` : ''}.`,
              entityType: 'NUTRITION_STANDARD',
              entityId: snapshot.rationId,
              senderName: 'Ứng dụng',
              createdAt: mealDate.toISOString(),
              category: 'NUTRITION',
              categoryLabel: getCategoryLabel('NUTRITION'),
              route: snapshot.rationId != null ? createRoute('NUTRITION_STANDARD', snapshot.rationId) : '/nutrition/calculator',
              accent: 'warning',
            },
            readState,
          ),
        );
      });
    }

    for (const row of failedSyncItems) {
      alerts.push(
        buildAlert(
          {
            id: `local-sync-failed:${row.id}`,
            type: 'SYNC_FAILED',
            title: 'Đồng bộ thất bại',
            message: makeSyncFailedMessage(row.entity_type, row.error_message),
            entityType: 'SYNC',
            entityId: row.id,
            senderName: 'Ứng dụng',
            createdAt: row.created_at,
            category: 'SYNC',
            categoryLabel: getCategoryLabel('SYNC'),
            route: createRoute('SYNC', row.id),
            accent: 'danger',
          },
          readState,
        ),
      );
    }

    for (const row of conflicts) {
      alerts.push(
        buildAlert(
          {
            id: `local-sync-conflict:${row.id}`,
            type: 'SYNC_CONFLICT',
            title: 'Xung đột đồng bộ dữ liệu',
            message: `${mapEntityLabel(row.entity_type)} đang có xung đột. Mở màn Đồng bộ dữ liệu để kiểm tra và xử lý.`,
            entityType: 'SYNC',
            entityId: row.id,
            senderName: 'Ứng dụng',
            createdAt: row.created_at,
            category: 'SYNC',
            categoryLabel: getCategoryLabel('SYNC'),
            route: createRoute('SYNC', row.id),
            accent: 'warning',
          },
          readState,
        ),
      );
    }

    const recentSyncIssues = [...failedSyncItems, ...conflicts].filter((row) => {
      const createdAt = parseDate(row.created_at);
      return createdAt ? now - createdAt.getTime() <= 24 * 60 * 60 * 1000 : false;
    });

    if (
      recentSyncIssues.length >= REPEATED_SYNC_THRESHOLD &&
      !remoteFingerprints.has(buildFingerprint('REPEATED_SYNC_FAILURE', null, null))
    ) {
      const bucket = new Date().toISOString().slice(0, 10);
      alerts.push(
        buildAlert(
          {
            id: `local-repeated-sync:${bucket}`,
            type: 'REPEATED_SYNC_FAILURE',
            title: 'Đồng bộ gặp lỗi lặp lại',
            message: `Trong 24 giờ qua, thiết bị có ${recentSyncIssues.length} sự cố đồng bộ. Nên mở màn Đồng bộ dữ liệu để xử lý sớm.`,
            entityType: 'SYNC',
            entityId: bucket,
            senderName: 'Ứng dụng',
            createdAt: new Date().toISOString(),
            category: 'SYNC',
            categoryLabel: getCategoryLabel('SYNC'),
            route: '/sync',
            accent: 'warning',
          },
          readState,
        ),
      );
    }

    const stalePendingItems = pendingSyncItems.filter((row) => {
      const createdAt = parseDate(row.created_at);
      return createdAt ? now - createdAt.getTime() >= STALE_PENDING_HOURS * 60 * 60 * 1000 : false;
    });

    if (stalePendingItems.length > 0) {
      alerts.push(
        buildAlert(
          {
            id: `local-pending-sync-stale:${stalePendingItems[0]?.id ?? 'queue'}`,
            type: 'PENDING_SYNC_STALE',
            title: 'Còn dữ liệu chờ đồng bộ',
            message: `${stalePendingItems.length} mục dữ liệu đã chờ đồng bộ quá lâu. Kết nối mạng và thử đồng bộ lại để tránh mất cập nhật.`,
            entityType: 'SYNC',
            entityId: stalePendingItems[0]?.id ?? null,
            senderName: 'Ứng dụng',
            createdAt: stalePendingItems[0]?.created_at ?? new Date().toISOString(),
            category: 'SYNC',
            categoryLabel: getCategoryLabel('SYNC'),
            route: '/sync',
            accent: 'warning',
          },
          readState,
        ),
      );
    }

    for (const row of sessions) {
      if (row.trainer_id !== userId || !isOpenHealthSession(row)) {
        continue;
      }

      const dog = dogMap.get(row.dog_id);
      const dogLine = formatDogLine(dog?.dog_name, dog?.dog_code);
      const route = createRoute('HEALTH_SESSION', row.server_id ?? row.local_id);
      const createdAt = parseDate(row.created_at);
      const updatedAt = parseDate(row.updated_at);

      if (
        createdAt &&
        now - createdAt.getTime() <= RECENT_SESSION_EVENT_DAYS * 24 * 60 * 60 * 1000 &&
        !remoteFingerprints.has(
          buildFingerprint('HEALTH_SESSION_CREATED', 'HEALTH_SESSION', row.server_id ?? null),
        )
      ) {
        alerts.push(
          buildAlert(
            {
              id: `local-health-session-new:${row.local_id}:${row.created_at}`,
              type: 'HEALTH_SESSION_NEW',
              title: `Phi\u00ean s\u1ee9c kh\u1ecfe m\u1edbi: ${dog?.dog_name || 'K9'}`,
              message: `${dogLine} v\u1eeba c\u00f3 phi\u00ean theo d\u00f5i m\u1edbi. N\u1ed9i dung ban \u0111\u1ea7u: ${row.issue_summary}.`,
              entityType: 'HEALTH_SESSION',
              entityId: row.server_id ?? row.local_id,
              senderName: '\u1ee8ng d\u1ee5ng',
              createdAt: row.created_at,
              category: 'HEALTH',
              categoryLabel: getCategoryLabel('HEALTH'),
              route,
              accent: 'info',
            },
            readState,
          ),
        );
      }

      if (
        createdAt &&
        updatedAt &&
        updatedAt.getTime() - createdAt.getTime() >= SESSION_UPDATE_THRESHOLD_MINUTES * 60 * 1000 &&
        now - updatedAt.getTime() <= RECENT_SESSION_EVENT_DAYS * 24 * 60 * 60 * 1000
      ) {
        alerts.push(
          buildAlert(
            {
              id: `local-health-session-updated:${row.local_id}:${row.updated_at}`,
              type: 'HEALTH_SESSION_UPDATED',
              title: `Phi\u00ean s\u1ee9c kh\u1ecfe \u0111\u00e3 c\u1eadp nh\u1eadt: ${dog?.dog_name || 'K9'}`,
              message: `${dogLine} vừa có thêm cập nhật trạng thái ${formatSessionStatus(row.status)}. Hãy mở chi tiết để xem diễn biến mới nhất.`,
              entityType: 'HEALTH_SESSION',
              entityId: row.server_id ?? row.local_id,
              senderName: '\u1ee8ng d\u1ee5ng',
              createdAt: row.updated_at,
              category: 'HEALTH',
              categoryLabel: getCategoryLabel('HEALTH'),
              route,
              accent: 'primary',
            },
            readState,
          ),
        );
      }

      const followUpDate = parseDate(row.follow_up_date);
      if (followUpDate) {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const dueDiff = followUpDate.getTime() - startOfToday.getTime();
        const overdueDays = Math.floor((startOfToday.getTime() - followUpDate.getTime()) / (24 * 60 * 60 * 1000));
        const isDueOrOverdue = dueDiff <= 0;
        const alertType =
          overdueDays >= OVERDUE_ESCALATION_DAYS ? 'FOLLOWUP_OVERDUE_ESCALATION' : 'FOLLOWUP_DUE';
        const fingerprint = buildFingerprint(alertType, 'HEALTH_SESSION', row.server_id ?? null);

        if (isDueOrOverdue && !remoteFingerprints.has(fingerprint)) {
          alerts.push(
            buildAlert(
              {
                id: `local-${alertType.toLowerCase()}:${row.local_id}`,
                type: alertType,
                title:
                  overdueDays >= OVERDUE_ESCALATION_DAYS
                    ? `Follow-up quá hạn ${overdueDays} ngày`
                    : `Nhắc follow-up: ${dog?.dog_name || 'K9'}`,
                message:
                  overdueDays >= OVERDUE_ESCALATION_DAYS
                    ? `${dogLine} đã quá hạn follow-up ${overdueDays} ngày. Nên xử lý ngay trong hôm nay.`
                    : `${dogLine} cần follow-up trong ngày hôm nay. ${row.issue_summary}`,
                entityType: 'HEALTH_SESSION',
                entityId: row.server_id ?? row.local_id,
                senderName: 'Ứng dụng',
                createdAt: followUpDate.toISOString(),
                category: 'HEALTH',
                categoryLabel: getCategoryLabel('HEALTH'),
                route,
                accent: overdueDays >= OVERDUE_ESCALATION_DAYS ? 'danger' : 'warning',
              },
              readState,
            ),
          );
        }
      }

      const startedAt = parseDate(row.started_at);
      const isStaleSession =
        startedAt != null && now - startedAt.getTime() >= STALE_SESSION_DAYS * 24 * 60 * 60 * 1000;
      if ((isHighSeverity(row) || isStaleSession) && !remoteFingerprints.has(buildFingerprint('HEALTH_SESSION_CRITICAL', 'HEALTH_SESSION', row.server_id ?? null))) {
        alerts.push(
          buildAlert(
            {
              id: `local-health-critical:${row.local_id}`,
              type: 'HEALTH_SESSION_CRITICAL',
              title: isHighSeverity(row)
                ? `Phiên sức khỏe nghiêm trọng: ${dog?.dog_name || 'K9'}`
                : `Phiên sức khỏe kéo dài: ${dog?.dog_name || 'K9'}`,
              message: isHighSeverity(row)
                ? `${dogLine} đang ở mức ưu tiên cao và chưa được xử lý xong.`
                : `${dogLine} đang mở quá ${STALE_SESSION_DAYS} ngày. Nên xem lại hướng xử lý.`,
              entityType: 'HEALTH_SESSION',
              entityId: row.server_id ?? row.local_id,
              senderName: 'Ứng dụng',
              createdAt: row.updated_at,
              category: 'HEALTH',
              categoryLabel: getCategoryLabel('HEALTH'),
              route,
              accent: 'danger',
            },
            readState,
          ),
        );
      }
    }

    const hasRemoteWeightAlert = remoteItems.some(
      (item) => item.type === 'WEIGHT_ABNORMAL' || item.type === 'WEIGHT_ABNORMAL_CRITICAL',
    );
    const abnormalWeightDogIds = new Set<number>();

    for (const row of weightRows) {
      if (row.assessor_id !== userId || row.status === 'NORMAL') {
        continue;
      }

      abnormalWeightDogIds.add(row.dog_id);

      const fingerprint = buildFingerprint('WEIGHT_ABNORMAL', 'WEIGHT_ASSESSMENT', row.server_id ?? null);
      if (remoteFingerprints.has(fingerprint)) {
        continue;
      }

      const dog = dogMap.get(row.dog_id);
      const dogLine = formatDogLine(dog?.dog_name, dog?.dog_code);
      alerts.push(
        buildAlert(
          {
            id: `local-weight-abnormal:${row.local_id}`,
            type: 'WEIGHT_ABNORMAL',
            title: `Cảnh báo cân nặng: ${dog?.dog_name || 'K9'}`,
            message: makeWeightMessage(row, dogLine),
            entityType: 'WEIGHT_ASSESSMENT',
            entityId: row.server_id ?? row.local_id,
            senderName: 'Ứng dụng',
            createdAt: row.assessed_at,
            category: 'WEIGHT',
            categoryLabel: getCategoryLabel('WEIGHT'),
            route: createRoute('WEIGHT_ASSESSMENT', row.server_id ?? row.local_id, row.dog_id),
            accent: row.status === 'SEVERELY_UNDERWEIGHT' || row.status === 'OBESE' ? 'danger' : 'warning',
          },
          readState,
        ),
      );
    }

    if (!hasRemoteWeightAlert) {
      for (const snapshot of weightSnapshots) {
        if (abnormalWeightDogIds.has(snapshot.dogId)) {
          continue;
        }

        alerts.push(
          buildAlert(
            {
              id: `local-weight-snapshot:${snapshot.dogId}:${snapshot.createdAt}`,
              type: 'WEIGHT_ABNORMAL',
              title: `Cảnh báo cân nặng: ${snapshot.dogName || 'K9'}`,
              message: `${formatDogLine(snapshot.dogName, snapshot.dogCode)} đang ở mức ${snapshot.weightStatus || 'bất thường'}${
                typeof snapshot.deviationPercent === 'number'
                  ? `, lệch ${Math.abs(snapshot.deviationPercent).toFixed(1)}%`
                  : ''
              }.`,
              entityType: 'WEIGHT_ASSESSMENT',
              entityId: `dog-${snapshot.dogId}`,
              senderName: 'Ứng dụng',
              createdAt: snapshot.createdAt,
              category: 'WEIGHT',
              categoryLabel: getCategoryLabel('WEIGHT'),
              route: createRoute('WEIGHT_ASSESSMENT', `dog-${snapshot.dogId}`, snapshot.dogId),
              accent: (snapshot.alertLevel || '').toUpperCase() === 'CRITICAL' ? 'danger' : 'warning',
            },
            readState,
          ),
        );
      }
    }

    return alerts.sort((left, right) => {
      const rightTime = parseDate(right.createdAt)?.getTime() ?? 0;
      const leftTime = parseDate(left.createdAt)?.getTime() ?? 0;
      return rightTime - leftTime;
    });
  },

  async getUnreadCount(
    remoteItems: Pick<NotificationFeedItem, 'type' | 'entityType' | 'entityId'>[] = [],
  ): Promise<number> {
    const alerts = await this.getAlerts(remoteItems);
    return alerts.filter((item) => !item.isRead).length;
  },

  async markAsRead(alertId: string): Promise<void> {
    const state = await loadReadState();
    state.readIds[alertId] = new Date().toISOString();
    await saveReadState(state);
  },

  async markManyAsRead(alertIds: string[]): Promise<void> {
    if (alertIds.length === 0) {
      return;
    }

    const state = await loadReadState();
    const now = new Date().toISOString();
    for (const id of alertIds) {
      state.readIds[id] = now;
    }
    await saveReadState(state);
  },

  async captureWeightAssessmentSnapshot(snapshot: WeightAlertSnapshot): Promise<void> {
    if ((snapshot.alertLevel || '').toUpperCase() === 'NORMAL') {
      return;
    }

    const current = await loadWeightSnapshots();
    const next = [
      snapshot,
      ...current.filter((item) => item.dogId !== snapshot.dogId),
    ]
      .sort((left, right) => (parseDate(right.createdAt)?.getTime() ?? 0) - (parseDate(left.createdAt)?.getTime() ?? 0))
      .slice(0, 20);

    await saveWeightSnapshots(next);
  },

  async captureNutritionCalculationSnapshot(
    snapshot: NutritionCalculationSnapshot,
  ): Promise<void> {
    const current = await loadNutritionSnapshots();
    const next = [
      snapshot,
      ...current.filter(
        (item) =>
          !(
            item.profileKey === snapshot.profileKey &&
            item.createdAt === snapshot.createdAt
          ),
      ),
    ]
      .sort(
        (left, right) =>
          (parseDate(right.createdAt)?.getTime() ?? 0) -
          (parseDate(left.createdAt)?.getTime() ?? 0),
      )
      .slice(0, 24);

    await saveNutritionSnapshots(next);
  },
};
