export type SymptomCategory = 'EATING' | 'BEHAVIOR' | 'PHYSICAL' | 'RESPIRATORY' | 'SKIN' | 'OTHER';
export type DiagnosisSeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SymptomUrgencyLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;

export interface SymptomItem {
    symptomId: number;
    symptomCode: string;
    symptomName: string;
    category: SymptomCategory;
    severityIndicator: number;
    description?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface SymptomCheckerRequest {
    symptomIds: number[];
    breedId?: number | null;
    ageMonths?: number | null;
}

export interface SymptomCheckerMedicationSuggestion {
    medicationId: number;
    medicationName: string;
    dosageInstructions?: string | null;
    administrationMethod?: string | null;
    priority?: number | null;
    notes?: string | null;
}

export interface SymptomCheckerFirstAidSuggestion {
    guideId: number;
    guideTitle: string;
    emergencyType?: string | null;
    immediateSteps?: string | null;
    priority?: number | null;
    notes?: string | null;
}

export interface SymptomDiagnosisResult {
    diseaseId: number;
    diseaseName: string;
    severityLevel: DiagnosisSeverityLevel | string;
    matchPercentage: number;
    matchedSymptoms: number;
    totalDiseaseSymptoms: number;
    matchedSymptomNames: string[];
    missingSymptomNames: string[];
    treatmentGuidelines?: string | null;
    preventionMeasures?: string | null;
    recommendedMedications?: SymptomCheckerMedicationSuggestion[] | null;
    recommendedFirstAidGuides?: SymptomCheckerFirstAidSuggestion[] | null;
}

export interface SymptomCheckerResult {
    possibleDiseases: SymptomDiagnosisResult[];
    urgencyLevel: SymptomUrgencyLevel;
    recommendation?: string | null;
    totalSymptomsChecked: number;
}
