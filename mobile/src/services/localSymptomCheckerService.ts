import { db } from '../database';
import type {
  SymptomCheckerRequest,
  SymptomCheckerResult,
  SymptomDiagnosisResult,
  SymptomCheckerMedicationSuggestion,
  SymptomCheckerFirstAidSuggestion,
} from '../types/symptomChecker';

// ── types for raw SQL rows ─────────────────────────────────────

interface DsmRow {
  disease_id: number;
  symptom_id: number;
  weight: number;
  is_primary: number;
}

interface DiseaseRow {
  disease_id: number;
  disease_name: string;
  severity_level: string | null;
  treatment_guidelines: string | null;
  prevention_measures: string | null;
}

interface SymptomNameRow {
  symptom_id: number;
  symptom_name: string;
}

interface MedRow {
  mapping_id: number;
  disease_id: number;
  medication_id: number;
  priority: number;
  notes: string | null;
  medication_name: string;
  dosage_instructions: string | null;
  administration_method: string | null;
}

interface FirstAidRow {
  mapping_id: number;
  disease_id: number;
  guide_id: number;
  priority: number;
  notes: string | null;
  guide_title: string;
  emergency_type: string | null;
  immediate_steps: string | null;
}

// ── urgency / recommendation logic (mirrors Java backend) ─────

type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | string;
type UrgencyLevel = 'EMERGENCY' | 'HIGH' | 'MEDIUM' | 'LOW';

const calcUrgency = (severity: SeverityLevel | null, matchPct: number): UrgencyLevel => {
  if (severity === 'CRITICAL' && matchPct >= 60) return 'EMERGENCY';
  if (severity === 'HIGH' && matchPct >= 50) return 'HIGH';
  if (severity === 'MEDIUM' && matchPct >= 40) return 'MEDIUM';
  return 'LOW';
};

const overallUrgency = (results: SymptomDiagnosisResult[]): UrgencyLevel => {
  const levels: UrgencyLevel[] = ['EMERGENCY', 'HIGH', 'MEDIUM', 'LOW'];
  for (const level of levels) {
    if (results.some((r) => calcUrgency(r.severityLevel, r.matchPercentage) === level)) {
      return level;
    }
  }
  return 'LOW';
};

const buildRecommendation = (urgency: UrgencyLevel, diseases: SymptomDiagnosisResult[]): string => {
  const top = diseases[0];
  switch (urgency) {
    case 'EMERGENCY':
      return `KHẨN CẤP: Chó có thể mắc ${top?.diseaseName ?? 'bệnh nguy hiểm'}. Hãy đưa đến bác sĩ thú y NGAY LẬP TỨC!`;
    case 'HIGH':
      return `CẦN CHĂM SÓC: Cần đưa chó đến bác sĩ thú y trong vòng 24 giờ. Theo dõi các triệu chứng chặt chẽ.`;
    case 'MEDIUM':
      return `THEO DÕI: Theo dõi tình trạng của chó. Nếu triệu chứng kéo dài hoặc nặng hơn, hãy tham khảo bác sĩ thú y.`;
    default:
      return `BÌNH THƯỜNG: Triệu chứng có thể nhẹ. Đảm bảo chó được nghỉ ngơi, uống đủ nước và ăn uống bình thường.`;
  }
};

// ── main offline check function ───────────────────────────────

export const localCheck = async (request: SymptomCheckerRequest): Promise<SymptomCheckerResult> => {
  const { symptomIds } = request;

  if (!symptomIds || symptomIds.length === 0) {
    return {
      possibleDiseases: [],
      urgencyLevel: 'LOW',
      recommendation: 'Không có triệu chứng nào được chọn.',
      totalSymptomsChecked: 0,
    };
  }

  // 1. Fetch all disease_symptom_mapping rows for the given symptoms
  const placeholders = symptomIds.map(() => '?').join(',');
  const dsmRows = db.getAllSync<DsmRow>(
    `SELECT disease_id, symptom_id, weight, is_primary
     FROM disease_symptom_mapping
     WHERE symptom_id IN (${placeholders})`,
    symptomIds,
  );

  // 2. Collect all unique disease_ids that have at least one matched symptom
  const matchedDiseaseIds = Array.from(new Set(dsmRows.map((r) => r.disease_id)));
  if (matchedDiseaseIds.length === 0) {
    return {
      possibleDiseases: [],
      urgencyLevel: 'LOW',
      recommendation: 'Không tìm thấy bệnh nào phù hợp với các triệu chứng đã chọn.',
      totalSymptomsChecked: symptomIds.length,
    };
  }

  // 3. Fetch disease info
  const diseasePlaceholders = matchedDiseaseIds.map(() => '?').join(',');
  const diseaseRows = db.getAllSync<DiseaseRow>(
    `SELECT disease_id, disease_name, severity_level, treatment_guidelines, prevention_measures
     FROM disease
     WHERE disease_id IN (${diseasePlaceholders}) AND is_deleted = 0`,
    matchedDiseaseIds,
  );
  const diseaseMap = new Map(diseaseRows.map((d) => [d.disease_id, d]));

  // 4. Fetch all dsm rows for the matched diseases (needed to compute total symptoms per disease)
  const allDsmRows = db.getAllSync<DsmRow>(
    `SELECT disease_id, symptom_id, weight, is_primary
     FROM disease_symptom_mapping
     WHERE disease_id IN (${diseasePlaceholders})`,
    matchedDiseaseIds,
  );

  // 5. Fetch symptom names (for matched + missing display)
  const allSymptomIds = Array.from(new Set(allDsmRows.map((r) => r.symptom_id)));
  const symptomNameRows = allSymptomIds.length > 0
    ? db.getAllSync<SymptomNameRow>(
        `SELECT symptom_id, symptom_name FROM symptom WHERE symptom_id IN (${allSymptomIds.map(() => '?').join(',')})`,
        allSymptomIds,
      )
    : [];
  const symptomNameMap = new Map(symptomNameRows.map((s) => [s.symptom_id, s.symptom_name]));

  // 6. Group dsm rows by disease
  const dsmByDisease = new Map<number, DsmRow[]>();
  for (const row of allDsmRows) {
    const existing = dsmByDisease.get(row.disease_id) ?? [];
    existing.push(row);
    dsmByDisease.set(row.disease_id, existing);
  }

  const inputSet = new Set(symptomIds);

  // 7. Compute match percentages and filter >= 30%
  const candidateResults: SymptomDiagnosisResult[] = [];

  for (const diseaseId of matchedDiseaseIds) {
    const disease = diseaseMap.get(diseaseId);
    if (!disease) continue;

    const allSymptoms = dsmByDisease.get(diseaseId) ?? [];
    const matchedSymptoms = allSymptoms.filter((s) => inputSet.has(s.symptom_id));
    const total = allSymptoms.length;
    if (total === 0) continue;

    const matchPct = (matchedSymptoms.length / total) * 100;
    if (matchPct < 30) continue;

    const matchedSymptomNames = matchedSymptoms.map(
      (s) => symptomNameMap.get(s.symptom_id) ?? `Triệu chứng #${s.symptom_id}`,
    );
    const missingSymptomNames = allSymptoms
      .filter((s) => !inputSet.has(s.symptom_id))
      .map((s) => symptomNameMap.get(s.symptom_id) ?? `Triệu chứng #${s.symptom_id}`);

    candidateResults.push({
      diseaseId,
      diseaseName: disease.disease_name,
      severityLevel: disease.severity_level ?? 'LOW',
      matchPercentage: Math.round(matchPct * 10) / 10,
      matchedSymptoms: matchedSymptoms.length,
      totalDiseaseSymptoms: total,
      matchedSymptomNames,
      missingSymptomNames,
      treatmentGuidelines: disease.treatment_guidelines,
      preventionMeasures: disease.prevention_measures,
      recommendedMedications: null,
      recommendedFirstAidGuides: null,
    });
  }

  // Sort descending by matchPercentage
  candidateResults.sort((a, b) => b.matchPercentage - a.matchPercentage);

  // 8. Fetch medication + first-aid suggestions per disease
  const resultDiseaseIds = candidateResults.map((r) => r.diseaseId);

  if (resultDiseaseIds.length > 0) {
    const resultPlaceholders = resultDiseaseIds.map(() => '?').join(',');

    const medRows = db.getAllSync<MedRow>(
      `SELECT dmm.mapping_id, dmm.disease_id, dmm.medication_id, dmm.priority, dmm.notes,
              m.medication_name, m.dosage_instructions, m.administration_method
       FROM disease_medication_mapping dmm
       JOIN medication m ON m.medication_id = dmm.medication_id AND m.is_deleted = 0
       WHERE dmm.disease_id IN (${resultPlaceholders})
       ORDER BY dmm.disease_id, dmm.priority ASC`,
      resultDiseaseIds,
    );

    const firstAidRows = db.getAllSync<FirstAidRow>(
      `SELECT dfam.mapping_id, dfam.disease_id, dfam.guide_id, dfam.priority, dfam.notes,
              f.guide_title, f.emergency_type, f.immediate_steps
       FROM disease_first_aid_mapping dfam
       JOIN first_aid_guide f ON f.guide_id = dfam.guide_id AND f.is_deleted = 0
       WHERE dfam.disease_id IN (${resultPlaceholders})
       ORDER BY dfam.disease_id, dfam.priority ASC`,
      resultDiseaseIds,
    );

    const medsByDisease = new Map<number, SymptomCheckerMedicationSuggestion[]>();
    for (const row of medRows) {
      const list = medsByDisease.get(row.disease_id) ?? [];
      list.push({
        medicationId: row.medication_id,
        medicationName: row.medication_name,
        dosageInstructions: row.dosage_instructions,
        administrationMethod: row.administration_method,
        priority: row.priority,
        notes: row.notes,
      });
      medsByDisease.set(row.disease_id, list);
    }

    const firstAidByDisease = new Map<number, SymptomCheckerFirstAidSuggestion[]>();
    for (const row of firstAidRows) {
      const list = firstAidByDisease.get(row.disease_id) ?? [];
      list.push({
        guideId: row.guide_id,
        guideTitle: row.guide_title,
        emergencyType: row.emergency_type,
        immediateSteps: row.immediate_steps,
        priority: row.priority,
        notes: row.notes,
      });
      firstAidByDisease.set(row.disease_id, list);
    }

    for (const result of candidateResults) {
      result.recommendedMedications = medsByDisease.get(result.diseaseId) ?? [];
      result.recommendedFirstAidGuides = firstAidByDisease.get(result.diseaseId) ?? [];
    }
  }

  // 9. Compute overall urgency and recommendation
  const urgency = overallUrgency(candidateResults);
  const recommendation = buildRecommendation(urgency, candidateResults);

  return {
    possibleDiseases: candidateResults,
    urgencyLevel: urgency,
    recommendation,
    totalSymptomsChecked: symptomIds.length,
  };
};
