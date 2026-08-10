"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { useRouteParams } from "@/hooks/useRouteParams";
import Link from "@/admin/components/navigation/AdminLink";
import { PageHeader } from "../../../../components/ui/PageHeader";
import { SpinnerLoading } from "../../../../components/ui/SpinnerLoading";
import {
    useStreetAgentProfileDetail,
    useUpdateApprovedDailyCap,
    useUpdateStreetAgentProfile,
    useUploadStreetAgentSignedContract} from "../../hooks/useStreetAgent";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect, useRef, useState } from "react";
import {
    updateStreetAgentProfileSchema,
    UpdateStreetAgentProfileFormValues,
} from "../../schemas/street-agent.schema";
import { ROUTES } from "../../../../constants/routes";
import { toast } from "react-toastify";
import { Alert, Box, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import { uploadAdminImage } from "../../../../api/upload.api";
import { Button } from "../../../../components/ui/Button";
import { StreetAgentProfileForm } from "../sections/StreetAgentProfileForm";
import { openStreetAgentContractPrint, getStreetAgentOnboardingResumePath } from "../../services/streetAgentService";
import {
    parseCoverageAreaCodes,
    serializeCoverageAreaCodes,
} from "../../constants/coverageAreas";
import { StreetAgentProfile } from "../../types/street-agent.type";
import { useVendorSettingsDefaults } from "../../hooks/useVendorSettingsDefaults";
import { SignedContractUploadDialog } from "../SignedContractUploadDialog";
import { ContractDocumentViewerDialog } from "../ContractDocumentViewerDialog";

const SIGNED_DOC_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const SIGNED_DOC_MAX_SIZE = 10 * 1024 * 1024;

const defaultValues: UpdateStreetAgentProfileFormValues = {
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
    approvedDailyCap: null,
};

const buildBasePayload = (data: UpdateStreetAgentProfileFormValues) => ({
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
});

const buildPayloadFromProfile = (profile: StreetAgentProfile) => ({
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone,
    cccd: profile.cccd,
    imageUrl: profile.imageUrl || undefined,
    contactAddress: profile.contactAddress || undefined,
    contactProvince: profile.contactProvince || undefined,
    contactWard: profile.contactWard || undefined,
    coverageArea: profile.coverageArea || undefined,
    contractStartDate: profile.contractStartDate || undefined,
    contractEndDate: profile.contractEndDate || undefined,
    contractMaxDailyCap: profile.contractMaxDailyCap ?? undefined,
});

export const StreetAgentEditPage = () => {
    const { id } = useRouteParams();
    const router = useAdminRouter();
    const { data: profile, isLoading, refetch } = useStreetAgentProfileDetail(id);
    const { mutate: update, isPending } = useUpdateStreetAgentProfile();
    const { mutate: updateApprovedCap, isPending: isUpdatingApprovedCap } = useUpdateApprovedDailyCap();
    const { mutate: uploadSigned, isPending: isUploadingSigned } = useUploadStreetAgentSignedContract();
    const { defaults: vendorDefaults } = useVendorSettingsDefaults();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const signedFileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isStatusActionPending, setIsStatusActionPending] = useState(false);
    const [pendingSignedFile, setPendingSignedFile] = useState<File | null>(null);
    const [viewSignedOpen, setViewSignedOpen] = useState(false);
    const [approvedCapDialogOpen, setApprovedCapDialogOpen] = useState(false);
    const [nextApprovedCap, setNextApprovedCap] = useState("");
    const [approvedCapReason, setApprovedCapReason] = useState("");

    const { control, handleSubmit, setValue, watch, reset, getValues } = useForm<UpdateStreetAgentProfileFormValues>({
        resolver: zodResolver(updateStreetAgentProfileSchema) as any,
        defaultValues,
        mode: "all",
        reValidateMode: "onChange",
    });

    const imageUrl = watch("imageUrl");

    useEffect(() => {
        if (profile) {
            reset({
                firstName: profile.firstName || "",
                lastName: profile.lastName || "",
                phone: profile.phone || "",
                cccd: profile.cccd || "",
                imageUrl: profile.imageUrl || "",
                contactAddress: profile.contactAddress || "",
                contactProvince: profile.contactProvince || "",
                coverageAreaCodes: parseCoverageAreaCodes(profile.coverageArea),
                contractStartDate: profile.contractStartDate || "",
                contractEndDate: profile.contractEndDate || "",
                contractMaxDailyCap: profile.contractMaxDailyCap ?? null,
                approvedDailyCap: profile.approvedDailyCap ?? null,
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

    const handleSelectSignedDocument = (file: File) => {
        if (!SIGNED_DOC_TYPES.includes(file.type)) {
            toast.error("Chỉ chấp nhận PDF, JPG hoặc PNG");
            return;
        }
        if (file.size > SIGNED_DOC_MAX_SIZE) {
            toast.error("Dung lượng file quá lớn. Tối đa là 10 Mb");
            return;
        }
        setPendingSignedFile(file);
    };

    const handleConfirmSignedUpload = (file: File) => {
        if (!id) return;

        uploadSigned(
            { id, file },
            {
                onSuccess: (response) => {
                    if (response.success) {
                        toast.success(response.message || "Đính kèm bản đã ký thành công!");
                        setPendingSignedFile(null);
                        void refetch();
                    } else {
                        toast.error(response.message || "Đính kèm bản đã ký thất bại");
                    }
                },
                onError: (error: any) => {
                    toast.error(error.response?.data?.message || "Đính kèm bản đã ký thất bại");
                },
            }
        );
    };

    const runStatusUpdate = (status: "INACTIVE" | "PENDING", successMessage: string) => {
        if (!id || !profile) return;
        setIsStatusActionPending(true);
        update(
            {
                id,
                data: {
                    ...buildPayloadFromProfile(profile),
                    ...buildBasePayload(getValues()),
                    status,
                },
            },
            {
                onSuccess: (response) => {
                    if (response.success) {
                        toast.success(successMessage);
                        void refetch();
                    } else {
                        toast.error(response.message || "Cập nhật trạng thái thất bại");
                    }
                },
                onError: (error: any) => {
                    toast.error(error.response?.data?.message || "Cập nhật trạng thái thất bại");
                },
                onSettled: () => setIsStatusActionPending(false),
            }
        );
    };

    const onSubmit = (data: UpdateStreetAgentProfileFormValues) => {
        update(
            { id: id!, data: buildBasePayload(data) },
            {
                onSuccess: (response) => {
                    if (response.success) {
                        toast.success(response.message || "Cập nhật hồ sơ đại lý bán dạo thành công!");
                        router.push(ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.LIST);
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

    const openApprovedCapDialog = () => {
        setNextApprovedCap(String(profile?.approvedDailyCap ?? ""));
        setApprovedCapReason("");
        setApprovedCapDialogOpen(true);
    };

    const saveApprovedCap = () => {
        if (!id || !profile) return;
        const approvedDailyCap = Number(nextApprovedCap);
        if (!Number.isInteger(approvedDailyCap) || approvedDailyCap <= 0) {
            toast.error("Hạn mức vận hành phải là số nguyên dương.");
            return;
        }
        if (profile.contractMaxDailyCap != null && approvedDailyCap > profile.contractMaxDailyCap) {
            toast.error("Hạn mức vận hành không được vượt trần trong hợp đồng.");
            return;
        }
        if (!approvedCapReason.trim()) {
            toast.error("Cần nhập lý do điều chỉnh hạn mức.");
            return;
        }
        updateApprovedCap(
            { id, data: { approvedDailyCap, reason: approvedCapReason.trim() } },
            {
                onSuccess: (response) => {
                    if (response.success) {
                        toast.success(response.message || "Đã cập nhật hạn mức vận hành.");
                        setApprovedCapDialogOpen(false);
                        void refetch();
                    } else {
                        toast.error(response.message || "Cập nhật hạn mức thất bại.");
                    }
                },
                onError: (error: any) => toast.error(error.response?.data?.message || "Cập nhật hạn mức thất bại."),
            }
        );
    };

    if (isLoading) {
        return (
            <Box sx={{ maxWidth: "1200px", mx: "auto" }}>
                <PageHeader
                    title="Chỉnh sửa hồ sơ đại lý bán dạo"
                    breadcrumbItems={[
                        { label: "Dashboard", to: "/" },
                        { label: "Quản lý đại lý", to: ROUTES.ADMIN.ACCOUNTS.ADMIN.LIST },
                        { label: "Đại lý bán dạo", to: ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.LIST },
                        { label: "Cập nhật" },
                    ]}
                />
                <SpinnerLoading />
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: "1200px", mx: "auto" }}>
            <PageHeader
                title="Chỉnh sửa hồ sơ đại lý bán dạo"
                breadcrumbItems={[
                    { label: "Dashboard", to: "/" },
                    { label: "Quản lý đại lý", to: ROUTES.ADMIN.ACCOUNTS.ADMIN.LIST },
                    { label: "Đại lý bán dạo", to: ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.LIST },
                    { label: "Cập nhật" },
                ]}
            />

            {profile?.status === "PENDING" && !profile.contractDocumentUrl && id ? (
                <Alert
                    severity="warning"
                    sx={{ mb: 3 }}
                    action={
                        <Button
                            color="inherit"
                            size="small"
                            component={Link}
                            href={getStreetAgentOnboardingResumePath(id)}
                        >
                            Tiếp tục hoàn thiện HĐ
                        </Button>
                    }
                >
                    Hồ sơ đang PENDING — cần in hợp đồng và upload bản đã ký trước khi vendor nhận vé.
                </Alert>
            ) : null}

            <form onSubmit={handleSubmit(onSubmit)}>
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
                    confidenceScore={profile?.confidenceScore}
                    confidenceTier={profile?.confidenceTier}
                    contractCode={profile?.contractCode}
                    contractDocumentUrl={profile?.contractDocumentUrl}
                    effectiveDailyCap={profile?.effectiveDailyCap}
                    remainingDailyCap={profile?.remainingDailyCap}
                    depositBalance={profile?.depositBalance}
                    onPrintContract={async () => {
                        if (!id) return;
                        try {
                            await openStreetAgentContractPrint(id);
                        } catch (error: any) {
                            toast.error(
                                error?.message ||
                                    error?.response?.data?.message ||
                                    "Không mở được hợp đồng PDF"
                            );
                        }
                    }}
                    onUploadSignedDocument={handleSelectSignedDocument}
                    onViewSignedDocument={() => setViewSignedOpen(true)}
                    isUploadingSignedDocument={isUploadingSigned}
                    signedFileInputRef={signedFileInputRef}
                    onAdjustApprovedDailyCap={openApprovedCapDialog}
                    onLockProfile={() => runStatusUpdate("INACTIVE", "Đã khóa hồ sơ")}
                    onReactivateProfile={() => runStatusUpdate("PENDING", "Đã kích hoạt lại hồ sơ")}
                    isStatusActionPending={isStatusActionPending}
                    vendorDefaults={vendorDefaults}
                    footer={
                        <Button
                            type="submit"
                            loading={isPending && !isStatusActionPending}
                            label="Lưu thay đổi"
                            loadingLabel="Đang lưu..."
                        />
                    }
                />
            </form>

            <SignedContractUploadDialog
                open={!!pendingSignedFile}
                file={pendingSignedFile}
                uploading={isUploadingSigned}
                onClose={() => {
                    if (!isUploadingSigned) setPendingSignedFile(null);
                }}
                onConfirm={handleConfirmSignedUpload}
            />

            <ContractDocumentViewerDialog
                open={viewSignedOpen}
                url={profile?.contractDocumentUrl}
                fileName={profile?.contractCode ? `Hop-dong-da-ky-${profile.contractCode}` : undefined}
                onClose={() => setViewSignedOpen(false)}
            />

            <Dialog open={approvedCapDialogOpen} onClose={() => !isUpdatingApprovedCap && setApprovedCapDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Điều chỉnh hạn mức vận hành</DialogTitle>
                <DialogContent>
                    <Stack spacing={2.5} sx={{ pt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            Trần trong hợp đồng: {profile?.contractMaxDailyCap ?? "—"} vé/ngày. Thao tác này được lưu kèm lý do và người duyệt.
                        </Typography>
                        <TextField
                            autoFocus
                            type="number"
                            label="Hạn mức vận hành mới"
                            value={nextApprovedCap}
                            onChange={(event) => setNextApprovedCap(event.target.value)}
                            inputProps={{ min: 1, max: profile?.contractMaxDailyCap ?? undefined }}
                            fullWidth
                        />
                        <TextField
                            label="Lý do điều chỉnh"
                            value={approvedCapReason}
                            onChange={(event) => setApprovedCapReason(event.target.value)}
                            inputProps={{ maxLength: 500 }}
                            multiline
                            minRows={3}
                            fullWidth
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setApprovedCapDialogOpen(false)} disabled={isUpdatingApprovedCap}>Hủy</Button>
                    <Button loading={isUpdatingApprovedCap} onClick={saveApprovedCap} label="Lưu hạn mức" loadingLabel="Đang lưu..." />
                </DialogActions>
            </Dialog>

        </Box>
    );
};
