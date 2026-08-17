import { apiApp } from '../../../../api';
import { ApiResponse, PageResponse } from '../../../../types/api.type';
import {
    StreetAgentReportAgent,
    StreetAgentReportOverview,
    StreetAgentReportParams,
    StreetAgentReportStation,
    StreetAgentReportTableParams,
} from '../types/street-agent.type';

const BASE_URL = '/street-agent-reports';

export const getStreetAgentReportOverview = async (
    params: StreetAgentReportParams,
): Promise<ApiResponse<StreetAgentReportOverview>> => {
    const response = await apiApp.get(`${BASE_URL}/overview`, { params });
    return response.data;
};

export const getStreetAgentReportAgents = async (
    params: StreetAgentReportTableParams,
): Promise<ApiResponse<PageResponse<StreetAgentReportAgent>>> => {
    const response = await apiApp.get(`${BASE_URL}/agents`, { params });
    return response.data;
};

export const getStreetAgentReportStations = async (
    params: StreetAgentReportTableParams,
): Promise<ApiResponse<PageResponse<StreetAgentReportStation>>> => {
    const response = await apiApp.get(`${BASE_URL}/stations`, { params });
    return response.data;
};

export const exportStreetAgentReport = async (params: StreetAgentReportParams): Promise<void> => {
    const response = await apiApp.get(`${BASE_URL}/export`, {
        params,
        responseType: 'blob',
        skipGlobalErrorToast: true,
    } as Parameters<typeof apiApp.get>[1] & { skipGlobalErrorToast?: boolean });

    const blob = response.data as Blob;
    const contentType = String(blob.type || response.headers?.['content-type'] || '').toLowerCase();
    if (!contentType.includes('spreadsheetml')) {
        let message = 'Xuất báo cáo thất bại.';
        try {
            const body = JSON.parse(await blob.text());
            message = body?.message || message;
        } catch {
            // Keep the product-facing fallback for a non-JSON failed download.
        }
        throw new Error(message);
    }

    const contentDisposition = String(response.headers?.['content-disposition'] || '');
    const fileName = contentDisposition.match(/filename="?([^";]+)"?/i)?.[1]
        || `bao-cao-nguoi-ban-ve-${params.from.replaceAll('-', '')}-${params.to.replaceAll('-', '')}.xlsx`;
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
};
