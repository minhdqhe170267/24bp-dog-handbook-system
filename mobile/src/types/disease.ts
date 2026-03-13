export interface Disease {
    diseaseId: number;
    diseaseName: string;
    description: string;
    symptomSummary: string;
    treatmentGuidelines: string;
    preventionMeasures: string;
    severityLevel: string; // LOW, MEDIUM, HIGH, CRITICAL
    isContagious: boolean;
    incubationPeriod: string;
    status: string;
}
