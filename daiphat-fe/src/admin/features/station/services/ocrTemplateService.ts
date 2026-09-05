import { apiApp } from '../../../../api';
import { ApiResponse } from '../../../../types/api.type';

export type OcrTemplateFieldName =
    | 'stationName'
    | 'numbers'
    | 'serialNumber'
    | 'drawDate'
    | 'ticketType'
    | 'batchCode'
    | 'price';

export type OcrFieldDataType = 'STRING' | 'DATE' | 'NUMBER' | 'DECIMAL';

export type OcrNormalizedBoundingBox = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export type OcrTicketTemplate = {
    id: number;
    stationId: number;
    templateName: string;
    effectiveFrom?: string | null;
    effectiveTo?: string | null;
    sampleImageUrl?: string | null;
    isActive: boolean;
    isDefault: boolean;
    createdAt?: string;
    updatedAt?: string;
};

export type OcrFieldLayout = {
    id: number;
    templateId: number;
    fieldName: OcrTemplateFieldName;
    boundingBox: OcrNormalizedBoundingBox;
    dataType: OcrFieldDataType;
    isRequired: boolean;
    priority: number;
};

export type OcrTemplateDefaultReady = {
    ready: boolean;
    activeDefaultCount: number;
};

const BASE_URL = '/ocr-templates';

export const getOcrTemplateDefaultReady = async (): Promise<OcrTemplateDefaultReady> => {
    const response = await apiApp.get(`${BASE_URL}/default-ready`, {
        skipGlobalErrorToast: true,
    });
    return response.data?.data ?? { ready: false, activeDefaultCount: 0 };
};

export const listOcrTemplatesByStation = async (
    stationId: number
): Promise<OcrTicketTemplate[]> => {
    const response = await apiApp.get(BASE_URL, {
        params: { stationId },
        skipGlobalErrorToast: true,
    });
    return response.data?.data ?? [];
};

export const createOcrTemplate = async (payload: {
    stationId: number;
    templateName: string;
    isDefault?: boolean;
    isActive?: boolean;
    sampleImageUrl?: string;
}): Promise<ApiResponse<OcrTicketTemplate>> => {
    const response = await apiApp.post(BASE_URL, payload);
    return response.data;
};

export const setOcrTemplateDefault = async (
    id: number
): Promise<ApiResponse<OcrTicketTemplate>> => {
    const response = await apiApp.post(`${BASE_URL}/${id}/set-default`);
    return response.data;
};

export const uploadOcrTemplateSampleImage = async (
    id: number,
    file: File
): Promise<ApiResponse<OcrTicketTemplate>> => {
    const formData = new FormData();
    formData.append('file', file);
    // Do not set Content-Type manually — apiApp interceptor strips it so the
    // browser can attach multipart boundary (required for @RequestPart).
    // Longer timeout: Cloudinary + large ticket photos often exceed the default 15s.
    const response = await apiApp.post(`${BASE_URL}/${id}/sample-image`, formData, {
        timeout: 120_000,
        skipGlobalErrorToast: true,
    });
    return response.data;
};

export const listOcrFieldLayouts = async (
    templateId: number
): Promise<OcrFieldLayout[]> => {
    const response = await apiApp.get(`${BASE_URL}/${templateId}/field-layouts`, {
        skipGlobalErrorToast: true,
    });
    return response.data?.data ?? [];
};

export const createOcrFieldLayout = async (
    templateId: number,
    payload: {
        fieldName: OcrTemplateFieldName;
        boundingBox: OcrNormalizedBoundingBox;
        dataType?: OcrFieldDataType;
        isRequired?: boolean;
        priority?: number;
    }
): Promise<ApiResponse<OcrFieldLayout>> => {
    const response = await apiApp.post(`${BASE_URL}/${templateId}/field-layouts`, payload);
    return response.data;
};

export const updateOcrFieldLayout = async (
    templateId: number,
    layoutId: number,
    payload: {
        fieldName?: OcrTemplateFieldName;
        boundingBox?: OcrNormalizedBoundingBox;
        dataType?: OcrFieldDataType;
        isRequired?: boolean;
        priority?: number;
    }
): Promise<ApiResponse<OcrFieldLayout>> => {
    const response = await apiApp.put(
        `${BASE_URL}/${templateId}/field-layouts/${layoutId}`,
        payload
    );
    return response.data;
};

export const deleteOcrFieldLayout = async (
    templateId: number,
    layoutId: number
): Promise<ApiResponse<unknown>> => {
    const response = await apiApp.delete(`${BASE_URL}/${templateId}/field-layouts/${layoutId}`);
    return response.data;
};
