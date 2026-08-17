"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Box,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Stack,
    Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { toast } from "react-toastify";
import { Button } from "../../../components/ui/Button";
import { uploadAdminImage } from "@/admin/shared/services/upload.service";
import {
    useStreetAgentProfileDetail,
    useUpdateStreetAgentProfile,
} from "../hooks/useStreetAgent";
import {
    updateStreetAgentProfileSchema,
    UpdateStreetAgentProfileFormValues,
} from "../schemas/street-agent.schema";
import { StreetAgentProfile } from "../types/street-agent.type";
import { VendorSettingsDefaults } from "../hooks/useVendorSettingsDefaults";
import { StreetAgentProfileForm } from "./sections/StreetAgentProfileForm";
import {
    parseCoverageAreaCodes,
    serializeCoverageAreaCodes,
} from "../constants/coverageAreas";

interface StreetAgentProfileEditModalProps {
    open: boolean;
    onClose: () => void;
    profileId: number | string | null;
    vendorDefaults?: VendorSettingsDefaults | null;
    onUpdated?: (profile: StreetAgentProfile) => void;
}

const toFormValues = (profile: StreetAgentProfile): UpdateStreetAgentProfileFormValues => ({
    firstName: profile.firstName || "",
    lastName: profile.lastName || "",
    phone: profile.phone || "",
    cccd: profile.cccd || "",
    imageUrl: profile.imageUrl || "",
    contactAddress: profile.contactAddress || "",
    contactProvince: profile.contactProvince || "",
    contactWard: profile.contactWard || "",
    coverageAreaCodes: parseCoverageAreaCodes(profile.coverageArea),
    contractStartDate: profile.contractStartDate || "",
    contractEndDate: profile.contractEndDate || "",
    contractMaxDailyCap: profile.contractMaxDailyCap ?? null,
});

const MODAL_SECTIONS = {
    personal: true,
    contract: true,
    contact: true,
    signedContract: false,
    policy: false,
    statusSummary: false,
    footer: false,
} as const;

export const StreetAgentProfileEditModal = ({
    open,
    onClose,
    profileId,
    vendorDefaults,
    onUpdated,
}: StreetAgentProfileEditModalProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    const { data: profile, isLoading } = useStreetAgentProfileDetail(
        open && profileId ? profileId : undefined
    );
    const { mutate: update, isPending } = useUpdateStreetAgentProfile();

    const { control, handleSubmit, reset, setValue, watch } = useForm<UpdateStreetAgentProfileFormValues>({
        resolver: zodResolver(updateStreetAgentProfileSchema) as any,
        defaultValues: {
            firstName: "",
            lastName: "",
            phone: "",
            cccd: "",
            imageUrl: "",
            contactAddress: "",
            contactProvince: "",
            contactWard: "",
            coverageAreaCodes: [],
            contractStartDate: "",
            contractEndDate: "",
            contractMaxDailyCap: null,
        },
        mode: "all",
        reValidateMode: "onChange",
    });

    const imageUrl = watch("imageUrl");

    useEffect(() => {
        if (open && profile) {
            reset(toFormValues(profile));
        }
    }, [open, profile, reset]);

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
        if (!profileId) return;

        update(
            {
                id: profileId,
                data: {
                    firstName: data.firstName,
                    lastName: data.lastName,
                    phone: data.phone,
                    cccd: data.cccd,
                    imageUrl: data.imageUrl || undefined,
                    contactAddress: data.contactAddress || undefined,
                    contactProvince: data.contactProvince || undefined,
                    contactWard: data.contactWard || undefined,
                    coverageArea: serializeCoverageAreaCodes(data.coverageAreaCodes || []),
                    contractStartDate: data.contractStartDate || undefined,
                    contractEndDate: data.contractEndDate || undefined,
                    contractMaxDailyCap: data.contractMaxDailyCap ?? undefined,
                },
            },
            {
                onSuccess: (response) => {
                    if (!response.success || !response.data) {
                        toast.error(response.message || "Cập nhật hồ sơ thất bại");
                        return;
                    }
                    toast.success(response.message || "Cập nhật hồ sơ thành công");
                    onUpdated?.(response.data);
                    onClose();
                },
            }
        );
    };

    if (!open) return null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            scroll="paper"
            PaperProps={{
                className: "admin-theme",
                sx: {
                    borderRadius: "16px",
                    boxShadow: "var(--customShadows-dialog, 0px 24px 48px -8px rgba(0, 0, 0, 0.16))",
                    bgcolor: "#FFFFFF",
                    overflow: "hidden",
                },
            }}
        >
            <DialogTitle
                sx={{
                    m: 0,
                    px: 3,
                    py: 2.5,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid var(--palette-divider)",
                    bgcolor: "#FFFFFF",
                }}
            >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: "12px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            bgcolor: "rgba(28, 37, 46, 0.08)",
                            color: "var(--palette-text-primary)",
                        }}
                    >
                        <EditOutlinedIcon fontSize="small" />
                    </Box>
                    <Typography component="span" sx={{ fontWeight: 700, fontSize: "1.125rem" }}>
                        Chỉnh sửa hồ sơ
                    </Typography>
                </Stack>
                <IconButton onClick={onClose} size="small" aria-label="Đóng">
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent
                sx={{
                    px: 3,
                    py: 3,
                    bgcolor: "#FFFFFF",
                }}
            >
                {isLoading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                        <CircularProgress size={32} />
                    </Box>
                ) : (
                    <Box
                        component="form"
                        id="street-agent-profile-edit-form"
                        onSubmit={handleSubmit(onSubmit)}
                    >
                        <StreetAgentProfileForm
                            mode="edit"
                            control={control}
                            setValue={setValue}
                            imageUrl={imageUrl}
                            isUploading={isUploading}
                            fileInputRef={fileInputRef}
                            onOpenFile={handleOpenFile}
                            onFileChange={handleFileChange}
                            statusChip={profile?.status}
                            contractDocumentUrl={profile?.contractDocumentUrl}
                            vendorDefaults={vendorDefaults}
                            sections={MODAL_SECTIONS}
                        />
                    </Box>
                )}
            </DialogContent>

            <DialogActions
                sx={{
                    px: 3,
                    py: 2.5,
                    gap: 1.5,
                    borderTop: "1px solid var(--palette-divider)",
                    bgcolor: "#FFFFFF",
                }}
            >
                <Button
                    variant="outlined"
                    color="inherit"
                    onClick={onClose}
                    disabled={isPending}
                    label="Hủy"
                    sx={{ fontWeight: 700, borderRadius: "8px", minWidth: 100 }}
                />
                <Button
                    type="submit"
                    form="street-agent-profile-edit-form"
                    variant="contained"
                    loading={isPending}
                    disabled={isLoading || isUploading}
                    label="Lưu thay đổi"
                    loadingLabel="Đang lưu..."
                    sx={{ fontWeight: 700, borderRadius: "8px", minWidth: 140 }}
                />
            </DialogActions>
        </Dialog>
    );
};
