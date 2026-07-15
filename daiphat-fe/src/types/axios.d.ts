import 'axios';

declare module 'axios' {
    interface AxiosRequestConfig {
        skipGlobalErrorToast?: boolean;
        _retry?: boolean;
    }
}
