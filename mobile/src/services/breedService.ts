import api, { ApiResponse, PageResponse, unwrapApiData } from './api';
import { Breed } from '../types/breed';

const MOCK_BREEDS: Breed[] = [
    {
        breedId: 1,
        breedName: 'Cho Becgie Duc',
        origin: 'Duc',
        sizeClassification: 'Lon',
        trainabilityLevel: 'Rat cao',
        weightMaleMinKg: 30,
        weightMaleMaxKg: 40,
        weightFemaleMinKg: 22,
        weightFemaleMaxKg: 32,
        avgHeightCm: 62,
        lifespanYears: '9-13',
        description: 'Giong cho nghiep vu pho bien, thong minh va trung thanh.',
        status: 'ACTIVE',
        temperament: ['Trung thanh', 'Thong minh', 'Dung cam', 'Tu tin'],
    },
    {
        breedId: 2,
        breedName: 'Labrador Retriever',
        origin: 'Canada',
        sizeClassification: 'Lon',
        trainabilityLevel: 'Cao',
        weightMaleMinKg: 29,
        weightMaleMaxKg: 36,
        weightFemaleMinKg: 25,
        weightFemaleMaxKg: 32,
        avgHeightCm: 57,
        lifespanYears: '10-12',
        description: 'Giong cho than thien, de huan luyen va ho tro cuu ho.',
        status: 'ACTIVE',
        temperament: ['Than thien', 'Hien lanh', 'Nang dong', 'Kien nhan'],
    },
    {
        breedId: 3,
        breedName: 'Malinois Bi',
        origin: 'Bi',
        sizeClassification: 'Trung binh-Lon',
        trainabilityLevel: 'Rat cao',
        weightMaleMinKg: 25,
        weightMaleMaxKg: 30,
        weightFemaleMinKg: 20,
        weightFemaleMaxKg: 25,
        avgHeightCm: 60,
        lifespanYears: '12-14',
        description: 'Giong cho nang luong cao, phan xa nhanh va ben bi.',
        status: 'ACTIVE',
        temperament: ['Nhanh nhen', 'Ben bi', 'Canh giac', 'Trung thanh'],
    },
    {
        breedId: 4,
        breedName: 'Rottweiler',
        origin: 'Duc',
        sizeClassification: 'Lon',
        trainabilityLevel: 'Cao',
        weightMaleMinKg: 50,
        weightMaleMaxKg: 60,
        weightFemaleMinKg: 35,
        weightFemaleMaxKg: 48,
        avgHeightCm: 63,
        lifespanYears: '8-10',
        description: 'Giong cho manh me, tu tin va phu hop bao ve.',
        status: 'ACTIVE',
        temperament: ['Manh me', 'Tu tin', 'Bao ve', 'Diem tinh'],
    },
    {
        breedId: 5,
        breedName: 'Doberman',
        origin: 'Duc',
        sizeClassification: 'Lon',
        trainabilityLevel: 'Cao',
        weightMaleMinKg: 40,
        weightMaleMaxKg: 45,
        weightFemaleMinKg: 32,
        weightFemaleMaxKg: 35,
        avgHeightCm: 68,
        lifespanYears: '10-13',
        description: 'Giong cho canh gac co phan xa nhanh va ban nang bao ve tot.',
        status: 'ACTIVE',
        temperament: ['Thanh lich', 'Nhanh nhen', 'Trung thanh', 'Canh giac'],
    },
];

export const breedService = {
    getAll: async (page = 0, size = 20, search = ''): Promise<PageResponse<Breed>> => {
        try {
            const res = (await api.get('/breeds', {
                params: { page, size, search: search || undefined },
            })) as ApiResponse<PageResponse<Breed>>;
            return unwrapApiData(res);
        } catch (error: any) {
            if (error?.status) {
                throw error;
            }

            console.log('Using mock breed data because the API is unreachable.');
            return {
                content: MOCK_BREEDS,
                page: 0,
                size: MOCK_BREEDS.length,
                totalElements: MOCK_BREEDS.length,
                totalPages: 1,
            };
        }
    },

    getById: async (id: number): Promise<Breed> => {
        try {
            const res = (await api.get(`/breeds/${id}`)) as ApiResponse<Breed>;
            return unwrapApiData(res);
        } catch (error: any) {
            if (error?.status) {
                throw error;
            }

            const breed = MOCK_BREEDS.find((item) => item.breedId === id);
            if (breed) {
                return breed;
            }

            throw new Error('Khong tim thay giong cho');
        }
    },
};
