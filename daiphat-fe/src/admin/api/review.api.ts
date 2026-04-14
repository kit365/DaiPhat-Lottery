import { apiApp } from "../../api";

import { mockReviews } from '../data/reviews';

export const getReviews = async (params: any) => {
    return {
        success: true,
        data: {
            recordList: mockReviews,
            pagination: {
                totalRecords: mockReviews.length,
                totalPages: 1,
                currentPage: params?.page || 1,
                limit: params?.limit || 10
            },
            statusCounts: {
                all: mockReviews.length,
                pending: mockReviews.filter(r => r.status === 'pending').length,
                approved: mockReviews.filter(r => r.status === 'approved').length,
                rejected: mockReviews.filter(r => r.status === 'rejected').length,
            }
        }
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
