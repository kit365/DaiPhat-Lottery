const AUTH_ROOT = "/auth";
const USER_ROOT = "/users";

export const AUTH_ENDPOINTS = {
    login: `${AUTH_ROOT}/login`,
    google: `${AUTH_ROOT}/google`,
    changePassword: `${AUTH_ROOT}/change-password`,
    register: `${AUTH_ROOT}/register`,
    resendVerification: `${AUTH_ROOT}/register/resend-verification`,
    logout: `${AUTH_ROOT}/logout`,
    passwordPolicy: `${AUTH_ROOT}/password-policy`,
    forgotPasswordRequest: `${AUTH_ROOT}/forgot-password/request`,
    forgotPasswordVerify: `${AUTH_ROOT}/forgot-password/verify`,
    forgotPasswordReset: `${AUTH_ROOT}/forgot-password/reset`,
    verifyEmail: `${AUTH_ROOT}/verify-email`,
};

export const USER_ENDPOINTS = {
    currentUser: `${USER_ROOT}/me`,
    currentUserAvatar: `${USER_ROOT}/me/avatar`,
    setupProfile: `${USER_ROOT}/setup-profile`,
    acceptInvite: `${USER_ROOT}/accept-invite`,
};
