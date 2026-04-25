import Constants from 'expo-constants';
import { Platform } from 'react-native';

const normalizeBaseUrl = (value?: string | null) => {
    const trimmed = value?.trim();
    if (!trimmed) return null;
    return trimmed.replace(/\/+$/, '');
};

const getBaseUrl = () => {
    const envBaseUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
    if (envBaseUrl) {
        return envBaseUrl;
    }

    const debuggerHost = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoGo?.debuggerHost;
    if (debuggerHost) {
        const ip = debuggerHost.split(':')[0];
        return `http://${ip}:8080/api/v1`;
    }

    if (Platform.OS === 'android') return 'http://10.0.2.2:8080/api/v1';

    return 'http://localhost:8080/api/v1';
};

const BASE_URL = getBaseUrl();

export const API_CONFIG = {
    BASE_URL,
    TIMEOUT: 10000,
};

export const STORAGE_KEYS = {
    TOKEN: 'auth_token',
    USER: 'auth_user',
};
