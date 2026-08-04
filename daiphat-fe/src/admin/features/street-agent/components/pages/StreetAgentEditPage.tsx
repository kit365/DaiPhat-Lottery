"use client";

import { Breadcrumb } from "../../../../components/ui/Breadcrumb";
import { Title } from "../../../../components/ui/Title";
import { useStreetAgentProfileDetail, useUpdateStreetAgentProfile } from "../../hooks/useStreetAgent";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect, useRef, useState } from "react";
import {
    updateStreetAgentProfileSchema,
    UpdateStreetAgentProfileFormValues,
} from "../../schemas/street-agent.schema";
import { ROUTES } from "../../../../constants/routes";
import { toast } from "react-toastify";
import { useNavigate, useParams } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { uploadAdminImage } from "../../../../api/upload.api";
import { LoadingButton } from "../../../../components/ui/LoadingButton";
import { StreetAgentProfileForm } from "../sections/StreetAgentProfileForm";

const defaultValues: UpdateStreetAgentProfileFormValues = {
    firstName: "",
    lastName: "",
    phone: "",
    cccd: "",
    imageUrl: "",
    contactAddress: "",
    contactProvince: "",
    coverageArea: "",
    commissionRate: null,
    contractStartDate: "",
    contractEndDate: "",
    depositBalance: null,
    depositAdjustmentReason: "",
    status: "ACTIVE",
};

export const StreetAgentEditPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: profile, isLoading } = useStreetAgentProfileDetail(id);
    const { mutate: update, isPending } = useUpdateStreetAgentProfile();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [initialDepositBalance, setInitialDepositBalance] = useState<number | null>(null);

    const { control, handleSubmit, setValue, watch, reset } = useForm<UpdateStreetAgentProfileFormValues>({
        resolver: zodResolver(updateStreetAgentProfileSchema) as any,
        defaultValues,
    });

    const imageUrl = watch("imageUrl");
    const depositBalance = watch("depositBalance");

    useEffect(() => {
        if (profile) {
            setInitialDepositBalance(profile.depositBalance ?? null);
            reset({
                firstName: profile.firstName || "",
                lastName: profile.lastName || "",
                phone: profile.phone || "",
                cccd: profile.cccd || "",
                imageUrl: profile.imageUrl || "",
                contactAddress: profile.contactAddress || "",
                contactProvince: profile.contactProvince || "",
                coverageArea: profile.coverageArea || "",
                commissionRate: profile.commissionRate ?? null,
                contractStartDate: profile.contractStartDate || "",
                contractEndDate: profile.contractEndDate || "",
                depositBalance: profile.depositBalance ?? null,
                depositAdjustmentReason: profile.depositAdjustmentReason || "",
                status: (profile.status as UpdateStreetAgentProfileFormValues["status"]) || "ACTIVE",
            });
        }
    }, [profile, reset]);

    const handleOpenFile = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
        if (!allowedTypes.includes(file.type)) {
            toast.error("Định dạng file không hợp lệ. Vui lòng chọn *.jpeg, *.jpg, *.png, hoặc *.gif");
            event.target.value = "";
            return;
        }

        const maxSize = 3 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error("Dung lượng file quá lớn. Tối đa là 3 Mb");
            event.target.value = "";
            return;
        }

        try {
            setIsUploading(true);
            const url = await uploadAdminImage(file);
            setValue("imageUrl", url, { shouldValidate: true });
            toast.success("Tải ảnh lên thành công!");
        } catch {
            toast.error("Tải ảnh lên thất bại!");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const onSubmit = (data: UpdateStreetAgentProfileFormValues) => {
        const depositChanged =
            initialDepositBalance !== null &&
            data.depositBalance !== null &&
            data.depositBalance !== initialDepositBalance;

        const payload = {
            ...data,
            imageUrl: data.imageUrl || undefined,
            contactAddress: data.contactAddress || undefined,
            contactProvince: data.contactProvince || undefined,
            coverageArea: data.coverageArea || undefined,
            commissionRate: data.commissionRate ?? undefined,
            contractStartDate: data.contractStartDate || undefined,
            contractEndDate: data.contractEndDate || undefined,
            depositBalance: data.depositBalance ?? undefined,
            depositAdjustmentReason: depositChanged
                ? data.depositAdjustmentReason || undefined
                : undefined,
        };

        update(
            { id: id!, data: payload },
            {
                onSuccess: (response) => {
                    if (response.success) {
                        toast.success(response.message || "Cập nhật hồ sơ đại lý bán dạo thành công!");
                        navigate(ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.LIST);
                    } else {
                        toast.error(response.message || "Cập nhật hồ sơ thất bại");
                    }
                },
                onError: (error: any) => {
                    toast.error(error.response?.data?.message || "Cập nhật hồ sơ thất bại");
                },
            }
        );
    };

    if (isLoading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
                <CircularProgress />
            </Box>
        );
    }

    const showDepositAdjustmentReason =
        initialDepositBalance !== null &&
        depositBalance !== null &&
        depositBalance !== initialDepositBalance;

    return (
        <Box sx={{ maxWidth: "1200px", mx: "auto" }}>
            <Box sx={{ mb: 5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                    <Title title="Chỉnh sửa hồ sơ đại lý bán dạo" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: "/" },
                            { label: "Quản lý tài khoản", to: ROUTES.ADMIN.ACCOUNTS.ADMIN.LIST },
                            { label: "Đại lý bán dạo", to: ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.LIST },
                            { label: "Cập nhật" },
                        ]}
                    />
                </Box>
            </Box>

            <form onSubmit={handleSubmit(onSubmit)}>
                <StreetAgentProfileForm
                    control={control}
                    imageUrl={imageUrl}
                    isUploading={isUploading}
                    fileInputRef={fileInputRef}
                    onOpenFile={handleOpenFile}
                    onFileChange={handleFileChange}
                    showDepositAdjustmentReason={showDepositAdjustmentReason}
                    statusChip={profile?.status}
                    footer={
                        <LoadingButton
                            type="submit"
                            loading={isPending}
                            label="Lưu thay đổi"
                            loadingLabel="Đang lưu..."
                        />
                    }
                />
            </form>
        </Box>
    );
};
