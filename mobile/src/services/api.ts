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

export const unwrapApiData = <T>(response: ApiResponse<T>): T => response.data;

const apiClient = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    timeout: API_CONFIG.TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Token management (in-memory)
let authToken: string | null = null;

export const setToken = (token: string | null) => {
    authToken = token;
};

export const getToken = () => authToken;

// Request interceptor: attach token to every request
apiClient.interceptors.request.use(
    (config) => {
        if (authToken) {
            config.headers.Authorization = `Bearer ${authToken}`;
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
    (error) => {
        if (error.response?.status === 401) {
            setToken(null);
        }
        return Promise.reject({
            status: error.response?.status,
            data: error.response?.data,
            message:
                (typeof error.response?.data === 'string' && error.response.data) ||
                error.response?.data?.message ||
                error.message ||
                'Request failed',
        });
    }
);

export default apiClient;
