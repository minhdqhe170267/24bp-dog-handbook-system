export interface Breed {
    breedId: number;
    breedName: string;
    origin: string;
    description: string;
    sizeClassification: string;
    trainabilityLevel: string;
    weightMaleMinKg: number;
    weightMaleMaxKg: number;
    weightFemaleMinKg: number;
    weightFemaleMaxKg: number;
    avgHeightCm: number;
    lifespanYears: string;
    operationalCapabilities?: string | null;
    metadata?: string | null;
    imageUrl?: string | null;
    status?: string;
    createdByName?: string;
    createdAt?: string;
    updatedAt?: string;
    temperament?: string[];
    careInstructions?: string;
    trainingTips?: string;
}
