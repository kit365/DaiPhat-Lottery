import { apiApp } from '../../../../api';
import { withAuthHeaders } from '../../../../api/authHeaders';
import { API_PREFIX, API_VERSION } from '../../../../api/api.constants';
import { ROUTES } from '../../../constants/routes';
import { ApiResponse, PageResponse } from '../../../../types/api.type';
import {
    DailySalesReport,
    DailySalesReportListParams,
    StreetAgentProfile,
    CreateStreetAgentProfilePayload,
    StreetAgentQueryParams,
    VendorConfidence,
    UpdateApprovedDailyCapPayload,
} from '../types/street-agent.type';

const BASE_URL = '/street-agent-profiles';

export const getStreetAgentProfiles = async (
    params?: StreetAgentQueryParams
): Promise<ApiResponse<PageResponse<StreetAgentProfile>>> => {
    const response = await apiApp.get(BASE_URL, { params });
    return response.data;
};

export const getStreetAgentProfileById = async (
    id: number | string
): Promise<ApiResponse<StreetAgentProfile>> => {
    const response = await apiApp.get(`${BASE_URL}/${id}`);
    return response.data;
};

export const getStreetAgentConfidence = async (
    id: number | string
): Promise<ApiResponse<VendorConfidence>> => {
    const response = await apiApp.get(`${BASE_URL}/${id}/confidence`);
    return response.data;
};

export const listStreetAgentDailySalesReports = async (
    id: number | string,
    params?: DailySalesReportListParams
): Promise<ApiResponse<PageResponse<DailySalesReport>>> => {
    const response = await apiApp.get(`${BASE_URL}/${id}/daily-sales-reports`, {
        params: {
            page: params?.page ?? 1,
            limit: params?.limit ?? 10,
        },
    });
    return response.data;
};

export const getDailySalesReportById = async (
    id: number | string
): Promise<ApiResponse<DailySalesReport>> => {
    const response = await apiApp.get(`/daily-sales-reports/${id}`);
    return response.data;
};

export const createStreetAgentProfile = async (
    data: CreateStreetAgentProfilePayload
): Promise<ApiResponse<StreetAgentProfile>> => {
    const response = await apiApp.post(BASE_URL, data);
    return response.data;
};

export const updateStreetAgentProfile = async (
    id: number | string,
    data: Record<string, unknown>
): Promise<ApiResponse<StreetAgentProfile>> => {
    const response = await apiApp.put(`${BASE_URL}/${id}`, data);
    return response.data;
};

export const updateApprovedDailyCap = async (
    id: number | string,
    data: UpdateApprovedDailyCapPayload
): Promise<ApiResponse<StreetAgentProfile>> => {
    const response = await apiApp.patch(`${BASE_URL}/${id}/approved-daily-cap`, data);
    return response.data;
};

/** Same-origin path for printable contract PDF API. */
export const getStreetAgentContractPdfUrl = (id: number | string): string =>
    `${API_PREFIX}${API_VERSION}${BASE_URL}/${id}/contract/pdf`;

/** @deprecated use getStreetAgentContractPdfUrl */
export const getStreetAgentContractPrintUrl = getStreetAgentContractPdfUrl;

/** Admin page that embeds the generated PDF (clean URL in address bar). */
export const getStreetAgentContractViewerPath = (id: number | string): string =>
    ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.CONTRACT_PDF(id);

/**
 * Opens generated contract PDF in a new tab.
 * Fetches via axios (Authorization) then blob URL — avoids Next proxy cookie-only auth
 * which often returns JSON errors and Chrome shows "Failed to load PDF document".
 */
export const openStreetAgentContractPrint = async (id: number | string): Promise<void> => {
    const response = await apiApp.get(`${BASE_URL}/${id}/contract/pdf`, {
        ...withAuthHeaders(),
        responseType: 'blob',
        skipGlobalErrorToast: true,
    } as Parameters<typeof apiApp.get>[1] & { skipGlobalErrorToast?: boolean });

    const blob = response.data as Blob;
    const contentType = String(blob.type || response.headers?.['content-type'] || '').toLowerCase();

    if (!contentType.includes('pdf')) {
        let message = 'Không mở được hợp đồng PDF';
        try {
            const text = await blob.text();
            const parsed = JSON.parse(text);
            if (parsed?.message) message = parsed.message;
        } catch {
            // keep default
        }
        throw new Error(message);
    }

    const objectUrl = URL.createObjectURL(blob);
    const opened = window.open(objectUrl, '_blank');
    if (opened) {
        opened.opener = null;
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
        return;
    }

    // Popup blocked — download instead of hijacking the current tab.
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = `hop-dong-dai-ly-${id}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
};

/** Create-page resume URL for PENDING profiles awaiting signed contract upload. */
export const getStreetAgentOnboardingResumePath = (id: number | string): string =>
    `${ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.CREATE}?resumeId=${id}`;

export const uploadStreetAgentSignedContract = async (
    id: number | string,
    file: File
): Promise<ApiResponse<StreetAgentProfile>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiApp.post(`${BASE_URL}/${id}/contract/signed-document`, formData);
    return response.data;
};
