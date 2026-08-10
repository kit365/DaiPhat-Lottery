"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Autocomplete,
    Avatar,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { toast } from "react-toastify";
import { REGION_DATA } from "../../../../constants/region.constants";
import { STATUS_LABELS } from "../configs/constants";
import {
    COVERAGE_AREA_OPTIONS,
    CoverageAreaOption,
    parseCoverageAreaCodes,
    serializeCoverageAreaCodes,
} from "../../constants/coverageAreas";
import {
    useStreetAgentProfileDetail,
    useUpdateStreetAgentProfile,
} from "../../hooks/useStreetAgent";

const PROVINCE_OPTIONS = Array.from(new Set(Object.values(REGION_DATA).flat())).sort((a, b) =>
    a.localeCompare(b, "vi")
);

const fieldSx = {
    "& .MuiOutlinedInput-root": {
        borderRadius: "var(--shape-borderRadius)",
        fontSize: "0.875rem",
        bgcolor: "var(--palette-background-paper)",
    },
    "& .MuiInputLabel-root": {
        fontSize: "0.875rem",
    },
};

const sectionTitleSx = {
    fontSize: "0.8125rem",
    fontWeight: 700,
    color: "var(--palette-text-secondary)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    mb: 1.5,
};

const twoColumnGridSx = {
    display: "grid",
    gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
    gap: 2,
};

interface StreetAgentQuickUpdateModalProps {
    open: boolean;
    onClose: () => void;
    id: number | null;
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <Typography sx={sectionTitleSx}>{children}</Typography>
);

export const StreetAgentQuickUpdateModal = ({ open, onClose, id }: StreetAgentQuickUpdateModalProps) => {
    const { data: profile, isLoading } = useStreetAgentProfileDetail(id ?? undefined);
    const { mutate: update, isPending } = useUpdateStreetAgentProfile();

    const [formValues, setFormValues] = useState({
        status: "ACTIVE",
        firstName: "",
        lastName: "",
        phone: "",
        cccd: "",
        contactProvince: "",
        coverageAreaCodes: [] as string[],
    });

    useEffect(() => {
        if (profile) {
            setFormValues({
                status: profile.status || "ACTIVE",
                firstName: profile.firstName || "",
                lastName: profile.lastName || "",
                phone: profile.phone || "",
                cccd: profile.cccd || "",
                contactProvince: profile.contactProvince || "",
                coverageAreaCodes: parseCoverageAreaCodes(profile.coverageArea),
            });
        }
    }, [profile, open]);

    const fullName = useMemo(
        () => `${formValues.lastName} ${formValues.firstName}`.trim() || "Đại lý bán dạo",
        [formValues.firstName, formValues.lastName]
    );

    const handleInputChange = (field: string, value: string) => {
        setFormValues((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !profile) return;

        if (!formValues.firstName.trim()) {
            toast.error("Vui lòng nhập tên");
            return;
        }
        if (!formValues.lastName.trim()) {
            toast.error("Vui lòng nhập họ");
            return;
        }
        if (!formValues.phone.trim()) {
            toast.error("Vui lòng nhập số điện thoại");
            return;
        }
        if (!formValues.cccd.trim()) {
            toast.error("Vui lòng nhập số CCCD");
            return;
        }

        update(
            {
                id,
                data: {
                    firstName: formValues.firstName.trim(),
                    lastName: formValues.lastName.trim(),
                    phone: formValues.phone.trim(),
                    cccd: formValues.cccd.trim(),
                    imageUrl: profile.imageUrl || undefined,
                    contactAddress: profile.contactAddress || undefined,
                    contactProvince: formValues.contactProvince || undefined,
                    coverageArea: serializeCoverageAreaCodes(formValues.coverageAreaCodes),
                    contractStartDate: profile.contractStartDate || undefined,
                    contractEndDate: profile.contractEndDate || undefined,
                },
            },
            {
                onSuccess: (response) => {
                    if (response.success) {
                        toast.success(response.message || "Cập nhật hồ sơ đại lý bán dạo thành công!");
                        onClose();
                    } else {
                        toast.error(response.message || "Cập nhật thất bại");
                    }
                },
                onError: (error: any) => {
                    toast.error(error.response?.data?.message || "Cập nhật thất bại");
                },
            }
        );
    };

    const getStatusMessage = (status: string) => {
        if (status === "INACTIVE") {
            return "Đại lý đang ngưng hoạt động";
        }
        return "Đại lý đang hoạt động bình thường";
    };

    const getAlertSeverity = (status: string) => (status === "INACTIVE" ? "warning" : "success");

    if (!open) return null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: "16px",
                    boxShadow: "var(--customShadows-dialog, 0px 24px 48px -8px rgba(0, 0, 0, 0.16))",
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
                    borderBottom: "1px solid var(--palette-background-neutral)",
                }}
            >
                <Typography component="span" sx={{ fontWeight: 700, fontSize: "1.125rem" }}>
                    Quick update
                </Typography>
                <IconButton onClick={onClose} size="small" sx={{ color: "text.secondary" }}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ px: 3, py: 3 }}>
                {isLoading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                        <CircularProgress size={32} />
                    </Box>
                ) : (
                    <Box component="form" onSubmit={handleSubmit}>
                        <Stack spacing={3}>
                            <Stack
                                direction={{ xs: "column", sm: "row" }}
                                spacing={2}
                                alignItems={{ xs: "flex-start", sm: "center" }}
                                sx={{
                                    p: 2,
                                    borderRadius: "12px",
                                    bgcolor: "var(--palette-background-neutral)",
                                }}
                            >
                                <Avatar
                                    src={profile?.imageUrl}
                                    alt={fullName}
                                    sx={{
                                        width: 56,
                                        height: 56,
                                        fontWeight: 700,
                                        bgcolor: "rgba(145, 158, 171, 0.24)",
                                        color: "var(--palette-primary-main)",
                                    }}
                                >
                                    {formValues.lastName?.charAt(0)?.toUpperCase() || "Đ"}
                                </Avatar>

                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography
                                        variant="subtitle1"
                                        sx={{ fontWeight: 700, color: "var(--palette-text-primary)", lineHeight: 1.3 }}
                                    >
                                        {fullName}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: "var(--palette-text-secondary)" }}>
                                        {formValues.cccd || "Chưa có CCCD"}
                                    </Typography>
                                </Box>

                                <Chip
                                    label={STATUS_LABELS[formValues.status] || formValues.status}
                                    sx={{
                                        fontWeight: 700,
                                        minWidth: { xs: "100%", sm: 140 },
                                        bgcolor:
                                            formValues.status === "ACTIVE"
                                                ? "rgba(34, 197, 94, 0.16)"
                                                : formValues.status === "PENDING"
                                                  ? "rgba(255, 171, 0, 0.16)"
                                                  : "rgba(145, 158, 171, 0.16)",
                                        color:
                                            formValues.status === "ACTIVE"
                                                ? "rgb(17, 141, 87)"
                                                : formValues.status === "PENDING"
                                                  ? "rgb(183, 110, 0)"
                                                  : "var(--palette-text-secondary)",
                                    }}
                                />
                            </Stack>

                            <Alert
                                icon={<InfoOutlinedIcon fontSize="inherit" />}
                                severity={getAlertSeverity(formValues.status)}
                                sx={{
                                    borderRadius: "12px",
                                    fontSize: "0.875rem",
                                    py: 0.5,
                                    alignItems: "center",
                                }}
                            >
                                {getStatusMessage(formValues.status)}
                            </Alert>

                            <Box>
                                <SectionTitle>Thông tin cá nhân</SectionTitle>
                                <Box sx={twoColumnGridSx}>
                                    <TextField
                                        label="Họ"
                                        fullWidth
                                        value={formValues.lastName}
                                        onChange={(e) => handleInputChange("lastName", e.target.value)}
                                        sx={fieldSx}
                                    />
                                    <TextField
                                        label="Tên"
                                        fullWidth
                                        value={formValues.firstName}
                                        onChange={(e) => handleInputChange("firstName", e.target.value)}
                                        sx={fieldSx}
                                    />
                                    <TextField
                                        label="Số điện thoại"
                                        fullWidth
                                        value={formValues.phone}
                                        onChange={(e) => handleInputChange("phone", e.target.value)}
                                        sx={fieldSx}
                                    />
                                    <TextField
                                        label="Số CCCD"
                                        fullWidth
                                        value={formValues.cccd}
                                        onChange={(e) => handleInputChange("cccd", e.target.value)}
                                        sx={fieldSx}
                                    />
                                </Box>
                            </Box>

                            <Divider sx={{ borderStyle: "dashed", borderColor: "var(--palette-text-disabled)33" }} />

                            <Box>
                                <SectionTitle>Khu vực kinh doanh</SectionTitle>
                                <Box sx={twoColumnGridSx}>
                                    <TextField
                                        select
                                        label="Tỉnh/thành"
                                        fullWidth
                                        value={formValues.contactProvince}
                                        onChange={(e) => handleInputChange("contactProvince", e.target.value)}
                                        sx={fieldSx}
                                    >
                                        <MenuItem value="">Chọn tỉnh/thành</MenuItem>
                                        {PROVINCE_OPTIONS.map((province) => (
                                            <MenuItem key={province} value={province}>
                                                {province}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                    <Autocomplete
                                        multiple
                                        options={COVERAGE_AREA_OPTIONS}
                                        value={COVERAGE_AREA_OPTIONS.filter((option) =>
                                            formValues.coverageAreaCodes.includes(option.code)
                                        )}
                                        getOptionLabel={(option: CoverageAreaOption) => option.label}
                                        isOptionEqualToValue={(a, b) => a.code === b.code}
                                        onChange={(_e, next) =>
                                            setFormValues((prev) => ({
                                                ...prev,
                                                coverageAreaCodes: next.map((item) => item.code),
                                            }))
                                        }
                                        renderTags={(value, getTagProps) =>
                                            value.map((option, index) => {
                                                const { key, ...tagProps } = getTagProps({ index });
                                                return (
                                                    <Chip
                                                        key={key}
                                                        label={option.label}
                                                        size="small"
                                                        {...tagProps}
                                                        sx={{ fontWeight: 600 }}
                                                    />
                                                );
                                            })
                                        }
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Địa bàn bán"
                                                placeholder="+ Thêm khu vực"
                                                sx={{ ...fieldSx, gridColumn: { sm: "1 / -1" } }}
                                            />
                                        )}
                                        sx={{ gridColumn: { sm: "1 / -1" } }}
                                    />
                                </Box>
                            </Box>
                        </Stack>
                    </Box>
                )}
            </DialogContent>

            <DialogActions
                sx={{
                    px: 3,
                    py: 2.5,
                    gap: 1.5,
                    borderTop: "1px solid var(--palette-background-neutral)",
                    bgcolor: "rgba(145, 158, 171, 0.04)",
                }}
            >
                <Button
                    onClick={onClose}
                    variant="outlined"
                    sx={{
                        borderRadius: "8px",
                        textTransform: "none",
                        px: 3,
                        py: 1,
                        borderColor: "var(--palette-text-disabled)33",
                        color: "var(--palette-text-primary)",
                        "&:hover": {
                            borderColor: "var(--palette-text-primary)",
                            bgcolor: "rgba(0, 0, 0, 0.04)",
                        },
                    }}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={isPending || isLoading}
                    sx={{
                        borderRadius: "8px",
                        textTransform: "none",
                        px: 3,
                        py: 1,
                        bgcolor: "var(--palette-text-primary, #1C252E)",
                        color: "var(--palette-common-white, #FFFFFF)",
                        "&:hover": {
                            bgcolor: "rgba(28, 37, 46, 0.8)",
                        },
                    }}
                >
                    {isPending ? <CircularProgress size={20} color="inherit" /> : "Update"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
