import { useQuery } from '@tanstack/react-query';
import { apiApp } from '../../api';

export const getMyReviews = async () => {
    const response = await apiApp.get('/api/v1/client/review/my-reviews');
    return response.data;
};

export const useMyReviews = () => {
    return useQuery({
        queryKey: ['my-reviews'],
        queryFn: getMyReviews,
    });
};
