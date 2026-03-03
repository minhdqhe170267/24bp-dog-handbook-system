import api from './api';
import { Breed } from '../types/breed';

// ===== MOCK DATA — Xóa khi có backend =====
const MOCK_BREEDS: Breed[] = [
    {
        breedId: 1,
        breedName: 'Chó Becgie Đức',
        origin: 'Đức',
        sizeClassification: 'Lớn',
        trainabilityLevel: 'Rất cao',
        weightMaleMinKg: 30,
        weightMaleMaxKg: 40,
        weightFemaleMinKg: 22,
        weightFemaleMaxKg: 32,
        avgHeightCm: 62,
        lifespanYears: '9–13',
        description: 'Chó Becgie Đức (German Shepherd) là giống chó nghiệp vụ phổ biến nhất thế giới, được sử dụng rộng rãi trong quân đội, công an và cứu hộ. Giống chó này nổi tiếng với trí thông minh, lòng trung thành và khả năng huấn luyện xuất sắc.',
        status: 'ACTIVE',
        temperament: ['Trung thành', 'Thông minh', 'Dũng cảm', 'Tự tin'],
    },
    {
        breedId: 2,
        breedName: 'Labrador Retriever',
        origin: 'Canada',
        sizeClassification: 'Lớn',
        trainabilityLevel: 'Cao',
        weightMaleMinKg: 29,
        weightMaleMaxKg: 36,
        weightFemaleMinKg: 25,
        weightFemaleMaxKg: 32,
        avgHeightCm: 57,
        lifespanYears: '10–12',
        description: 'Labrador Retriever là giống chó thân thiện, thông minh và dễ huấn luyện. Thường được sử dụng trong tìm kiếm cứu nạn, phát hiện ma túy và hỗ trợ người khuyết tật.',
        status: 'ACTIVE',
        temperament: ['Thân thiện', 'Hiền lành', 'Năng động', 'Kiên nhẫn'],
    },
    {
        breedId: 3,
        breedName: 'Malinois Bỉ',
        origin: 'Bỉ',
        sizeClassification: 'Trung bình-Lớn',
        trainabilityLevel: 'Rất cao',
        weightMaleMinKg: 25,
        weightMaleMaxKg: 30,
        weightFemaleMinKg: 20,
        weightFemaleMaxKg: 25,
        avgHeightCm: 60,
        lifespanYears: '12–14',
        description: 'Malinois Bỉ là giống chó nghiệp vụ hàng đầu, nổi tiếng với năng lượng dồi dào, phản xạ nhanh và khả năng làm việc bền bỉ. Được ưa chuộng trong lực lượng đặc nhiệm và quân đội nhiều nước.',
        status: 'ACTIVE',
        temperament: ['Nhanh nhẹn', 'Bền bỉ', 'Cảnh giác', 'Trung thành'],
    },
    {
        breedId: 4,
        breedName: 'Rottweiler',
        origin: 'Đức',
        sizeClassification: 'Lớn',
        trainabilityLevel: 'Cao',
        weightMaleMinKg: 50,
        weightMaleMaxKg: 60,
        weightFemaleMinKg: 35,
        weightFemaleMaxKg: 48,
        avgHeightCm: 63,
        lifespanYears: '8–10',
        description: 'Rottweiler là giống chó mạnh mẽ, tự tin và trung thành. Thường được sử dụng trong canh gác, bảo vệ và kéo xe. Cần được huấn luyện từ nhỏ với chủ nhân kinh nghiệm.',
        status: 'ACTIVE',
        temperament: ['Mạnh mẽ', 'Tự tin', 'Bảo vệ', 'Điềm tĩnh'],
    },
    {
        breedId: 5,
        breedName: 'Doberman',
        origin: 'Đức',
        sizeClassification: 'Lớn',
        trainabilityLevel: 'Cao',
        weightMaleMinKg: 40,
        weightMaleMaxKg: 45,
        weightFemaleMinKg: 32,
        weightFemaleMaxKg: 35,
        avgHeightCm: 68,
        lifespanYears: '10–13',
        description: 'Doberman là giống chó thanh lịch, nhanh nhẹn và cực kỳ trung thành. Được biết đến như giống chó canh gác hoàn hảo với khả năng phản ứng nhanh và bản năng bảo vệ mạnh mẽ.',
        status: 'ACTIVE',
        temperament: ['Thanh lịch', 'Nhanh nhẹn', 'Trung thành', 'Cảnh giác'],
    },
];
// ===== END MOCK DATA =====

export const breedService = {
    getAll: async (page = 0, size = 20, search = ''): Promise<any> => {
        try {
            const res: any = await api.get('/breeds', { params: { page, size, search } });
            return res.data;
        } catch {
            console.log('⚠️ Dùng mock data (chưa kết nối backend)');
            return { content: MOCK_BREEDS, totalElements: MOCK_BREEDS.length, totalPages: 1 };
        }
    },

    getById: async (id: number): Promise<Breed> => {
        try {
            const res: any = await api.get('/breeds/' + id);
            return res.data;
        } catch {
            const breed = MOCK_BREEDS.find((b) => b.breedId === id);
            if (breed) return breed;
            throw new Error('Không tìm thấy giống chó');
        }
    },
};
