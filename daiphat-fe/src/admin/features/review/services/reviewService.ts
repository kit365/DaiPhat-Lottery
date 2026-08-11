import { apiApp } from '@/api';

/** Placeholder — BE chưa có endpoint list review. */
const MOCK_REVIEWS = [
    {
        _id: 'R1',
        targetName: 'XS TP.HCM',
        customerName: 'Nguyễn Văn A',
        rating: 5,
        comment: 'Mua vé nhanh, giao đúng hạn.',
        status: 'approved',
        createdAt: new Date().toISOString(),
    },
    {
        _id: 'R2',
        targetName: 'Vietlott 6/45',
        customerName: 'Trần Thị B',
        rating: 4,
        comment: 'Dịch vụ ổn, hỗ trợ nhiệt tình.',
        status: 'pending',
        createdAt: new Date(Date.now() - 3_600_000).toISOString(),
    },
] as const;

export const getReviews = async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
}) => {
    const list = [...MOCK_REVIEWS];
    return {
        success: true,
        data: {
            recordList: list,
            pagination: {
                totalRecords: list.length,
                totalPages: 1,
                currentPage: params?.page || 1,
                limit: params?.limit || 10,
            },
            statusCounts: {
                all: list.length,
                pending: list.filter((r) => r.status === 'pending').length,
                approved: list.filter((r) => r.status === 'approved').length,
                rejected: list.filter((r) => (r.status as string) === 'rejected').length,
            },
        },
    };
};

export const changeReviewStatus = async (id: string, status: string) => {
    const response = await apiApp.patch(`/admin/review/change-status/${id}`, { status });
    return response.data;
};

export const deleteReview = async (id: string) => {
    const response = await apiApp.delete(`/admin/review/delete/${id}`);
    return response.data;
};
