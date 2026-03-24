export interface TrainerDashboardDog {
  dogId: number;
  dogCode: string | null;
  dogName: string | null;
  breedId: number | null;
  breedName: string | null;
  imageUrl: string | null;
  assignmentType: string | null;
  startDate: string | null;
  endDate: string | null;
}

export interface TrainerDashboardStats {
  assignedDogs: TrainerDashboardDog[];
  totalFieldNotes: number;
  totalReports: number;
  source: 'REMOTE' | 'CACHE' | 'LOCAL';
  updatedAt: string | null;
}
