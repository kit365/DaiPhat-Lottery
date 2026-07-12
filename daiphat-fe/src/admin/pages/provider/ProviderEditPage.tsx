import { Alert, Box, Stack, TextField, ThemeProvider, useTheme, CircularProgress, createTheme, MenuItem, Typography } from "@mui/material";
import { REGION_DATA } from "../../constants/region.constants";
import { DAYS_OF_WEEK } from "../../constants/schedule.constants";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { Title } from "../../components/ui/Title";
import { TimePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import { Tiptap } from "../../components/layouts/titap/Tiptap";
import { useState, useEffect, type Dispatch, type SetStateAction, useMemo } from "react";
import { CollapsibleCard } from "../../components/ui/CollapsibleCard";
import { useProviderDetail, useUpdateProvider, useUploadProviderImage } from "./hooks/useProvider";
import { useRegions } from "../region/hooks/useRegion";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { CreateProviderFormValues, createProviderSchema } from "../../schemas/provider.schema";
import { SwitchButton } from "../../components/ui/SwitchButton";
import { prefixAdmin } from "../../constants/routes";
import { toast } from "react-toastify";
import { LoadingButton } from "../../components/ui/LoadingButton";
import { FormUploadSingleFile } from "../../components/upload/FormUploadSingleFile";
import { useParams } from "react-router-dom";
import {
    ACTIVATION_FIELD_ORDER,
    ProviderActivationField,
    PROVIDER_ACTIVATION_FIELD_LABELS,
    buildActivationIncompleteToast,
    getActivationFieldHelperText,
    getMissingProviderFields,
    isFieldMissing,
    missingFieldInputSx,
    scrollToFirstMissingField,
} from "./utils/provider-activation";

export const ProviderEditPage = () => {
    const { id } = useParams();
    const [expandedDetail, setExpandedDetail] = useState(true);
    const [activationErrorsVisible, setActivationErrorsVisible] = useState(false);

    const toggle = (setter: Dispatch<SetStateAction<boolean>>) =>
        () => setter(prev => !prev);

    const outerTheme = useTheme();

    const localTheme = useMemo(() => createTheme(outerTheme, {
        components: {
            MuiCard: {
                styleOverrides: {
                    root: {
                        backgroundImage: "none !important",
                        backdropFilter: "none !important",
                        backgroundColor: "var(--palette-background-paper) !important",
                        boxShadow: "var(--customShadows-card)",
                        borderRadius: "var(--shape-borderRadius-lg)",
                        color: "var(--palette-text-primary)",
                    },
                }
            },
            MuiInputLabel: {
                styleOverrides: {
                    root: {
                        fontSize: "1rem",
                    }
                }
            },
            MuiOutlinedInput: {
                styleOverrides: {
                    root: {
                        fontSize: "1rem",
                    }
                }
            }
        }
    }), [outerTheme]);

    const { data: detailRes, isLoading: isLoadingDetail } = useProviderDetail(id);
    const { mutate: update, isPending: isUpdating } = useUpdateProvider();
    const { mutateAsync: uploadImageAsync, isPending: isUploadingImage } = useUploadProviderImage();

    const customUpload = async (file: File) => {
        const res = await uploadImageAsync({ id: id!, file });
        if (!res.success) {
            throw new Error(res.message || "Lỗi tải ảnh lên");
        }
        return res.data?.thumbnailUrl || res.data?.avatar || res.data?.image || "";
    };

    const {
        control,
        handleSubmit,
        reset,
        watch,
        setValue,
        getValues,
    } = useForm<CreateProviderFormValues>({
        resolver: zodResolver(createProviderSchema),
        defaultValues: {
            name: "",
            description: "",
            status: "inactive",
            price: 10000,
            commissionRate: 0.05,
            province: "",
            region: "",
            drawDays: [],
            drawTime: "16:15",
        },
    });

    const { data: regionsRes } = useRegions();
    const regions = regionsRes?.data || [];

    const watchedValues = watch();
    const regionValue = watchedValues.region;
    const provinceOptions = regionValue ? REGION_DATA[regionValue] || [] : [];

    const missingFields = useMemo(() => {
        if (!activationErrorsVisible) {
            return [] as ProviderActivationField[];
        }
        return getMissingProviderFields(watchedValues);
    }, [watchedValues, activationErrorsVisible]);

    const activationHelper = (field: ProviderActivationField, fallback?: string) =>
        isFieldMissing(missingFields, field) ? getActivationFieldHelperText(field) : fallback;

    useEffect(() => {
        if (!detailRes) {
            return;
        }
        reset({
            name: detailRes.name || "",
            description: detailRes.description || "",
            status: detailRes.status || "inactive",
            price: detailRes.price || 10000,
            commissionRate: detailRes.commissionRate ?? undefined,
            province: detailRes.province || "",
            region: detailRes.region || "",
            drawDays: detailRes.drawDays || [],
            drawTime: detailRes.drawTime || "16:15",
            image: detailRes.image || "",
        });

        const backendMissing = Array.isArray(detailRes.missingActivationFields)
            ? (detailRes.missingActivationFields as string[]).filter((field): field is ProviderActivationField =>
                ACTIVATION_FIELD_ORDER.includes(field as ProviderActivationField)
            )
            : [];
        const computedMissing = getMissingProviderFields({
            price: detailRes.price,
            commissionRate: detailRes.commissionRate,
            region: detailRes.region,
            province: detailRes.province,
            drawDays: detailRes.drawDays,
            drawTime: detailRes.drawTime,
        });
        const missing = backendMissing.length > 0 ? backendMissing : computedMissing;
        setActivationErrorsVisible(missing.length > 0);
        if (missing.length > 0) {
            requestAnimationFrame(() => scrollToFirstMissingField(missing));
        }
    }, [detailRes, reset]);

    const handleActiveToggle = (nextActive: boolean) => {
        if (!nextActive) {
            setActivationErrorsVisible(false);
            return true;
        }

        const missing = getMissingProviderFields(getValues());
        if (missing.length > 0) {
            setActivationErrorsVisible(true);
            requestAnimationFrame(() => scrollToFirstMissingField(missing));
            toast.warning(buildActivationIncompleteToast(missing));
            return false;
        }

        setActivationErrorsVisible(false);
        return true;
    };

    const onSubmit = (data: CreateProviderFormValues) => {
        if (data.status === "active") {
            const missing = getMissingProviderFields(data);
            if (missing.length > 0) {
                setActivationErrorsVisible(true);
                setValue("status", "inactive", { shouldDirty: true });
                requestAnimationFrame(() => scrollToFirstMissingField(missing));
                toast.warning(
                    `${buildActivationIncompleteToast(missing)} Hoặc tắt trạng thái Hoạt động trước khi lưu.`
                );
                return;
            }
        }

        const payload = {
            ...data,
            image: typeof data.image === "string" ? data.image : (detailRes?.image || ""),
        };

        update({ id: id!, data: payload }, {
            onSuccess: (response) => {
                if (response.success) {
                    toast.success(response.message || "Cập nhật nhà đài thành công");
                    setActivationErrorsVisible(false);
                } else {
                    toast.error(response.message);
                }
            },
            onError: (err: any) => {
                const message = err?.response?.data?.message || err?.message || "Cập nhật nhà đài thất bại";
                const missing = err?.response?.data?.data?.missingFields;
                if (Array.isArray(missing) && missing.length > 0) {
                    const typedMissing = missing.filter((field: string): field is ProviderActivationField =>
                        ACTIVATION_FIELD_ORDER.includes(field as ProviderActivationField)
                    );
                    setActivationErrorsVisible(true);
                    setValue("status", "inactive", { shouldDirty: true });
                    requestAnimationFrame(() => scrollToFirstMissingField(typedMissing));
                }
                toast.error(message);
            }
        });
    };

    if (isLoadingDetail) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <CircularProgress color="inherit" />
            </Box>
        );
    }

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Chỉnh sửa nhà đài" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: "/" },
                            { label: "Nhà đài", to: `/${prefixAdmin}/provider/list` },
                            { label: "Chỉnh sửa" }
                        ]}
                    />
                </div>
            </div>

            <ThemeProvider theme={localTheme}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Stack sx={{ margin: "0px calc(15 * var(--spacing))", gap: "calc(5 * var(--spacing))" }}>
                        <CollapsibleCard
                            title="Chi tiết"
                            subheader="Cập nhật tiêu đề, mô tả và hình ảnh nhà đài"
                            expanded={expandedDetail}
                            onToggle={toggle(setExpandedDetail)}
                        >
                            <Stack p="calc(3 * var(--spacing))" gap="calc(3 * var(--spacing))">
                                {missingFields.length > 0 && (
                                    <Alert severity="warning" sx={{ whiteSpace: "pre-line" }}>
                                        Nhà đài chưa đủ thông tin bắt buộc để kích hoạt.
                                        {"\n"}
                                        Vui lòng hoàn tất:{" "}
                                        {ACTIVATION_FIELD_ORDER.filter((field) => missingFields.includes(field))
                                            .map((field) => PROVIDER_ACTIVATION_FIELD_LABELS[field])
                                            .join(", ")}
                                        .
                                    </Alert>
                                )}

                                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "calc(3 * var(--spacing)) calc(2 * var(--spacing))" }}>
                                    <Box sx={{ gridColumn: "span 12" }}>
                                        <Controller
                                            name="name"
                                            control={control}
                                            render={({ field, fieldState }) => (
                                                <TextField
                                                    {...field}
                                                    label="Tên nhà đài"
                                                    error={!!fieldState.error}
                                                    helperText={fieldState.error?.message}
                                                    disabled
                                                    fullWidth
                                                />
                                            )}
                                        />
                                    </Box>

                                    <Box sx={{ gridColumn: { xs: "span 12", md: "span 6" } }} data-activation-field="price">
                                        <Controller
                                            name="price"
                                            control={control}
                                            render={({ field, fieldState }) => {
                                                const activationMissing = isFieldMissing(missingFields, "PRICE");
                                                return (
                                                    <TextField
                                                        {...field}
                                                        label="Giá vé"
                                                        value={field.value !== undefined ? new Intl.NumberFormat('vi-VN').format(Number(field.value)) : ''}
                                                        error={!!fieldState.error || activationMissing}
                                                        helperText={fieldState.error?.message || activationHelper("PRICE")}
                                                        onChange={(e) => {
                                                            const rawValue = e.target.value.replace(/\./g, '');
                                                            if (rawValue === '') {
                                                                field.onChange(0);
                                                            } else if (!isNaN(Number(rawValue))) {
                                                                field.onChange(Number(rawValue));
                                                            }
                                                        }}
                                                        fullWidth
                                                        sx={missingFieldInputSx(activationMissing)}
                                                    />
                                                );
                                            }}
                                        />
                                    </Box>
                                    <Box sx={{ gridColumn: { xs: "span 12", md: "span 6" } }} data-activation-field="commissionRate">
                                        <Controller
                                            name="commissionRate"
                                            control={control}
                                            render={({ field, fieldState }) => {
                                                const activationMissing = isFieldMissing(missingFields, "COMMISSION_RATE");
                                                return (
                                                    <TextField
                                                        {...field}
                                                        value={field.value ?? ""}
                                                        onChange={(e) => {
                                                            const raw = e.target.value;
                                                            field.onChange(raw === "" ? undefined : Number(raw));
                                                        }}
                                                        type="number"
                                                        inputProps={{ min: 0, max: 1, step: 0.01 }}
                                                        label="Tỷ lệ hoa hồng"
                                                        helperText={
                                                            fieldState.error?.message
                                                            || activationHelper("COMMISSION_RATE", "VD: 0.05 = 5% (giá trị từ 0 đến 1)")
                                                        }
                                                        error={!!fieldState.error || activationMissing}
                                                        fullWidth
                                                        sx={missingFieldInputSx(activationMissing)}
                                                    />
                                                );
                                            }}
                                        />
                                    </Box>
                                    <Box sx={{ gridColumn: { xs: "span 12", md: "span 6" } }} data-activation-field="region">
                                        <Controller
                                            name="region"
                                            control={control}
                                            render={({ field, fieldState }) => {
                                                const activationMissing = isFieldMissing(missingFields, "REGION");
                                                return (
                                                    <TextField
                                                        {...field}
                                                        select
                                                        label="Vùng miền"
                                                        error={!!fieldState.error || activationMissing}
                                                        helperText={fieldState.error?.message || activationHelper("REGION")}
                                                        onChange={(e) => {
                                                            field.onChange(e);
                                                            setValue("province", "");
                                                        }}
                                                        fullWidth
                                                        sx={missingFieldInputSx(activationMissing)}
                                                    >
                                                        {regions.map((option) => (
                                                            <MenuItem key={option.code} value={option.code}>
                                                                {option.name}
                                                            </MenuItem>
                                                        ))}
                                                    </TextField>
                                                );
                                            }}
                                        />
                                    </Box>
                                    <Box sx={{ gridColumn: { xs: "span 12", md: "span 6" } }} data-activation-field="province">
                                        <Controller
                                            name="province"
                                            control={control}
                                            render={({ field, fieldState }) => {
                                                const activationMissing = isFieldMissing(missingFields, "PROVINCE");
                                                return (
                                                    <TextField
                                                        {...field}
                                                        select
                                                        label="Tỉnh/Thành phố"
                                                        error={!!fieldState.error || activationMissing}
                                                        helperText={fieldState.error?.message || activationHelper("PROVINCE")}
                                                        disabled={!regionValue}
                                                        fullWidth
                                                        sx={missingFieldInputSx(activationMissing)}
                                                    >
                                                        {provinceOptions.map((prov) => (
                                                            <MenuItem key={prov} value={prov}>
                                                                {prov}
                                                            </MenuItem>
                                                        ))}
                                                    </TextField>
                                                );
                                            }}
                                        />
                                    </Box>
                                    <Box sx={{ gridColumn: { xs: "span 12", md: "span 6" } }} data-activation-field="drawDays">
                                        <Controller
                                            name="drawDays"
                                            control={control}
                                            render={({ field, fieldState }) => {
                                                const selectedDays = Array.isArray(field.value) ? field.value : [];
                                                const activationMissing = isFieldMissing(missingFields, "DRAW_SCHEDULE");
                                                const toggleDay = (dayValue: string) => {
                                                    const newSelected = selectedDays.includes(dayValue)
                                                        ? selectedDays.filter((v: string) => v !== dayValue)
                                                        : [...selectedDays, dayValue];
                                                    const ordered = DAYS_OF_WEEK.filter(d => newSelected.includes(d.value)).map(d => d.value);
                                                    field.onChange(ordered);
                                                };

                                                return (
                                                    <TextField
                                                        fullWidth
                                                        label="Lịch quay"
                                                        error={!!fieldState.error || activationMissing}
                                                        helperText={fieldState.error?.message || activationHelper("DRAW_SCHEDULE")}
                                                        InputLabelProps={{ shrink: true }}
                                                        sx={missingFieldInputSx(activationMissing)}
                                                        InputProps={{
                                                            readOnly: true,
                                                            sx: {
                                                                height: '56px',
                                                                '& input': { display: 'none' }
                                                            },
                                                            startAdornment: (
                                                                <Stack direction="row" gap={1} sx={{ py: 0.5, alignItems: 'center' }}>
                                                                    {DAYS_OF_WEEK.map((day) => {
                                                                        const isSelected = selectedDays.includes(day.value);
                                                                        return (
                                                                            <Box
                                                                                key={day.value}
                                                                                onClick={() => toggleDay(day.value)}
                                                                                sx={{
                                                                                    width: 32,
                                                                                    height: 32,
                                                                                    fontSize: '0.875rem',
                                                                                    borderRadius: '50%',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    justifyContent: 'center',
                                                                                    cursor: 'pointer',
                                                                                    backgroundColor: isSelected ? '#10b981' : 'rgba(0, 0, 0, 0.04)',
                                                                                    color: isSelected ? '#fff' : 'text.primary',
                                                                                    fontWeight: isSelected ? 600 : 400,
                                                                                    transition: 'all 0.2s',
                                                                                    '&:hover': {
                                                                                        backgroundColor: isSelected ? '#059669' : 'rgba(0, 0, 0, 0.08)',
                                                                                    }
                                                                                }}
                                                                            >
                                                                                {day.shortLabel}
                                                                            </Box>
                                                                        );
                                                                    })}
                                                                </Stack>
                                                            )
                                                        }}
                                                    />
                                                );
                                            }}
                                        />
                                    </Box>
                                    <Box sx={{ gridColumn: { xs: "span 12", md: "span 6" } }} data-activation-field="drawTime">
                                        <Controller
                                            name="drawTime"
                                            control={control}
                                            render={({ field, fieldState }) => {
                                                const activationMissing = isFieldMissing(missingFields, "DRAW_TIME");
                                                return (
                                                    <TimePicker
                                                        label="Giờ quay"
                                                        value={field.value ? dayjs(`2000-01-01T${field.value}`) : null}
                                                        onChange={(newValue) => {
                                                            field.onChange(newValue ? newValue.format('HH:mm') : '');
                                                        }}
                                                        localeText={{ cancelButtonLabel: 'Hủy' }}
                                                        slotProps={{
                                                            textField: {
                                                                fullWidth: true,
                                                                error: !!fieldState.error || activationMissing,
                                                                helperText: fieldState.error?.message || activationHelper("DRAW_TIME"),
                                                                InputLabelProps: { shrink: true },
                                                                sx: {
                                                                    ...missingFieldInputSx(activationMissing),
                                                                    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                                        borderColor: 'var(--palette-text-primary) !important',
                                                                    },
                                                                    '& .MuiInputLabel-root.Mui-focused': {
                                                                        color: 'var(--palette-text-primary) !important',
                                                                    }
                                                                }
                                                            },
                                                            popper: {
                                                                sx: {
                                                                    '& .Mui-selected, & .Mui-selected:hover': {
                                                                        backgroundColor: '#10b981 !important',
                                                                        color: '#fff !important',
                                                                    },
                                                                    '& .MuiClockPointer-root, & .MuiClock-pin': {
                                                                        backgroundColor: '#10b981 !important',
                                                                    },
                                                                    '& .MuiClockPointer-thumb': {
                                                                        backgroundColor: '#10b981 !important',
                                                                        borderColor: '#10b981 !important',
                                                                    },
                                                                    '& .MuiButton-textPrimary': {
                                                                        color: '#10b981 !important',
                                                                    }
                                                                }
                                                            }
                                                        }}
                                                    />
                                                );
                                            }}
                                        />
                                    </Box>
                                </Box>

                                <Box sx={{ mt: 1 }}>
                                    <div className="mb-3 font-semibold">Ảnh nhà đài (Tùy chọn)</div>
                                    <FormUploadSingleFile
                                        name="image"
                                        control={control}
                                        customUpload={customUpload}
                                    />
                                </Box>

                                <Box sx={{ mt: 1 }}>
                                    <Typography variant="subtitle2" sx={{ mb: '12px', fontWeight: 600, color: 'text.primary' }}>
                                        Mô tả
                                    </Typography>
                                    <Controller
                                        name="description"
                                        control={control}
                                        render={({ field }) => (
                                            <Tiptap
                                                value={field.value ?? ""}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    />
                                </Box>
                            </Stack>
                        </CollapsibleCard>

                        <Box gap="calc(3 * var(--spacing))" sx={{ display: "flex", alignItems: "center" }}>
                            <SwitchButton
                                control={control}
                                name="status"
                                checkedValue="active"
                                uncheckedValue="inactive"
                                onBeforeChange={handleActiveToggle}
                            />
                            <LoadingButton
                                type="submit"
                                loading={isUpdating || isUploadingImage}
                                label="Cập nhật nhà đài"
                                loadingLabel="Đang cập nhật..."
                                sx={{ minHeight: "3rem", minWidth: "4rem" }}
                            />
                        </Box>
                    </Stack>
                </form>
            </ThemeProvider>
        </>
    );
};
