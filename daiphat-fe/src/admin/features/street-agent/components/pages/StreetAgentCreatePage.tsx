"use client";

import { PageHeader } from "../../../../components/ui/PageHeader";
import {
    useCreateStreetAgentProfile,
    useStreetAgentProfileDetail,
    useUploadStreetAgentSignedContract,
} from "../../hooks/useStreetAgent";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    createStreetAgentProfileSchema,
    CreateStreetAgentProfileFormValues,
} from "../../schemas/street-agent.schema";
import { ROUTES } from "../../../../constants/routes";
import { toast } from "react-toastify";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router-dom";
import {
    Alert,
    Box,
    Button,
    Card,
    Chip,
    CircularProgress,
    Stack,
    Step,
    StepLabel,
    Stepper,
    Typography,
} from "@mui/material";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { uploadAdminImage } from "../../../../api/upload.api";
import { LoadingButton } from "../../../../components/ui/LoadingButton";
import { StreetAgentProfileForm } from "../sections/StreetAgentProfileForm";
import {
    parseCoverageAreaCodes,
    serializeCoverageAreaCodes,
} from "../../constants/coverageAreas";
import { useVendorSettingsDefaults } from "../../hooks/useVendorSettingsDefaults";
import {
    openStreetAgentContractPrint,
} from "../../services/streetAgentService";
import { StreetAgentProfile } from "../../types/street-agent.type";
import { SignedContractUploadDialog } from "../SignedContractUploadDialog";
import { ContractDocumentViewerDialog } from "../ContractDocumentViewerDialog";

const SIGNED_DOC_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const SIGNED_DOC_MAX_SIZE = 10 * 1024 * 1024;

const STEPS = ["Thông tin vendor", "In & ký hợp đồng", "Hoàn tất hồ sơ"] as const;

const defaultValues: CreateStreetAgentProfileFormValues = {
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

const toFormValues = (profile: StreetAgentProfile): CreateStreetAgentProfileFormValues => ({
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

export const StreetAgentCreatePage = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const resumeIdParam = searchParams.get("resumeId");
    const resumeId = resumeIdParam && /^\d+$/.test(resumeIdParam) ? Number(resumeIdParam) : null;

    const { mutate: create, isPending: isCreating } = useCreateStreetAgentProfile();
    const { mutate: uploadSigned, isPending: isUploadingSigned } = useUploadStreetAgentSignedContract();
    const {
        data: resumeProfile,
        isLoading: isLoadingResume,
        isError: isResumeError,
        refetch: refetchResume,
    } = useStreetAgentProfileDetail(resumeId ?? undefined);
    const { defaults: vendorDefaults } = useVendorSettingsDefaults();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const signedFileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [activeStep, setActiveStep] = useState(0);
    const [createdProfile, setCreatedProfile] = useState<StreetAgentProfile | null>(null);
    const [hydratedResume, setHydratedResume] = useState(false);
    const [pendingSignedFile, setPendingSignedFile] = useState<File | null>(null);
    const [viewSignedOpen, setViewSignedOpen] = useState(false);

    const { control, handleSubmit, setValue, watch, reset } = useForm<CreateStreetAgentProfileFormValues>({
        resolver: zodResolver(createStreetAgentProfileSchema) as any,
        defaultValues,
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
            coverageArea: serializeCoverageAreaCodes(data.coverageAreaCodes || []),
            commissionRate: data.commissionRate ?? undefined,
            contractStartDate: data.contractStartDate || undefined,
            contractEndDate: data.contractEndDate || undefined,
            dailyTicketCap: data.dailyTicketCap ?? undefined,
            depositBalance: 0,
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
            onError: (error: any) => {
                toast.error(error.response?.data?.message || "Tạo hồ sơ thất bại");
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

    const handleSignedFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file || !profileId) return;

        if (!SIGNED_DOC_TYPES.includes(file.type)) {
            toast.error("Chỉ chấp nhận PDF, JPG hoặc PNG.");
            return;
        }
        if (file.size > SIGNED_DOC_MAX_SIZE) {
            toast.error("File quá lớn. Tối đa 10MB.");
            return;
        }

        setPendingSignedFile(file);
    };

    const handleConfirmSignedUpload = (file: File) => {
        if (!profileId) return;
        uploadSigned(
            { id: profileId, file },
            {
                onSuccess: (response) => {
                    if (!response.success || !response.data) {
                        toast.error(response.message || "Upload bản ký thất bại");
                        return;
                    }
                    toast.success(response.message || "Đã đính kèm bản hợp đồng đã ký.");
                    setPendingSignedFile(null);
                    setCreatedProfile(response.data);
                    setActiveStep(2);
                    void refetchResume();
                },
                onError: (error: any) => {
                    toast.error(error.response?.data?.message || "Upload bản ký thất bại");
                },
            }
        );
    };

    const statusLabel = useMemo(() => {
        if (!profile?.status) return "—";
        if (profile.status === "ACTIVE") return "ACTIVE · Đã đủ điều kiện nhận vé";
        if (profile.status === "PENDING") return "PENDING · Chờ bản hợp đồng đã ký";
        return profile.status;
    }, [profile?.status]);

    if (resumeId && isLoadingResume && !hydratedResume) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: "1200px", mx: "auto" }}>
            <PageHeader
                title="Tạo hồ sơ đại lý bán dạo"
                breadcrumbItems={[
                    { label: "Dashboard", to: "/" },
                    { label: "Quản lý tài khoản", to: ROUTES.ADMIN.ACCOUNTS.ADMIN.LIST },
                    { label: "Đại lý bán dạo", to: ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.LIST },
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
                        imageUrl={imageUrl}
                        isUploading={isUploading}
                        fileInputRef={fileInputRef}
                        onOpenFile={handleOpenFile}
                        onFileChange={handleFileChange}
                        depositBalance={0}
                        statusChip="PENDING"
                        vendorDefaults={vendorDefaults}
                        footer={
                            <LoadingButton
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
                        p: { xs: 3, md: 4, lg: 5 },
                        borderRadius: "var(--shape-borderRadius-lg)",
                        boxShadow: "var(--customShadows-card)",
                        maxWidth: 720,
                        mx: "auto",
                    }}
                >
                    <Stack spacing={4}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                                    Hoàn thiện hồ sơ đại lý
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Vui lòng thực hiện các bước dưới đây để kích hoạt tài khoản
                                </Typography>
                            </Box>
                            <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    Mã hợp đồng
                                </Typography>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                                    {profile?.contractCode || "—"}
                                </Typography>
                                <Chip label={statusLabel} size="small" color={profile?.status === "PENDING" ? "warning" : "default"} sx={{ height: 22, fontSize: "0.7rem", fontWeight: 700 }} />
                            </Box>
                        </Box>

                        <Box>
                            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                                <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: "var(--palette-primary-main, #00A76F)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                                    1
                                </Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                    In hợp đồng bản cứng
                                </Typography>
                            </Stack>
                            <Box sx={{ p: 2.5, border: "1px solid var(--palette-divider, #e0e0e0)", borderRadius: 2, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2, bgcolor: "var(--palette-background-neutral, #f4f6f8)" }}>
                                <Typography variant="body2" color="text.secondary" sx={{ flex: 1, minWidth: 200 }}>
                                    In file PDF hợp đồng và đưa cho đại lý ký xác nhận.
                                </Typography>
                                <Button
                                    variant="contained"
                                    color="inherit"
                                    startIcon={<PictureAsPdfIcon />}
                                    onClick={handlePrintContract}
                                    disabled={!profile?.contractCode}
                                    sx={{ fontWeight: 700, borderRadius: "8px", boxShadow: "none" }}
                                >
                                    Xem / In hợp đồng
                                </Button>
                            </Box>
                        </Box>

                        <Box>
                            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                                <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: "var(--palette-primary-main, #00A76F)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                                    2
                                </Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                    Tải lên bản đã ký
                                </Typography>
                            </Stack>

                            <Box 
                                onClick={() => !isUploadingSigned && signedFileInputRef.current?.click()}
                                sx={{
                                    width: "100%",
                                    border: "2px dashed var(--palette-divider, #e0e0e0)",
                                    borderRadius: 2,
                                    p: 5,
                                    bgcolor: "var(--palette-background-neutral, #f4f6f8)",
                                    cursor: isUploadingSigned ? "default" : "pointer",
                                    transition: "all 0.2s",
                                    textAlign: "center",
                                    "&:hover": {
                                        bgcolor: isUploadingSigned ? "var(--palette-background-neutral)" : "var(--palette-action-hover, rgba(99, 115, 129, 0.08))",
                                        borderColor: "var(--palette-text-primary, #212B36)"
                                    }
                                }}
                            >
                                <input
                                    type="file"
                                    ref={signedFileInputRef}
                                    onChange={handleSignedFileChange}
                                    className="hidden"
                                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                                />
                                
                                {isUploadingSigned ? (
                                    <Stack spacing={2} alignItems="center">
                                        <CircularProgress size={32} thickness={4} sx={{ color: "var(--palette-text-primary)" }} />
                                        <Typography variant="subtitle2">Đang tải lên bản đã ký...</Typography>
                                    </Stack>
                                ) : (
                                    <Stack spacing={2} alignItems="center">
                                        <Box sx={{ 
                                            width: 64, height: 64, borderRadius: "50%", 
                                            bgcolor: "var(--palette-primary-lighter, #FFE7D9)", 
                                            color: "var(--palette-primary-dark, #B72136)", 
                                            display: "flex", alignItems: "center", justifyContent: "center" 
                                        }}>
                                            <CloudUploadIcon fontSize="large" />
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                                                Kéo thả hoặc nhấn để tải lên bản đã ký
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Hỗ trợ định dạng: PDF, JPG, PNG. Tối đa 10MB.
                                            </Typography>
                                        </Box>
                                    </Stack>
                                )}
                            </Box>
                        </Box>

                        <Box sx={{ pt: 2, borderTop: "1px solid var(--palette-divider, #e0e0e0)" }}>
                            <Button
                                variant="text"
                                color="inherit"
                                onClick={() => {
                                    if (profileId) {
                                        navigate(`${ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.EDIT}/${profileId}`);
                                        return;
                                    }
                                    setActiveStep(0);
                                }}
                                sx={{ fontWeight: 700, borderRadius: "8px", px: 1, ml: -1 }}
                            >
                                {profileId ? "← Quay lại trang hồ sơ" : "← Quay lại bước 1"}
                            </Button>
                        </Box>
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
                            Hồ sơ đã hoàn tất
                            {profile.status === "ACTIVE"
                                ? " và đang ACTIVE — vendor có thể nhận vé."
                                : `. Trạng thái hiện tại: ${profile.status}.`}
                        </Alert>

                        <Typography variant="body2">
                            {`${profile.lastName || ""} ${profile.firstName || ""}`.trim()} · {profile.phone}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Mã HĐ: {profile.contractCode || "—"}
                        </Typography>
                        {profile.contractDocumentUrl ? (
                            <Button
                                variant="text"
                                onClick={() => setViewSignedOpen(true)}
                                sx={{ fontWeight: 600, px: 0 }}
                            >
                                Xem bản hợp đồng đã ký
                            </Button>
                        ) : null}

                        <Stack direction="row" spacing={1.5}>
                            <Button
                                variant="contained"
                                onClick={() => navigate(ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.LIST)}
                                sx={{ fontWeight: 700, borderRadius: "8px" }}
                            >
                                Về danh sách
                            </Button>
                            <Button
                                variant="outlined"
                                component={RouterLink}
                                to={`${ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.EDIT}/${profile.id}`}
                                sx={{ fontWeight: 700, borderRadius: "8px" }}
                            >
                                Mở trang chỉnh sửa
                            </Button>
                        </Stack>
                    </Stack>
                </Card>
            )}

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
        </Box>
    );
};
