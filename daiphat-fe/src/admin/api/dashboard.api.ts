import { apiApp } from '../../api';
import Cookies from 'js-cookie';
import { mockEcommerceStats, mockAnalyticsStats, mockSystemStats } from '../data/dashboard';

const BASE_URL = '/admin/dashboard';

const withAuth = () => {
    const token = Cookies.get(STORAGE_KEYS.TOKEN);
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

export const getEcommerceStats = async () => {
    return {
        success: true,
        data: mockEcommerceStats
    };
};

export const getAnalyticsStats = async () => {
    return {
        success: true,
        data: mockAnalyticsStats
    };
};

export const getSystemStats = async () => {
    return {
        success: true,
        data: mockSystemStats
    };
};

// Statistics sub-pages (redirecting to mock data for stability)

export const getDetailedTicketServiceStats = async (_startDate?: string, _endDate?: string) => {
    return {
        success: true,
        data: mockEcommerceStats
    };
};

export const getDetailedOrderStats = async (_startDate?: string, _endDate?: string) => {
    return {
        success: true,
        data: mockEcommerceStats
    };
};

export const getDetailedStaffStats = async (_startDate?: string, _endDate?: string) => {
    return {
        success: true,
        data: mockEcommerceStats
    };
};

// Real API calls for dynamic data

export const getStaffingStatus = async (date?: string) => {
    const response = await apiApp.get(`${BASE_URL}/staffing-status`, {
        ...withAuth(),
        params: { date }
    });
    return response.data;
};

export const getDetailedBoardingStats = async () => {
    const response = await apiApp.get(`${BASE_URL}/detailed-boarding-stats`, withAuth());
    return response.data;
};
