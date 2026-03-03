export interface Breed {
    breedId: number;
    breedName: string;
    origin: string;
    sizeClassification: string;
    trainabilityLevel: string;
    weightMaleMinKg: number;
    weightMaleMaxKg: number;
    weightFemaleMinKg: number;
    weightFemaleMaxKg: number;
    avgHeightCm: number;
    lifespanYears: string;
    description: string;
    imageUrl?: string;
    status?: string;
    createdByName?: string;
    temperament?: string[];
    careInstructions?: string;
    trainingTips?: string;
}
