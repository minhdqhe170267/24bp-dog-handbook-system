import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { authService } from '../services/authService';
import { userSessionDBService } from '../database/services/userSessionDBService';
import { UserInfo, LoginRequest } from '../types/auth';

interface AuthState {
    user: UserInfo | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    login: (data: LoginRequest) => Promise<boolean>;
    logout: () => Promise<void>;
    clearError: () => void;
    devLogin: () => void;
    hydrateAuth: () => Promise<void>;
}

const AUTH_TOKEN_KEY = 'auth_token';

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,

    login: async (data) => {
        set({ isLoading: true, error: null });
        try {
            const response = await authService.login(data);
            const { token, expiresIn, user } = response;

            // Persist token in SecureStore (encrypted)
            await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);

            // Persist user info in SQLite user_session
            const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
            await userSessionDBService.save({
                user_id: user.userId,
                username: user.username,
                full_name: user.fullName,
                role: user.role as any,
                military_rank: user.militaryRank ?? null,
                unit: user.unit ?? null,
                token: token,
                refresh_token: null,
                token_expires_at: expiresAt,
            });

            console.log('[AUTH] Session persisted to SecureStore + SQLite');
            set({ user, isAuthenticated: true, isLoading: false });
            return true;
        } catch (err: any) {
            set({ isLoading: false, error: err?.message || 'Đăng nhập thất bại' });
            return false;
        }
    },

    logout: async () => {
        await clearStoredSession();
        set({ error: null });
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

    hydrateAuth: async () => {
        try {
            const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
            const session = await userSessionDBService.get();

            if (token && session && session.user_id) {
                // Restore in-memory token for API interceptor
                const { setToken } = await import('../services/api');
                setToken(token);

                set({
                    user: {
                        userId: session.user_id,
                        username: session.username ?? '',
                        fullName: session.full_name ?? '',
                        role: session.role ?? 'TRAINER',
                        militaryRank: session.military_rank ?? undefined,
                        unit: session.unit ?? undefined,
                    },
                    isAuthenticated: true,
                });
                console.log('[AUTH] Session restored from local storage');
            }
        } catch (err) {
            console.error('[AUTH] Failed to hydrate session:', err);
        }
    },
}));

export async function clearStoredSession(): Promise<void> {
    authService.logout();

    await Promise.allSettled([
        SecureStore.deleteItemAsync(AUTH_TOKEN_KEY),
        userSessionDBService.clear(),
    ]);

    console.log('[AUTH] Session cleared from SecureStore + SQLite');
    useAuthStore.setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
    });
}
