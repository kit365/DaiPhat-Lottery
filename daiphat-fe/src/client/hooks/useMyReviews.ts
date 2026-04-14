import { useQuery } from '@tanstack/react-query';
import { apiApp } from '../../api';

export const getMyReviews = async () => {
    const response = await apiApp.get('/client/review/my-reviews');
    return response.data;
};

export const useMyReviews = () => {
    return useQuery({
        queryKey: ['my-reviews'],
        enabled: false, retry: false, queryFn: getMyReviews,
    });
};
