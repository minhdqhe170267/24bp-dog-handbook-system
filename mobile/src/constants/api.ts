import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Tự động lấy IP từ Expo — không cần đổi thủ công khi đổi mạng
const getBaseUrl = () => {
    // Expo Go trên điện thoại thật: lấy IP từ manifest
    const debuggerHost = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoGo?.debuggerHost;
    if (debuggerHost) {
        const ip = debuggerHost.split(':')[0];
        return `http://${ip}:8080/api/v1`;
    }
    // Android emulator
    if (Platform.OS === 'android') return 'http://10.0.2.2:8080/api/v1';
    // iOS simulator / web
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
