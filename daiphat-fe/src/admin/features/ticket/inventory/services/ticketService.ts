import { apiApp } from '../../../../../api';
import { withAuthHeaders } from '../../../../../api/authHeaders';
import { ApiResponse } from '../../../../../types/api.type';

const BASE_URL = `/lottery-tickets`;

/** Header auth dùng chung — prefers in-memory store token over cookie. */
const withAuth = () => withAuthHeaders();


export const getTickets = async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiApp.get(BASE_URL, { 
        params: {
            page: params?.page || 1,
            size: params?.limit || 10,
            stationId: params?.stationId,
            stationIds: params?.stationIds,
            status: params?.status,
            drawDate: Array.isArray(params?.drawDate) ? params.drawDate.join(',') : params?.drawDate,
            drawDateFrom: params?.drawDateFrom,
            drawDateTo: params?.drawDateTo,
            importBatchLineId: params?.importBatchLineId,
            search: params?.search,
            sortBy: params?.sortBy,
            direction: params?.direction,
            balanceByStation: params?.balanceByStation,
        },
        paramsSerializer: {
            indexes: null,
        },
        ...withAuth() 
    });
    
    const result = response.data?.data;
    
    // Map BE response to match FE expectations (giữ status uppercase từ BE)
    const recordList = (result?.recordList || []).map((item: any) => ({
        ...item,
        _id: item.id,
        avatar: item.ticketImg,
        status: item.status || 'DRAFT',
    }));

    return {
        success: true,
        message: response.data?.message || "",
        timestamp: response.data?.timestamp || new Date().toISOString(),
        data: {
            recordList,
            pagination: result?.pagination || {
                totalRecords: recordList.length,
                totalPages: 1,
                currentPage: params?.page || 1,
                limit: params?.limit || 10
            },
        }
    } as any;
};

/** Tạo vé mới (một dãy số) */
export const createTicket = async (
    data: any,
    options?: { skipGlobalErrorToast?: boolean }
): Promise<ApiResponse<any>> => {
    const response = await apiApp.post(BASE_URL, data, {
        ...withAuth(),
        skipGlobalErrorToast: options?.skipGlobalErrorToast,
    } as any);
    return response.data;
};

/** Nhập nhiều dãy số trong cùng một dòng phiếu nhập lô */
export const bulkCreateTickets = async (
    data: {
        importBatchLineId: number;
        stationId: number | string;
        drawDate?: string;
        tickets: Array<{
            numbers: string;
            serials: Array<{ serialNumber: string; ticketImg?: string }>;
        }>;
        isAutoSave?: boolean;
    },
    options?: { skipGlobalErrorToast?: boolean }
): Promise<ApiResponse<any>> => {
    const response = await apiApp.post(`${BASE_URL}/bulk-import`, data, {
        ...withAuth(),
        skipGlobalErrorToast: options?.skipGlobalErrorToast,
    } as any);
    return response.data;
};

/** Lấy chi tiết vé cho trang Edit */
export const getTicketById = async (id: string | number): Promise<ApiResponse<any>> => {
    const response = await apiApp.get(`${BASE_URL}/${id}`, withAuth());
    return response.data;
};

/** Cập nhật vé — không gửi `status` (do hệ thống suy ra từ sê-ri / cutoff) */
export type UpdateTicketPayload = {
    numbers?: string;
    drawDate?: string;
    stationId?: number | string;
    serials?: Array<{
        id?: number;
        serialNumber: string;
        ticketImg?: string;
    }>;
    [key: string]: unknown;
};

/** Cập nhật vé */
export const updateTicket = async (
    id: string | number,
    data: UpdateTicketPayload
): Promise<ApiResponse<any>> => {
    const payload = { ...data };
    // Status is system-derived; never send it on update even if a caller includes it.
    delete payload.status;
    const response = await apiApp.put(`${BASE_URL}/${id}`, payload, withAuth());
    return response.data;
};

/** Xóa vé */
export const deleteTicket = async (id: string | number): Promise<ApiResponse<any>> => {
    const response = await apiApp.delete(`${BASE_URL}/${id}`, withAuth());
    return response.data;
};

/** Khôi phục vé */
export const restoreTicket = async (id: string | number): Promise<ApiResponse<any>> => {
    const response = await apiApp.patch(`${BASE_URL}/restore/${id}`, {}, withAuth());
    return response.data;
};

/** Xóa vĩnh viễn vé */
export const forceDeleteTicket = async (id: string | number): Promise<ApiResponse<any>> => {
    const response = await apiApp.delete(`${BASE_URL}/force-delete/${id}`, withAuth());
    return response.data;
};

/** Lấy danh sách vé hết hạn */
export const getExpiredTickets = async (params?: any): Promise<ApiResponse<any>> => {
    return {
        success: true,
        data: {
            recordList: [],
            pagination: {
                totalRecords: 0,
                totalPages: 1,
                currentPage: params?.page || 1,
                limit: params?.limit || 10
            }
        }
    } as any;
};

/** Quét vé hết hạn thủ công */
export const scanExpiredTickets = async (): Promise<ApiResponse<any>> => {
    return {
        success: true,
        message: "Quét vé số hết hạn thành công!"
    } as any;
};

import { uploadAdminImage } from "@/admin/shared/services/upload.service";

/** Upload ảnh vé số lên Cloudinary qua backend (dùng khi tạo vé, chưa có ticket id) */
export const uploadLotteryTicketAsset = uploadAdminImage;

/** Tải ảnh vé số */
export const uploadTicketImage = async (id: string | number, file: File): Promise<ApiResponse<any>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiApp.post(`${BASE_URL}/${id}/image`, formData, {
        ...withAuth(),
    });
    return response.data;
};


/** Tải ảnh sê-ri vé số */
export const uploadTicketSerialImage = async (id: string | number, file: File): Promise<ApiResponse<any>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiApp.post(`/lottery-ticket-serials/${id}/image`, formData, {
        ...withAuth(),
    });
    return response.data;
};

export const reportTicketSerialFault = async (
    id: string | number,
    data: {
        ticketCondition: 'DAMAGED' | 'LOST' | 'VOIDED';
        faultedBy: 'INTERNAL_FAULT' | 'ISSUER_FAULT' | 'DATA_ENTRY_FAULT';
        damagedReason?: string;
        damagedEvidenceUrl?: string;
        replacementSerialNumber?: string;
        replacementTicketImg?: string;
    }
): Promise<ApiResponse<any>> => {
    const response = await apiApp.post(`/lottery-ticket-serials/${id}/report-fault`, data, withAuth());
    return response.data;
};

/** Build report-fault body: DAMAGED / LOST / VOIDED all go on ticketCondition. */
export const buildReportSerialFaultPayload = (input: {
    faultKind: 'DAMAGED' | 'LOST' | 'VOIDED';
    faultedBy: 'INTERNAL_FAULT' | 'ISSUER_FAULT' | 'DATA_ENTRY_FAULT';
    damagedReason?: string;
    damagedEvidenceUrl?: string;
    replacementSerialNumber?: string;
    replacementTicketImg?: string;
}) => ({
    ticketCondition: input.faultKind,
    faultedBy: input.faultedBy,
    damagedReason: input.damagedReason,
    damagedEvidenceUrl: input.damagedEvidenceUrl,
    replacementSerialNumber: input.replacementSerialNumber,
    replacementTicketImg: input.replacementTicketImg,
});

/** Thay đổi dãy số cho vé số */
export const replaceTicketDigits = async (
    id: string | number,
    data: {
        newNumbers: string;
        newTicketImg?: string;
    }
): Promise<ApiResponse<any>> => {
    const response = await apiApp.post(`/lottery-tickets/${id}/replace-digits`, data, withAuth());
    return response.data;
};

/** Hoàn tất hủy dãy vé sau khi tất cả sê-ri đã được báo hỏng/mất */
export const finalizeTicketIncidentCancel = async (
    id: string | number
): Promise<ApiResponse<any>> => {
    const response = await apiApp.post(`/lottery-tickets/${id}/finalize-incident-cancel`, {}, withAuth());
    return response.data;
};
