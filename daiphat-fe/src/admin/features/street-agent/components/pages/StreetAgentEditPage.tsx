"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { useRouteParams } from "@/hooks/useRouteParams";
import { PageHeader } from "../../../../components/ui/PageHeader";
import { SpinnerLoading } from "../../../../components/ui/SpinnerLoading";
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
} from "../../schemas/street-agent.schema";
import { ROUTES } from "../../../../constants/routes";
import { toast } from "react-toastify";
import { Alert, Box, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import { uploadAdminImage } from "@/admin/shared/services/upload.service";
import Link from "@/admin/components/navigation/AdminLink";
import { Button } from "../../../../components/ui/Button";
import { StreetAgentProfileForm } from "../sections/StreetAgentProfileForm";
import { getStreetAgentOnboardingResumePath } from "../../services/streetAgentService";
import {
    parseCoverageAreaCodes,
    serializeCoverageAreaCodes,
} from "../../constants/coverageAreas";
import { StreetAgentProfile } from "../../types/street-agent.type";
import { useVendorSettingsDefaults } from "../../hooks/useVendorSettingsDefaults";
import { SignedContractUploadDialog } from "../SignedContractUploadDialog";
import { SignedContractSaveDialog } from "../SignedContractSaveDialog";
import { ContractDocumentViewerDialog } from "../ContractDocumentViewerDialog";
import { getStreetAgentPendingNotice } from "../../utils/format";

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
    const { mutate: uploadSigned, isPending: isUploadingSigned } = useUploadStreetAgentSignedContract();
    const { defaults: vendorDefaults } = useVendorSettingsDefaults();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const signedFileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isStatusActionPending, setIsStatusActionPending] = useState(false);
    const [pendingSignedFile, setPendingSignedFile] = useState<File | null>(null);
    const [previewSignedFile, setPreviewSignedFile] = useState<File | null>(null);
    const [saveSignedConfirmOpen, setSaveSignedConfirmOpen] = useState(false);
    const [contractChangeConfirmOpen, setContractChangeConfirmOpen] = useState(false);
    const [pendingContractUpdate, setPendingContractUpdate] = useState<UpdateStreetAgentProfileFormValues | null>(null);
    const [viewSignedOpen, setViewSignedOpen] = useState(false);

    const { control, handleSubmit, setValue, watch, reset, getValues } = useForm<UpdateStreetAgentProfileFormValues>({
        resolver: zodResolver(updateStreetAgentProfileSchema) as any,
        defaultValues,
        mode: "all",
        reValidateMode: "onChange",
    });

    const imageUrl = watch("imageUrl");
    const watchStartDate = watch("contractStartDate");
    const watchEndDate = watch("contractEndDate");
    const watchCap = watch("contractMaxDailyCap");
    const pendingNotice = profile?.status === "PENDING"
        ? getStreetAgentPendingNotice(profile)
        : null;

    const isContractChanged = Boolean(profile?.contractDocumentUrl && (
        (profile.contractStartDate || "") !== (watchStartDate || "") ||
        (profile.contractEndDate || "") !== (watchEndDate || "") ||
        (profile.contractMaxDailyCap ?? null) !== (watchCap ?? null)
    ));

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
                contactWard: profile.contactWard || "",
                coverageAreaCodes: parseCoverageAreaCodes(profile.coverageArea),
                contractStartDate: profile.contractStartDate || "",
                contractEndDate: profile.contractEndDate || "",
                contractMaxDailyCap: profile.contractMaxDailyCap ?? null,
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
        setPreviewSignedFile(file);
    };

    const handleStageSignedFile = (file: File) => {
        setPendingSignedFile(file);
        setPreviewSignedFile(null);
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
                        setSaveSignedConfirmOpen(false);
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

    const submitProfileUpdate = (data: UpdateStreetAgentProfileFormValues) => {
        const hadSignedContract = Boolean(profile?.contractDocumentUrl);
        const contractTermsChanged = hadSignedContract && (
            (profile?.contractStartDate || "") !== (data.contractStartDate || "") ||
            (profile?.contractEndDate || "") !== (data.contractEndDate || "") ||
            (profile?.contractMaxDailyCap ?? null) !== (data.contractMaxDailyCap ?? null)
        );

        update(
            { id: id!, data: buildBasePayload(data) },
            {
                onSuccess: (response) => {
                    if (response.success) {
                        const updatedProfile = response.data;
                        if (contractTermsChanged || (updatedProfile?.status === "PENDING" && !updatedProfile.contractDocumentUrl)) {
                            if (contractTermsChanged) {
                                toast.info("Đã lưu thời hạn mới. Bản ký cũ không còn hiệu lực; hãy hoàn thiện và tải bản ký mới.");
                                router.push(getStreetAgentOnboardingResumePath(id!));
                            } else {
                                toast.info("Đã lưu hồ sơ. Vui lòng hoàn thiện và tải bản hợp đồng đã ký lên.");
                                void refetch();
                            }
                        } else {
                            toast.success(response.message || "Cập nhật hồ sơ người bán vé số thành công!");
                            router.push(ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.LIST);
                        }
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

    const onSubmit = (data: UpdateStreetAgentProfileFormValues) => {
        const hadSignedContract = Boolean(profile?.contractDocumentUrl);
        const contractTermsChanged = hadSignedContract && (
            (profile?.contractStartDate || "") !== (data.contractStartDate || "") ||
            (profile?.contractEndDate || "") !== (data.contractEndDate || "") ||
            (profile?.contractMaxDailyCap ?? null) !== (data.contractMaxDailyCap ?? null)
        );

        if (contractTermsChanged) {
            setPendingContractUpdate(data);
            setContractChangeConfirmOpen(true);
            return;
        }

        submitProfileUpdate(data);
    };

    if (isLoading) {
        return (
            <Box sx={{ maxWidth: "1200px", mx: "auto" }}>
                <PageHeader
                    title="Chỉnh sửa hồ sơ người bán vé số"
                    breadcrumbItems={[
                        { label: "Dashboard", to: "/" },
                        { label: "Người bán vé số", to: ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.LIST },
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
                title="Chỉnh sửa hồ sơ người bán vé số"
                breadcrumbItems={[
                    { label: "Dashboard", to: "/" },
                    { label: "Người bán vé số", to: ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.LIST },
                    { label: "Cập nhật" },
                ]}
            />

            {profile?.status === "PENDING" && !profile.contractDocumentUrl && id && (
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
                    Hồ sơ chưa đủ điều kiện nhận vé. Vui lòng hoàn thiện và tải bản hợp đồng đã ký.
                </Alert>
            )}

            {profile?.status === "PENDING" && profile.contractDocumentUrl && id && (
                <Alert
                    severity="warning"
                    sx={{ mb: 3 }}
                    action={
                        <Button
                            color="inherit"
                            size="small"
                            onClick={() => document.getElementById("street-agent-contract")?.scrollIntoView({ behavior: "smooth" })}
                        >
                            {pendingNotice?.actionLabel || "Xem / điều chỉnh hồ sơ"}
                        </Button>
                    }
                >
                    {pendingNotice?.message || "Hồ sơ chưa đủ điều kiện nhận vé. Hãy kiểm tra lại thông tin hợp đồng."}
                </Alert>
            )}

            {isContractChanged && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    Cảnh báo: Bạn đang thay đổi thông tin hợp đồng. Lưu thay đổi sẽ làm mất hiệu lực bản hợp đồng đã ký hiện tại và hồ sơ sẽ chuyển về trạng thái chờ xử lý (PENDING). Bạn sẽ cần in và tải lại bản ký mới.
                </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)}>
                <StreetAgentProfileForm
                    contractSectionId="street-agent-contract"
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
                    contractMaxDailyCap={profile?.contractMaxDailyCap}
                    effectiveDailyCap={profile?.effectiveDailyCap}
                    depositBalance={profile?.depositBalance}
                    onUploadSignedDocument={handleSelectSignedDocument}
                    onViewSignedDocument={() => setViewSignedOpen(true)}
                    isUploadingSignedDocument={isUploadingSigned}
                    signedFileInputRef={signedFileInputRef}
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

            {pendingSignedFile ? (
                <Alert
                    severity="info"
                    sx={{ mt: 2 }}
                    action={
                        <Stack direction="row" spacing={1}>
                            <Button
                                variant="outlined"
                                color="inherit"
                                size="small"
                                onClick={() => setPendingSignedFile(null)}
                                label="Đổi file"
                            />
                            <Button
                                variant="contained"
                                size="small"
                                onClick={() => setSaveSignedConfirmOpen(true)}
                                label="Lưu bản ký vào hồ sơ"
                            />
                        </Stack>
                    }
                >
                    Đã chọn <strong>{pendingSignedFile.name}</strong>. File mới chỉ đang chờ xác nhận cuối.
                </Alert>
            ) : null}

            <SignedContractUploadDialog
                open={!!previewSignedFile}
                file={previewSignedFile}
                uploading={false}
                onClose={() => {
                    setPreviewSignedFile(null);
                }}
                onConfirm={handleStageSignedFile}
            />

            <SignedContractSaveDialog
                open={saveSignedConfirmOpen}
                file={pendingSignedFile}
                saving={isUploadingSigned}
                onClose={() => setSaveSignedConfirmOpen(false)}
                onConfirm={() => {
                    if (pendingSignedFile) handleConfirmSignedUpload(pendingSignedFile);
                }}
            />

            <Dialog
                open={contractChangeConfirmOpen}
                onClose={() => {
                    if (!isPending) {
                        setContractChangeConfirmOpen(false);
                        setPendingContractUpdate(null);
                    }
                }}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>Cập nhật điều khoản hợp đồng?</DialogTitle>
                <DialogContent>
                    <Typography variant="body1" sx={{ mb: 1.5 }}>
                        Bạn đang thay đổi ngày hiệu lực hoặc giới hạn ghi trên hợp đồng đã ký.
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Sau khi lưu, bản ký hiện tại sẽ không còn khớp, hồ sơ chuyển về trạng thái chờ xử lý và bạn sẽ được đưa về bước tải bản ký mới.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button
                        variant="outlined"
                        color="inherit"
                        label="Hủy"
                        onClick={() => {
                            setContractChangeConfirmOpen(false);
                            setPendingContractUpdate(null);
                        }}
                        disabled={isPending}
                    />
                    <Button
                        variant="contained"
                        label="Lưu và cập nhật bản ký"
                        loading={isPending}
                        loadingLabel="Đang lưu..."
                        onClick={() => {
                            if (!pendingContractUpdate) return;
                            setContractChangeConfirmOpen(false);
                            submitProfileUpdate(pendingContractUpdate);
                            setPendingContractUpdate(null);
                        }}
                    />
                </DialogActions>
            </Dialog>

            <ContractDocumentViewerDialog
                open={viewSignedOpen}
                url={profile?.contractDocumentUrl}
                fileName={profile?.contractCode ? `Hop-dong-da-ky-${profile.contractCode}` : undefined}
                onClose={() => setViewSignedOpen(false)}
            />
        </Box>
    );
};
