"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
    createContractTemplate,
    deleteContractTemplate,
    getContractTemplates,
    setDefaultContractTemplate,
    updateContractTemplate,
} from "../services/contractService";
import { ContractType, UpsertContractPayload } from "../types/contract.type";

export const CONTRACT_TEMPLATE_QUERY_KEY = ["settings-contracts"] as const;

export const useContractTemplates = (type?: ContractType) =>
    useQuery({
        queryKey: [...CONTRACT_TEMPLATE_QUERY_KEY, type ?? "ALL"],
        queryFn: () => getContractTemplates(type),
        select: (response) => response.data ?? [],
        staleTime: 30_000,
    });

export const useCreateContractTemplate = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: UpsertContractPayload) => createContractTemplate(data),
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: CONTRACT_TEMPLATE_QUERY_KEY });
            toast.success(response.message || "Đã tạo hợp đồng.");
        },
        onError: (error: unknown) => {
            toast.error(error instanceof Error ? error.message : "Không tạo được hợp đồng.");
        },
    });
};

export const useUpdateContractTemplate = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number | string; data: UpsertContractPayload }) =>
            updateContractTemplate(id, data),
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: CONTRACT_TEMPLATE_QUERY_KEY });
            toast.success(response.message || "Đã cập nhật hợp đồng.");
        },
        onError: (error: unknown) => {
            toast.error(error instanceof Error ? error.message : "Không cập nhật được hợp đồng.");
        },
    });
};

export const useSetDefaultContractTemplate = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number | string) => setDefaultContractTemplate(id),
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: CONTRACT_TEMPLATE_QUERY_KEY });
            toast.success(response.message || "Đã đặt làm mặc định.");
        },
        onError: (error: unknown) => {
            toast.error(error instanceof Error ? error.message : "Không đặt được mặc định.");
        },
    });
};

export const useDeleteContractTemplate = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number | string) => deleteContractTemplate(id),
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: CONTRACT_TEMPLATE_QUERY_KEY });
            toast.success(response.message || "Đã xóa hợp đồng.");
        },
        onError: (error: unknown) => {
            toast.error(error instanceof Error ? error.message : "Không xóa được hợp đồng.");
        },
    });
};
