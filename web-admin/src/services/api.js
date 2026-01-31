import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

api.interceptors.request.use(
  (config) => {
    console.info("[API Request]", config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error("[API Request Error]", error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.info("[API Response]", response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error("[API Response Error]", error);
    return Promise.reject(error);
  }
);

export default api;
