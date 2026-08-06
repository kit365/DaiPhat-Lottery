"use client";

import { Breadcrumb } from "../../../../components/ui/Breadcrumb";
import { Title } from "../../../../components/ui/Title";
import {
    useStreetAgentProfileDetail,
    useUpdateStreetAgentProfile,
    useUploadStreetAgentSignedContract,
} from "../../hooks/useStreetAgent";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect, useRef, useState } from "react";
import {
    updateStreetAgentProfileSchema,
    UpdateStreetAgentProfileFormValues,
    AdjustDepositFormValues,
} from "../../schemas/street-agent.schema";
import { ROUTES } from "../../../../constants/routes";
import { toast } from "react-toastify";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { Box, Button, CircularProgress, Alert } from "@mui/material";
import { uploadAdminImage } from "../../../../api/upload.api";
import { LoadingButton } from "../../../../components/ui/LoadingButton";
import { StreetAgentProfileForm } from "../sections/StreetAgentProfileForm";
import { DepositAdjustDialog } from "../sections/DepositAdjustDialog";
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
    coverageAreaCodes: [],
    commissionRate: null,
    contractStartDate: "",
    contractEndDate: "",
    dailyTicketCap: null,
};

const buildBasePayload = (data: UpdateStreetAgentProfileFormValues) => ({
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone,
    cccd: data.cccd,
    imageUrl: data.imageUrl || undefined,
    contactAddress: data.contactAddress || undefined,
    contactProvince: data.contactProvince || undefined,
    coverageArea: serializeCoverageAreaCodes(data.coverageAreaCodes || []),
    commissionRate: data.commissionRate ?? undefined,
    contractStartDate: data.contractStartDate || undefined,
    contractEndDate: data.contractEndDate || undefined,
    dailyTicketCap: data.dailyTicketCap ?? undefined,
});

const buildPayloadFromProfile = (profile: StreetAgentProfile) => ({
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone,
    cccd: profile.cccd,
    imageUrl: profile.imageUrl || undefined,
    contactAddress: profile.contactAddress || undefined,
    contactProvince: profile.contactProvince || undefined,
    coverageArea: profile.coverageArea || undefined,
    commissionRate: profile.commissionRate ?? undefined,
    contractStartDate: profile.contractStartDate || undefined,
    contractEndDate: profile.contractEndDate || undefined,
    dailyTicketCap: profile.dailyTicketCap ?? undefined,
});

export const StreetAgentEditPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: profile, isLoading, refetch } = useStreetAgentProfileDetail(id);
    const { mutate: update, isPending } = useUpdateStreetAgentProfile();
    const { mutate: uploadSigned, isPending: isUploadingSigned } = useUploadStreetAgentSignedContract();
    const { defaults: vendorDefaults } = useVendorSettingsDefaults();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const signedFileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [depositDialogOpen, setDepositDialogOpen] = useState(false);
    const [isStatusActionPending, setIsStatusActionPending] = useState(false);
    const [pendingSignedFile, setPendingSignedFile] = useState<File | null>(null);
    const [viewSignedOpen, setViewSignedOpen] = useState(false);

    const { control, handleSubmit, setValue, watch, reset, getValues } = useForm<UpdateStreetAgentProfileFormValues>({
        resolver: zodResolver(updateStreetAgentProfileSchema) as any,
        defaultValues,
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
                commissionRate: profile.commissionRate ?? null,
                contractStartDate: profile.contractStartDate || "",
                contractEndDate: profile.contractEndDate || "",
                dailyTicketCap: profile.dailyTicketCap ?? null,
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

    const handleAdjustDeposit = (values: AdjustDepositFormValues) => {
        if (!id || !profile) return;
        update(
            {
                id,
                data: {
                    ...buildPayloadFromProfile(profile),
                    ...buildBasePayload(getValues()),
                    depositBalance: values.depositBalance,
                    depositAdjustmentReason: values.depositAdjustmentReason,
                },
            },
            {
                onSuccess: (response) => {
                    if (response.success) {
                        toast.success(response.message || "Điều chỉnh cọc thành công!");
                        setDepositDialogOpen(false);
                        void refetch();
                    } else {
                        toast.error(response.message || "Điều chỉnh cọc thất bại");
                    }
                },
                onError: (error: any) => {
                    toast.error(error.response?.data?.message || "Điều chỉnh cọc thất bại");
                },
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

    return (
        <Box sx={{ maxWidth: "1200px", mx: "auto" }}>
            <Box sx={{ mb: 5 }}>
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

            {profile?.status === "PENDING" && !profile.contractDocumentUrl && id ? (
                <Alert
                    severity="warning"
                    sx={{ mb: 3 }}
                    action={
                        <Button
                            color="inherit"
                            size="small"
                            component={RouterLink}
                            to={getStreetAgentOnboardingResumePath(id)}
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
                    onAdjustDeposit={() => setDepositDialogOpen(true)}
                    onLockProfile={() => runStatusUpdate("INACTIVE", "Đã khóa hồ sơ")}
                    onReactivateProfile={() => runStatusUpdate("PENDING", "Đã kích hoạt lại hồ sơ")}
                    isStatusActionPending={isStatusActionPending}
                    vendorDefaults={vendorDefaults}
                    footer={
                        <LoadingButton
                            type="submit"
                            loading={isPending && !depositDialogOpen && !isStatusActionPending}
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

            <DepositAdjustDialog
                open={depositDialogOpen}
                currentBalance={profile?.depositBalance}
                loading={isPending && depositDialogOpen}
                onClose={() => setDepositDialogOpen(false)}
                onConfirm={handleAdjustDeposit}
            />
        </Box>
    );
};
