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
    imageUrl?: string;
    status?: string;
    createdByName?: string;
    temperament?: string[];
    careInstructions?: string;
    trainingTips?: string;
}
