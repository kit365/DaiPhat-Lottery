import { apiApp } from "../../../../api";
import { withAuthHeaders } from "../../../../api/authHeaders";
import { ApiResponse } from "../../../../types/api.type";
import { prefixAdmin } from "../../../constants/routes";
import {
    ContractTemplate,
    ContractType,
    UpsertContractPayload,
} from "../types/contract.type";

const BASE_URL = `/${prefixAdmin}/contracts`;

export const getContractTemplates = async (
    type?: ContractType
): Promise<ApiResponse<ContractTemplate[]>> => {
    const response = await apiApp.get(BASE_URL, {
        params: type ? { type } : undefined,
    });
    return response.data;
};

export const createContractTemplate = async (
    data: UpsertContractPayload
): Promise<ApiResponse<ContractTemplate>> => {
    const response = await apiApp.post(BASE_URL, data);
    return response.data;
};

export const updateContractTemplate = async (
    id: number | string,
    data: UpsertContractPayload
): Promise<ApiResponse<ContractTemplate>> => {
    const response = await apiApp.put(`${BASE_URL}/${id}`, data);
    return response.data;
};

export const setDefaultContractTemplate = async (
    id: number | string
): Promise<ApiResponse<ContractTemplate>> => {
    const response = await apiApp.put(`${BASE_URL}/${id}/default`);
    return response.data;
};

export const deleteContractTemplate = async (
    id: number | string
): Promise<ApiResponse<null>> => {
    const response = await apiApp.delete(`${BASE_URL}/${id}`);
    return response.data;
};

const fetchContractPdfBlob = async (url: string): Promise<Blob> => {
    const response = await apiApp.get(url, {
        ...withAuthHeaders(),
        responseType: "blob",
        skipGlobalErrorToast: true,
    } as Parameters<typeof apiApp.get>[1] & { skipGlobalErrorToast?: boolean });

    const blob = response.data as Blob;
    const contentType = String(blob.type || response.headers?.["content-type"] || "").toLowerCase();
    if (!contentType.includes("pdf")) {
        let message = "Không mở được hợp đồng PDF";
        try {
            const text = await blob.text();
            const parsed = JSON.parse(text);
            if (parsed?.message) message = parsed.message;
        } catch {
            // keep default
        }
        throw new Error(message);
    }
    return blob;
};

const openOrDownloadPdf = async (blob: Blob, fileName: string, mode: "preview" | "download") => {
    const objectUrl = URL.createObjectURL(blob);
    if (mode === "preview") {
        const opened = window.open(objectUrl, "_blank");
        if (opened) {
            opened.opener = null;
            window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
            return;
        }
    }
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
};

export const openContractTemplatePdf = async (
    id: number | string,
    mode: "preview" | "download" = "preview"
): Promise<void> => {
    const blob = await fetchContractPdfBlob(`${BASE_URL}/${id}/pdf`);
    await openOrDownloadPdf(blob, `hop-dong-${id}.pdf`, mode);
};

export const openDefaultContractTemplatePdf = async (
    type: ContractType,
    mode: "preview" | "download" = "preview"
): Promise<void> => {
    const blob = await fetchContractPdfBlob(`${BASE_URL}/default/pdf?type=${type}`);
    await openOrDownloadPdf(blob, `hop-dong-mac-dinh-${type}.pdf`, mode);
};
