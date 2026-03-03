import axios from 'axios';
import { API_CONFIG } from '../constants/api';

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

// Response interceptor: unwrap data & handle 401
apiClient.interceptors.response.use(
    (response) => {
        // Server wraps response in ApiResponse { success, message, data }
        return response.data;
    },
    (error) => {
        if (error.response?.status === 401) {
            setToken(null);
        }
        return Promise.reject(error.response?.data || error.message);
    }
);

export default apiClient;
