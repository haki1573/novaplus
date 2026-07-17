import axios from 'axios';

const API_URL =
  import.meta.env.VITE_API_URL ||
  'https://hb-api-ryno.onrender.com';

export const api = axios.create({
  baseURL: API_URL,
});

let redirectingToLogin = false;

function clearExpiredSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');

  sessionStorage.setItem(
    'sessionExpired',
    'true',
  );
}

api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem(
        'token',
      );

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },
);

api.interceptors.response.use(
  (response) => response,

  (error) => {
    const status =
      error?.response?.status;

    const requestUrl =
      String(
        error?.config?.url || '',
      );

    const isLoginRequest =
      requestUrl.includes(
        '/auth/login',
      );

    const isSetupRequest =
      requestUrl.includes(
        '/setup/status',
      );

    if (
      status === 401 &&
      !isLoginRequest &&
      !isSetupRequest &&
      !redirectingToLogin
    ) {
      redirectingToLogin =
        true;

      clearExpiredSession();

      window.location.replace(
        '/',
      );
    }

    return Promise.reject(
      error,
    );
  },
);
