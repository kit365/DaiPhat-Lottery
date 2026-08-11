"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { useAppSearchParams } from "@/hooks/useAppSearchParams";
import { PageHeader } from "../../../../components/ui/PageHeader";
import { SpinnerLoading } from "../../../../components/ui/SpinnerLoading";
import {
    useCreateStreetAgentProfile,
    useStreetAgentProfileDetail,
    useUploadStreetAgentSignedContract,
} from "../../hooks/useStreetAgent";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    createStreetAgentProfileSchema,
    CreateStreetAgentProfileFormValues,
} from "../../schemas/street-agent.schema";
import { ROUTES } from "../../../../constants/routes";
import axios from "axios";
import { toast } from "react-toastify";
import {
    Alert,
    Box,
    Card,
    Chip,
    Stack,
    Step,
    StepLabel,
    Stepper,
    Typography,
} from '@mui/material';
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { uploadAdminImage } from "@/admin/shared/services/upload.service";
import { Button } from "../../../../components/ui/Button";
import { UploadSingleFile } from "../../../../components/upload/UploadSingleFile";
import { StreetAgentProfileForm } from "../sections/StreetAgentProfileForm";
import {
    parseCoverageAreaCodes,
    serializeCoverageAreaCodes,
} from "../../constants/coverageAreas";
import { useVendorSettingsDefaults } from "../../hooks/useVendorSettingsDefaults";
import { openStreetAgentContractPrint } from "../../services/streetAgentService";
import { StreetAgentProfile } from "../../types/street-agent.type";
import { ContractDocumentViewerDialog } from "../ContractDocumentViewerDialog";
import { StreetAgentProfileEditModal } from "../StreetAgentProfileEditModal";

const SIGNED_DOC_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const SIGNED_DOC_MAX_SIZE = 10 * 1024 * 1024;

const SIGNED_DOC_ACCEPT = {
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "application/pdf": [".pdf"],
} as const;

const PENDING_STATUS_CHIP_SX = {
    bgcolor: "rgba(255, 171, 0, 0.16)",
    color: "rgb(183, 110, 0)",
    fontWeight: 700,
    height: 24,
    fontSize: "0.75rem",
};

const STEPS = ["Thông tin người bán vé số", "In & ký hợp đồng", "Hoàn tất hồ sơ"] as const;

const defaultValues: CreateStreetAgentProfileFormValues = {
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
    contractMaxDailyCap: 200,
};

const toFormValues = (profile: StreetAgentProfile): CreateStreetAgentProfileFormValues => ({
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
    contractMaxDailyCap: profile.contractMaxDailyCap ?? 200,
});

export const StreetAgentCreatePage = () => {
    const router = useAdminRouter();
    const [searchParams, setSearchParams] = useAppSearchParams();
    const resumeIdParam = searchParams.get("resumeId");
    const resumeId = resumeIdParam && /^\d+$/.test(resumeIdParam) ? Number(resumeIdParam) : null;

    const { mutate: create, isPending: isCreating } = useCreateStreetAgentProfile();
    const { mutateAsync: uploadSignedAsync, isPending: isUploadingSigned } = useUploadStreetAgentSignedContract();
    const {
        data: resumeProfile,
        isLoading: isLoadingResume,
        isError: isResumeError,
        refetch: refetchResume,
    } = useStreetAgentProfileDetail(resumeId ?? undefined);
    const {
        defaults: vendorDefaults,
    } = useVendorSettingsDefaults();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [activeStep, setActiveStep] = useState(0);
    const [createdProfile, setCreatedProfile] = useState<StreetAgentProfile | null>(null);
    const [hydratedResume, setHydratedResume] = useState(false);
    const [pendingSignedFile, setPendingSignedFile] = useState<File | null>(null);
    const [viewSignedOpen, setViewSignedOpen] = useState(false);
    const [editProfileOpen, setEditProfileOpen] = useState(false);

    const { control, handleSubmit, setValue, watch, reset } = useForm<CreateStreetAgentProfileFormValues>({
        resolver: zodResolver(createStreetAgentProfileSchema) as any,
        defaultValues,
        mode: "all",
        reValidateMode: "onChange",
    });

    const imageUrl = watch("imageUrl");
    const profile = createdProfile ?? resumeProfile ?? null;
    const profileId = profile?.id ?? resumeId;

    useEffect(() => {
        if (!resumeProfile || hydratedResume) return;

        if (resumeProfile.contractDocumentUrl) {
            setCreatedProfile(resumeProfile);
            setActiveStep(2);
            setHydratedResume(true);
            return;
        }

        if (resumeProfile.status === "PENDING" || resumeProfile.contractCode) {
            reset(toFormValues(resumeProfile));
            setCreatedProfile(resumeProfile);
            setActiveStep(1);
            setHydratedResume(true);
            return;
        }

        reset(toFormValues(resumeProfile));
        setCreatedProfile(resumeProfile);
        setActiveStep(0);
        setHydratedResume(true);
    }, [resumeProfile, hydratedResume, reset]);

    const defaultsAppliedRef = useRef(false);

    useEffect(() => {
        if (resumeProfile || defaultsAppliedRef.current) return;
        if (vendorDefaults?.defaultContractMaxDailyCap != null) {
            setValue("contractMaxDailyCap", vendorDefaults.defaultContractMaxDailyCap);
            defaultsAppliedRef.current = true;
        }
    }, [resumeProfile, setValue, vendorDefaults]);

    useEffect(() => {
        if (isResumeError && resumeId) {
            toast.error("Không tải được hồ sơ PENDING để tiếp tục.");
        }
    }, [isResumeError, resumeId]);

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

    const onSaveAndCreateContract = (data: CreateStreetAgentProfileFormValues) => {
        if (profileId) {
            setActiveStep(1);
            return;
        }

        const payload = {
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
        };

        create(payload, {
            onSuccess: (response) => {
                if (!response.success || !response.data) {
                    toast.error(response.message || "Tạo hồ sơ thất bại");
                    return;
                }
                toast.success(response.message || "Đã lưu hồ sơ PENDING và tạo mã hợp đồng.");
                setCreatedProfile(response.data);
                setActiveStep(1);
                setSearchParams({ resumeId: String(response.data.id) }, { replace: true });
            },
        });
    };

    const handlePrintContract = async () => {
        if (!profileId) return;
        try {
            await openStreetAgentContractPrint(profileId);
        } catch (error: any) {
            toast.error(
                error?.message ||
                    error?.response?.data?.message ||
                    "Không mở được hợp đồng PDF"
            );
        }
    };

    const uploadSignedContractFile = useCallback(async (file: File) => {
        if (!profileId) {
            throw new Error("Chưa có hồ sơ để tải lên.");
        }

        const response = await uploadSignedAsync({ id: profileId, file });
        if (!response.success || !response.data) {
            throw new Error(response.message || "Upload bản ký thất bại");
        }

        setCreatedProfile(response.data);
        setActiveStep(2);
        void refetchResume();
        return response.data.contractDocumentUrl || "";
    }, [profileId, refetchResume, uploadSignedAsync]);

    const handlePendingSignedFileChange = (value: File | string | null) => {
        if (!value || typeof value === "string") {
            setPendingSignedFile(null);
            return;
        }

        if (!SIGNED_DOC_TYPES.includes(value.type)) {
            toast.error("Chỉ chấp nhận PDF, JPG hoặc PNG.");
            setPendingSignedFile(null);
            return;
        }
        if (value.size > SIGNED_DOC_MAX_SIZE) {
            toast.error("File quá lớn. Tối đa 10MB.");
            setPendingSignedFile(null);
            return;
        }

        setPendingSignedFile(value);
    };

    const handleConfirmSignedUpload = async () => {
        if (!pendingSignedFile) return;

        try {
            await uploadSignedContractFile(pendingSignedFile);
            setPendingSignedFile(null);
        } catch (error: unknown) {
            // HTTP errors are already toasted by the global API interceptor.
            if (axios.isAxiosError(error) && error.response) {
                return;
            }
            const message = error instanceof Error ? error.message : "Upload bản ký thất bại";
            toast.error(message);
        }
    };

    if (resumeId && isLoadingResume && !hydratedResume) {
        return (
            <Box sx={{ maxWidth: "1200px", mx: "auto" }}>
                <PageHeader
                    title="Tạo hồ sơ người bán vé số"
                    breadcrumbItems={[
                        { label: "Dashboard", to: "/" },
                        { label: "Người bán vé số", to: ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.LIST },
                        { label: "Tiếp tục hoàn thiện" },
                    ]}
                />
                <SpinnerLoading />
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: "1200px", mx: "auto" }}>
            <PageHeader
                title="Tạo hồ sơ người bán vé số"
                breadcrumbItems={[
                    { label: "Dashboard", to: "/" },
                    { label: "Người bán vé số", to: ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.LIST },
                    { label: resumeId ? "Tiếp tục hoàn thiện" : "Tạo hồ sơ" },
                ]}
            />

            <Card
                sx={{
                    p: 3,
                    mb: 3,
                    borderRadius: "var(--shape-borderRadius-lg)",
                    boxShadow: "var(--customShadows-card)",
                }}
            >
                <Stepper activeStep={activeStep} alternativeLabel>
                    {STEPS.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>
            </Card>

            {activeStep === 0 && (
                <form onSubmit={handleSubmit(onSaveAndCreateContract)}>
                    <StreetAgentProfileForm
                        mode="create"
                        control={control}
                        setValue={setValue}
                        imageUrl={imageUrl}
                        isUploading={isUploading}
                        fileInputRef={fileInputRef}
                        onOpenFile={handleOpenFile}
                        onFileChange={handleFileChange}
                        depositBalance={0}
                        statusChip="PENDING"
                        contractMaxDailyCap={profile?.contractMaxDailyCap}
                        effectiveDailyCap={profile?.effectiveDailyCap}
                        vendorDefaults={vendorDefaults}
                        footer={
                            <Button
                                type="submit"
                                loading={isCreating}
                                label="Lưu thông tin & tạo hợp đồng"
                                loadingLabel="Đang lưu..."
                            />
                        }
                    />
                </form>
            )}

            {activeStep === 1 && profileId && (
                <Card
                    sx={{
                        p: { xs: 3, md: 4 },
                        borderRadius: "var(--shape-borderRadius-lg)",
                        boxShadow: "var(--customShadows-card)",
                    }}
                >
                    <Stack spacing={3}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                                    Hoàn thiện hồ sơ người bán vé số
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    In hợp đồng, ký xác nhận rồi tải bản đã ký lên hệ thống.
                                </Typography>
                                <Button
                                    variant="outlined"
                                    color="inherit"
                                    onClick={() => setEditProfileOpen(true)}
                                    label="Chỉnh sửa thông tin hồ sơ"
                                    sx={{ mt: 1.5, fontWeight: 700, borderRadius: "8px" }}
                                />
                            </Box>
                            <Stack
                                spacing={0.5}
                                sx={{
                                    textAlign: { xs: "left", sm: "right" },
                                    alignItems: { xs: "flex-start", sm: "flex-end" },
                                }}
                            >
                                <Typography variant="caption" color="text.secondary" display="block">
                                    Mã hợp đồng
                                </Typography>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                    {profile?.contractCode || "—"}
                                </Typography>
                                {profile?.status === "PENDING" ? (
                                    <Chip label="Đang chờ" size="small" sx={PENDING_STATUS_CHIP_SX} />
                                ) : null}
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                    Hiệu lực: {profile?.contractStartDate ? profile.contractStartDate.split("-").reverse().join("/") : "—"} - {profile?.contractEndDate ? profile.contractEndDate.split("-").reverse().join("/") : "—"}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Hạn mức: {profile?.contractMaxDailyCap != null ? profile.contractMaxDailyCap : "—"} vé/ngày
                                </Typography>
                                <Button
                                    variant="contained"
                                    startIcon={<PictureAsPdfIcon />}
                                    onClick={handlePrintContract}
                                    disabled={!profile?.contractCode}
                                    label="Xem / In hợp đồng"
                                    sx={{
                                        mt: 0.75,
                                        fontWeight: 700,
                                        borderRadius: "8px",
                                        boxShadow: "none",
                                        minWidth: { sm: 200 },
                                    }}
                                />
                            </Stack>
                        </Box>

                        <UploadSingleFile
                            label="Bản hợp đồng đã ký"
                            value={pendingSignedFile}
                            onChange={handlePendingSignedFileChange}
                            useRawFile
                            disabled={isUploadingSigned}
                            maxFileSizeMb={10}
                            accept={SIGNED_DOC_ACCEPT}
                        />

                        {pendingSignedFile ? (
                            <Stack direction="row" justifyContent="flex-end" spacing={1.5}>
                                <Button
                                    variant="outlined"
                                    color="inherit"
                                    disabled={isUploadingSigned}
                                    onClick={() => setPendingSignedFile(null)}
                                    label="Chọn lại"
                                    sx={{ fontWeight: 700, borderRadius: "8px" }}
                                />
                                <Button
                                    variant="contained"
                                    loading={isUploadingSigned}
                                    onClick={handleConfirmSignedUpload}
                                    label="Xác nhận"
                                    loadingLabel="Đang tải lên..."
                                    sx={{ fontWeight: 700, borderRadius: "8px", minWidth: 140 }}
                                />
                            </Stack>
                        ) : null}
                    </Stack>
                </Card>
            )}

            {activeStep === 2 && profile && (
                <Card
                    sx={{
                        p: 4,
                        borderRadius: "var(--shape-borderRadius-lg)",
                        boxShadow: "var(--customShadows-card)",
                    }}
                >
                    <Stack spacing={2.5} alignItems="flex-start">
                        <Alert severity="success" sx={{ width: "100%" }}>
                            Đã hoàn tất — người bán vé số có thể nhận vé.
                        </Alert>

                        <Stack spacing={0.5}>
                            <Typography variant="body2">
                                <Box component="span" sx={{ color: "text.secondary" }}>
                                    Tên:{" "}
                                </Box>
                                {`${profile.lastName || ""} ${profile.firstName || ""}`.trim() || "—"}
                            </Typography>
                            <Typography variant="body2">
                                <Box component="span" sx={{ color: "text.secondary" }}>
                                    Số điện thoại:{" "}
                                </Box>
                                {profile.phone || "—"}
                            </Typography>
                        </Stack>

                        <Stack direction="row" spacing={1.5} flexWrap="wrap">
                            <Button
                                variant="contained"
                                onClick={() => router.push(ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.LIST)}
                                label="Về danh sách"
                                sx={{ fontWeight: 700, borderRadius: "8px" }}
                            />
                            {profile.contractDocumentUrl ? (
                                <Button
                                    variant="outlined"
                                    color="inherit"
                                    startIcon={<PictureAsPdfIcon />}
                                    onClick={() => setViewSignedOpen(true)}
                                    label="Xem bản hợp đồng"
                                    sx={{ fontWeight: 700, borderRadius: "8px" }}
                                />
                            ) : null}
                        </Stack>
                    </Stack>
                </Card>
            )}

            <StreetAgentProfileEditModal
                open={editProfileOpen}
                onClose={() => setEditProfileOpen(false)}
                profileId={profileId}
                vendorDefaults={vendorDefaults}
                onUpdated={(updatedProfile) => {
                    setCreatedProfile(updatedProfile);
                    reset(toFormValues(updatedProfile));
                    void refetchResume();
                }}
            />

            <ContractDocumentViewerDialog
                open={viewSignedOpen}
                url={profile?.contractDocumentUrl}
                fileName={profile?.contractCode ? `Hop-dong-da-ky-${profile.contractCode}` : undefined}
                onClose={() => setViewSignedOpen(false)}
            />
        </Box>
    );
};
