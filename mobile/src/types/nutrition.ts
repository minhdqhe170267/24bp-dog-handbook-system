export interface NutritionStandard {
    standardId: number;
    rationCode: string;
    rationName: string;
    description: string;
    breedId: number | null;
    breedName: string;
    targetAgeMinMonths: number;
    targetAgeMaxMonths: number;
    activityLevel: string;
    healthCondition: string;
    metadata: string;
    specialNotes: string;
    status: string;
    createdByName: string;
    createdAt: string;
    updatedAt: string;
}

export interface NutritionCalculateRequest {
    breedId: number;
    weightKg: number;
    ageMonths: number;
    activityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
    gender: 'MALE' | 'FEMALE';
    healthCondition?: 'NORMAL' | 'RECOVERY' | 'SPECIAL';
}

export interface NutritionCalculateResponse {
    dailyCalories: number;
    proteinG: number;
    fatG: number;
    carbG: number;
    weightStatus: string;
    deviationPercent: number;
    recommendation: string;
    suggestedRation?: {
        standardId: number;
        rationCode: string;
        rationName: string;
    } | null;
    formula: string;
}
