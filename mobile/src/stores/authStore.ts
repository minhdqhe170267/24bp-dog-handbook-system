import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { authService } from '../services/authService';
import { userSessionDBService } from '../database/services/userSessionDBService';
import { UserInfo, LoginRequest } from '../types/auth';
import { useNetworkStore } from './networkStore';

interface AuthState {
    user: UserInfo | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isOfflineMode: boolean;
    error: string | null;
    login: (data: LoginRequest) => Promise<boolean>;
    logout: () => Promise<void>;
    clearError: () => void;
    devLogin: () => void;
    hydrateAuth: () => Promise<void>;
}

const AUTH_TOKEN_KEY = 'auth_token';

const hashPassword = async (password: string): Promise<string> => {
    return Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password,
    );
};

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isOfflineMode: false,
    error: null,

    login: async (data) => {
        set({ isLoading: true, error: null });

        const { isConnected, isInternetReachable } = useNetworkStore.getState();
        const isOnline = isConnected && isInternetReachable !== false;

        if (isOnline) {
            // --- ONLINE LOGIN ---
            try {
                const response = await authService.login(data);
                const { token, expiresIn, user } = response;

                await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);

                const passwordHash = await hashPassword(data.password);
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
                    password_hash: passwordHash,
                });

                console.log('[AUTH] Online login success, session persisted');
                set({ user, isAuthenticated: true, isLoading: false, isOfflineMode: false });
                return true;
            } catch (err: any) {
                set({ isLoading: false, error: err?.message || 'Dang nhap that bai' });
                return false;
            }
        } else {
            // --- OFFLINE LOGIN ---
            try {
                const session = await userSessionDBService.get();

                if (!session || !session.user_id || !session.password_hash) {
                    set({
                        isLoading: false,
                        error: 'Khong co ket noi mang. Ban can dang nhap truc tuyen it nhat mot lan truoc.',
                    });
                    return false;
                }

                if (data.username !== session.username) {
                    set({
                        isLoading: false,
                        error: 'Ten dang nhap khong khop voi tai khoan da luu ngoai tuyen.',
                    });
                    return false;
                }

                const inputHash = await hashPassword(data.password);
                if (inputHash !== session.password_hash) {
                    set({
                        isLoading: false,
                        error: 'Mat khau khong dung.',
                    });
                    return false;
                }

                // Restore token to memory for API interceptor (will fail on actual requests but needed for structure)
                if (session.token) {
                    const { setToken } = await import('../services/api');
                    setToken(session.token);
                }

                const user: UserInfo = {
                    userId: session.user_id,
                    username: session.username ?? '',
                    fullName: session.full_name ?? '',
                    role: session.role ?? 'TRAINER',
                    militaryRank: session.military_rank ?? undefined,
                    unit: session.unit ?? undefined,
                };

                console.log('[AUTH] Offline login success');
                set({ user, isAuthenticated: true, isLoading: false, isOfflineMode: true });
                return true;
            } catch (err: any) {
                console.error('[AUTH] Offline login failed:', err);
                set({
                    isLoading: false,
                    error: 'Dang nhap ngoai tuyen that bai. Vui long thu lai.',
                });
                return false;
            }
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
                militaryRank: 'Thuong uy',
                unit: 'Don vi K9',
            },
            isAuthenticated: true,
            isOfflineMode: false,
            error: null,
        });
    },

    hydrateAuth: async () => {
        try {
            const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
            const session = await userSessionDBService.get();

            if (token && session && session.user_id) {
                const { setToken } = await import('../services/api');
                setToken(token);

                const { isConnected, isInternetReachable } = useNetworkStore.getState();
                const isOnline = isConnected && isInternetReachable !== false;

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
                    isOfflineMode: !isOnline,
                });
                console.log(`[AUTH] Session restored (${isOnline ? 'online' : 'offline'})`);
            }
        } catch (err) {
            console.error('[AUTH] Failed to hydrate session:', err);
        }
    },
}));

export async function clearStoredSession(): Promise<void> {
    authService.logout();

    // Only clear tokens, keep user info + password_hash for offline login
    await Promise.allSettled([
        SecureStore.deleteItemAsync(AUTH_TOKEN_KEY),
        userSessionDBService.clearTokens(),
    ]);

    console.log('[AUTH] Tokens cleared (session kept for offline login)');
    useAuthStore.setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isOfflineMode: false,
        error: null,
    });
}
