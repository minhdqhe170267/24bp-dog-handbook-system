import axios from 'axios';
import { API_CONFIG } from '../constants/api';

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message: string;
    timestamp: string;
}

export interface PageResponse<T> {
    content: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
}

export interface ApiError {
    status?: number;
    data?: unknown;
    message: string;
    errorCode?: string;
}

export const unwrapApiData = <T>(response: ApiResponse<T>): T => response.data;

export const isUnauthorizedError = (error: unknown): error is ApiError =>
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    (error as ApiError).status === 401;

const apiClient = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    timeout: API_CONFIG.TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Token management (in-memory)
let authToken: string | null = null;
let unauthorizedCleanupPromise: Promise<void> | null = null;

export const setToken = (token: string | null) => {
    authToken = token;
};

export const getToken = () => authToken;

const clearExpiredSession = async (): Promise<void> => {
    if (!unauthorizedCleanupPromise) {
        unauthorizedCleanupPromise = (async () => {
            try {
                const { clearStoredSession } = await import('../stores/authStore');
                await clearStoredSession();
            } catch (cleanupError) {
                console.warn('[AUTH] Failed to clear expired session', cleanupError);
                setToken(null);
            } finally {
                unauthorizedCleanupPromise = null;
            }
        })();
    }

    await unauthorizedCleanupPromise;
};

// Request interceptor: attach token to every request
// Prefers in-memory token (fast), falls back to SecureStore (persisted)
apiClient.interceptors.request.use(
    async (config) => {
        let token = authToken;

        if (!token) {
            try {
                const SecureStore = await import('expo-secure-store');
                token = await SecureStore.getItemAsync('auth_token');
            } catch {
                // SecureStore unavailable (e.g. tests)
            }
        }

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor: keep the ApiResponse envelope and normalize errors.
apiClient.interceptors.response.use(
    (response) => {
        // Server wraps response in ApiResponse { success, message, data }.
        return response.data;
    },
    async (error) => {
        if (error.response?.status === 401) {
            await clearExpiredSession();
        }

        const normalizedError: ApiError = {
            status: error.response?.status,
            data: error.response?.data,
            errorCode: error.response?.data?.errorCode,
            message:
                (typeof error.response?.data === 'string' && error.response.data) ||
                error.response?.data?.message ||
                error.message ||
                'Request failed',
        };

        return Promise.reject(normalizedError);
    }
);

export default apiClient;
