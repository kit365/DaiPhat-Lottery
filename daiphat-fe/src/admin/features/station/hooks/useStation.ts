import {
    useQuery,
    useMutation,
    useQueryClient,
    keepPreviousData,
} from '@tanstack/react-query';
import {
    getStations,
    getStationById,
    createStation,
    updateStation,
    deleteStation,
    getStationsToday,
    getStationsTomorrow,
    getStationsByDrawDate,
    uploadStationImage,
    previewSyncStations,
    confirmSyncStations,
} from '../services/stationService';
import { QUERY_KEYS } from '../constants/queryKeys';
import {
    StationQueryParams,
    UpdateStationRequest,
} from '../types/station.type';

export const useStations = (params?: StationQueryParams) => {
    return useQuery({
        queryKey: [QUERY_KEYS.STATIONS, params],
        queryFn: () => getStations(params),
        placeholderData: keepPreviousData,
    });
};

export const useStationDetail = (id?: string | number) => {
    return useQuery({
        queryKey: [QUERY_KEYS.STATION_DETAIL, id],
        queryFn: () => getStationById(id!),
        enabled: !!id,
        select: (res) => {
            const data = res.data;
            if (!data) return null;
            return {
                ...data,
                id: data._id ?? data.id,
            };
        },
    });
};

export const useCreateStation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createStation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STATIONS] });
        },
    });
};

export const useUpdateStation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            id,
            data,
        }: {
            id: string | number;
            data: UpdateStationRequest;
        }) => updateStation(id, data),
        onSuccess: (response, variables) => {
            if (response.success) {
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STATIONS] });
                queryClient.invalidateQueries({
                    queryKey: [QUERY_KEYS.STATION_DETAIL, variables.id],
                });
            }
        },
    });
};

export const useDeleteStation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteStation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STATIONS] });
        },
    });
};

export const useStationsToday = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.STATIONS_TODAY],
        queryFn: () => getStationsToday(),
    });
};

export const useStationsTomorrow = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.STATIONS_TOMORROW],
        queryFn: () => getStationsTomorrow(),
    });
};

export const useStationsByDrawDate = (drawDate?: string | string[]) => {
    const drawDates = Array.isArray(drawDate)
        ? drawDate.filter(Boolean)
        : drawDate
          ? [drawDate]
          : [];

    return useQuery({
        queryKey: [QUERY_KEYS.STATIONS_BY_DRAW_DATE, drawDates],
        queryFn: () => getStationsByDrawDate(drawDates),
        enabled: drawDates.length > 0,
    });
};

export const useUploadStationImage = () => {
    return useMutation({
        mutationFn: ({ id, file }: { id: string | number; file: File }) =>
            uploadStationImage(id, file),
    });
};

export const usePreviewSyncStations = () => {
    return useMutation({
        mutationFn: previewSyncStations,
    });
};

export const useConfirmSyncStations = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: confirmSyncStations,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STATIONS] });
        },
    });
};
