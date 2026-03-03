import api, { setToken } from './api';
import { LoginRequest, LoginResponse, UserInfo } from '../types/auth';

export const authService = {
    login: async (data: LoginRequest): Promise<LoginResponse> => {
        const res: any = await api.post('/auth/login', data);
        if (res.success && res.data) {
            setToken(res.data.token);
            return res.data;
        }
        throw new Error(res.message || 'Đăng nhập thất bại');
    },

    getMe: async (): Promise<UserInfo> => {
        const res: any = await api.get('/auth/me');
        return res.data;
    },

    logout: () => {
        setToken(null);
    },
};
