import { create } from 'zustand';
import { authService } from '../services/authService';
import { UserInfo, LoginRequest } from '../types/auth';

interface AuthState {
    user: UserInfo | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    login: (data: LoginRequest) => Promise<boolean>;
    logout: () => void;
    clearError: () => void;
    devLogin: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,

    login: async (data) => {
        set({ isLoading: true, error: null });
        try {
            const response = await authService.login(data);
            set({ user: response.user, isAuthenticated: true, isLoading: false });
            return true;
        } catch (err: any) {
            set({ isLoading: false, error: err?.message || 'Đăng nhập thất bại' });
            return false;
        }
    },

    logout: () => {
        authService.logout();
        set({ user: null, isAuthenticated: false, error: null });
    },

    clearError: () => set({ error: null }),

    devLogin: () => {
        set({
            user: {
                userId: 0,
                username: 'dev_user',
                fullName: 'Dev Tester',
                role: 'TRAINER',
                militaryRank: 'Thượng úy',
                unit: 'Đơn vị K9',
            },
            isAuthenticated: true,
            error: null,
        });
    },
}));
