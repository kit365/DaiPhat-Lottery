import { apiApp } from '@/api';

const BASE_URL = '/admin/shifts';

const MOCK_SHIFTS = [
    { _id: 'SH1', name: 'Ca sáng', startTime: '08:00', endTime: '12:00' },
    { _id: 'SH2', name: 'Ca chiều', startTime: '13:00', endTime: '17:00' },
    { _id: 'SH3', name: 'Ca tối', startTime: '18:00', endTime: '22:00' },
];

export const getShifts = async (params?: { page?: number; limit?: number }) => ({
    success: true,
    data: {
        recordList: MOCK_SHIFTS,
        pagination: {
            totalRecords: MOCK_SHIFTS.length,
            totalPages: 1,
            currentPage: params?.page || 1,
            limit: params?.limit || 10,
        },
    },
});

export const getShiftDetail = async (id: string) => ({
    success: true,
    data: MOCK_SHIFTS.find((s) => s._id === id) ?? { _id: id, name: 'Ca sáng', startTime: '08:00', endTime: '12:00' },
});

export const createShift = async (data: Record<string, unknown>) => {
    const response = await apiApp.post(BASE_URL, data);
    return response.data;
};

export const updateShift = async (id: string, data: Record<string, unknown>) => {
    const response = await apiApp.patch(`${BASE_URL}/${id}`, data);
    return response.data;
};

export const deleteShift = async (id: string) => {
    const response = await apiApp.delete(`${BASE_URL}/${id}`);
    return response.data;
};
