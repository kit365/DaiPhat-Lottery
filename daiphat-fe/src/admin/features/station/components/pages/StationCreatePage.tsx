"use client";

import { Box, IconButton, InputAdornment, Stack, TextField, Tooltip, ThemeProvider, useTheme, createTheme, MenuItem, Typography } from "@mui/material"
import { REGION_DATA } from "../../../../constants/region.constants";
import { DAYS_OF_WEEK } from "../../../../constants/schedule.constants";
import { PageHeader } from "../../../../components/ui/PageHeader"
import { TimePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import { LazyTiptap } from "../../../../components/layouts/titap/LazyTiptap"
import { useState, useMemo, type Dispatch, type SetStateAction } from "react";
import { CollapsibleCard } from "../../../../components/ui/CollapsibleCard";
import { useCreateStation, useUploadStationImage } from "../../hooks/useStation";
import { useRegions } from "../../../region/hooks/useRegion";
import { formatRegionDefaultDrawTime } from "../../../region/types/region.type";
import { zodResolver } from "@hookform/resolvers/zod";
import AutoFixHighOutlinedIcon from "@mui/icons-material/AutoFixHighOutlined";
import { useForm, Controller } from "react-hook-form";
import { CreateStationFormValues, createStationSchema } from "../../schemas/station.schema";

import { prefixAdmin } from "../../../../constants/routes";
import { toast } from "react-toastify";
import { suggestStationCode } from "../../services/stationService";
import { Button } from "../../../../components/ui/Button";
import { FormUploadSingleFile } from "../../../../components/upload/FormUploadSingleFile";

export const StationCreatePage = () => {
    const [expandedDetail, setExpandedDetail] = useState(true);
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

    const {
        control,
        handleSubmit,
        reset,
        watch,
        setValue
    } = useForm<CreateStationFormValues>({
        resolver: zodResolver(createStationSchema) as any,
        defaultValues: {
            name: "",
            code: "",
            description: "",
            status: "active",
            price: 10000,
            province: "",
            region: "",
            drawDays: [],
            drawTime: "16:15",
            commissionRate: 0.1,
            prizeRedemptionOfficialDeadlineDays: "",
        },
    });

    // The generate button asks the backend, because only it knows which codes are
    // already taken by other stations.
    const [suggestingCode, setSuggestingCode] = useState(false);
    const watchedName = watch('name');

    const handleSuggestCode = async () => {
        const name = watchedName?.trim();
        if (!name) {
            return;
        }
        setSuggestingCode(true);
        try {
            const suggested = await suggestStationCode(name, undefined);
            setValue('code', suggested, { shouldDirty: true, shouldValidate: true });
        } catch {
            toast.error('Không tạo được mã tự động. Vui lòng nhập mã thủ công.');
        } finally {
            setSuggestingCode(false);
        }
    };

    const { data: regionsRes } = useRegions();
    const regions = regionsRes?.data || [];

    const regionValue = watch("region");
    const provinceValue = watch("province");

    const provinceOptions = useMemo(() => {
        const baseOptions = regionValue ? REGION_DATA[regionValue] || [] : [];
        if (provinceValue && !baseOptions.includes(provinceValue)) {
            return [provinceValue, ...baseOptions];
        }
        return baseOptions;
    }, [regionValue, provinceValue]);

    const applyRegionDefaultDrawTime = (regionCode: string) => {
        const selectedRegion = regions.find((option) => option.code === regionCode);
        if (selectedRegion?.defaultDrawTime) {
            setValue("drawTime", formatRegionDefaultDrawTime(selectedRegion.defaultDrawTime));
        }
    };

    const { mutate: create, isPending } = useCreateStation();
    const { mutate: uploadImage, isPending: isUploadingImage } = useUploadStationImage();

    const onSubmit = (data: CreateStationFormValues) => {
        const payload = {
            ...data,
            image: "", // Image will be uploaded in the second step
            prizeRedemptionOfficialDeadlineDays:
                data.prizeRedemptionOfficialDeadlineDays === ""
                || data.prizeRedemptionOfficialDeadlineDays == null
                    ? null
                    : Number(data.prizeRedemptionOfficialDeadlineDays),
        };

        create(payload, {
            onSuccess: (response) => {
                if (response.success) {
                    const createdStationId = response.data?.id || response.data?._id;
                    const fileToUpload = data.image instanceof File ? data.image : null;

                    if (createdStationId && fileToUpload) {
                        uploadImage({ id: createdStationId, file: fileToUpload }, {
                            onSuccess: () => {
                                finalizeSuccess(response.message || "");
                            },
                            onError: (uploadErr: any) => {
                                toast.error(uploadErr?.response?.data?.message || uploadErr?.message || "Tạo nhà đài thành công nhưng lỗi tải ảnh lên");
                                finalizeSuccess(response.message || "");
                            }
                        });
                    } else {
                        finalizeSuccess(response.message || "");
                    }

                    function finalizeSuccess(msg: string) {
                        toast.success(msg || "Tạo nhà đài thành công");
                        reset({
                            name: "",
                            description: "",
                            status: "active",
                            type: "TRADITIONAL",
                            price: 10000,
                            province: "",
                            region: "",
                            numberLength: 6,
                            minNumber: 0,
                            maxNumber: 999999,
                            drawDays: [],
                            drawTime: "16:15",
                            commissionRate: 0.1,
                            prizeRedemptionOfficialDeadlineDays: "",
                            displayOrder: 0,
                            image: "",
                        });
                    }
                } else {
                    toast.error(response.message);
                }
            },
            onError: (err: any) => {
                const message = err?.response?.data?.message || err?.message || "Tạo nhà đài thất bại";
                toast.error(message);
            }
        });
    };

    return (
        <>
            <PageHeader
                title="Tạo mới nhà đài"
                breadcrumbItems={[
                            { label: "Dashboard", to: "/" },
                            { label: "Nhà đài", to: `/${prefixAdmin}/provider/list` },
                            { label: "Tạo mới" }
                        ]}
            />
            <ThemeProvider theme={localTheme}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Stack sx={{
                        margin: "0px calc(15 * var(--spacing))",
                        gap: "calc(5 * var(--spacing))"
                    }}>
                        <CollapsibleCard
                            title="Chi tiết"
                            subheader="Tiêu đề, mô tả, hình ảnh..."
                            expanded={expandedDetail}
                            onToggle={toggle(setExpandedDetail)}
                        >
                            <Stack p="calc(3 * var(--spacing))" gap="calc(3 * var(--spacing))">
                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(12, 1fr)",
                                        gap: "calc(3 * var(--spacing)) calc(2 * var(--spacing))",
                                    }}
                                >
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
                                                    fullWidth
                                                />
                                            )}
                                        />
                                    </Box>

                                    <Box sx={{ gridColumn: { xs: "span 12", md: "span 6" } }}>
                                        <Controller
                                            name="code"
                                            control={control}
                                            render={({ field, fieldState }) => (
                                                <TextField
                                                    {...field}
                                                    value={field.value ?? ''}
                                                    label="Mã nhà đài"
                                                    error={!!fieldState.error}
                                                    helperText={
                                                        fieldState.error?.message ??
                                                        'Mã dùng khi xuất / nhập tệp. Để trống thì hệ thống tự sinh.'
                                                    }
                                                    fullWidth
                                                    InputProps={{
                                                        endAdornment: (
                                                            <InputAdornment position="end">
                                                                <Tooltip title="Tự sinh mã từ tên nhà đài">
                                                                    <span>
                                                                        <IconButton
                                                                            size="small"
                                                                            edge="end"
                                                                            disabled={
                                                                                suggestingCode ||
                                                                                !watchedName?.trim()
                                                                            }
                                                                            onClick={handleSuggestCode}
                                                                        >
                                                                            <AutoFixHighOutlinedIcon fontSize="small" />
                                                                        </IconButton>
                                                                    </span>
                                                                </Tooltip>
                                                            </InputAdornment>
                                                        ),
                                                    }}
                                                />
                                            )}
                                        />
                                    </Box>


                                    <Box sx={{ gridColumn: { xs: "span 12", md: "span 6" } }}>
                                        <Controller
                                            name="price"
                                            control={control}
                                            render={({ field, fieldState }) => (
                                                <TextField
                                                    {...field}
                                                    label="Giá vé"
                                                    value={field.value !== undefined ? new Intl.NumberFormat('vi-VN').format(Number(field.value)) : ''}
                                                    error={!!fieldState.error}
                                                    helperText={fieldState.error?.message}
                                                    onChange={(e) => {
                                                        const rawValue = e.target.value.replace(/\./g, '');
                                                        if (rawValue === '') {
                                                            field.onChange(0);
                                                        } else if (!isNaN(Number(rawValue))) {
                                                            field.onChange(Number(rawValue));
                                                        }
                                                    }}
                                                    fullWidth
                                                />
                                            )}
                                        />
                                    </Box>
                                    <Box sx={{ gridColumn: { xs: "span 12", md: "span 6" } }}>
                                        <Controller
                                            name="commissionRate"
                                            control={control}
                                            render={({ field, fieldState }) => (
                                                <TextField
                                                    {...field}
                                                    label="Tỉ lệ hoa hồng (VD: 0.05 = 5%)"
                                                    value={field.value !== undefined && field.value !== null ? field.value : ''}
                                                    error={!!fieldState.error}
                                                    helperText={fieldState.error?.message}
                                                    onChange={(e) => {
                                                        const rawValue = e.target.value;
                                                        if (rawValue === '') {
                                                            field.onChange('');
                                                            return;
                                                        }
                                                        const numValue = Number(rawValue);
                                                        if (!isNaN(numValue) && numValue >= 0 && numValue <= 1) {
                                                            field.onChange(rawValue);
                                                        }
                                                    }}
                                                    fullWidth
                                                />
                                            )}
                                        />
                                    </Box>
                                    <Box sx={{ gridColumn: { xs: "span 12", md: "span 6" } }}>
                                        <Controller
                                            name="region"
                                            control={control}
                                            render={({ field, fieldState }) => (
                                                <TextField
                                                    {...field}
                                                    select
                                                    label="Vùng miền"
                                                    error={!!fieldState.error}
                                                    helperText={fieldState.error?.message}
                                                    onChange={(e) => {
                                                        const nextRegion = e.target.value;
                                                        field.onChange(nextRegion);
                                                        setValue("province", "");
                                                        applyRegionDefaultDrawTime(nextRegion);
                                                    }}
                                                    fullWidth
                                                >
                                                    {regions.map((option) => (
                                                        <MenuItem key={option.code} value={option.code}>
                                                            {option.name}
                                                        </MenuItem>
                                                    ))}
                                                </TextField>
                                            )}
                                        />
                                    </Box>
                                    <Box sx={{ gridColumn: { xs: "span 12", md: "span 6" } }}>
                                        <Controller
                                            name="province"
                                            control={control}
                                            render={({ field, fieldState }) => (
                                                <TextField
                                                    {...field}
                                                    select
                                                    label="Tỉnh/Thành phố"
                                                    error={!!fieldState.error}
                                                    helperText={fieldState.error?.message}
                                                    disabled={!regionValue}
                                                    fullWidth
                                                >
                                                    {provinceOptions.map((prov) => (
                                                        <MenuItem key={prov} value={prov}>
                                                            {prov}
                                                        </MenuItem>
                                                    ))}
                                                </TextField>
                                            )}
                                        />
                                    </Box>
                                    <Box sx={{ gridColumn: { xs: "span 12", md: "span 6" } }}>
                                        <Controller
                                            name="drawDays"
                                            control={control}
                                            render={({ field, fieldState }) => {
                                                const selectedDays = Array.isArray(field.value) ? field.value : [];
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
                                                        error={!!fieldState.error}
                                                        helperText={fieldState.error?.message}
                                                        InputLabelProps={{ shrink: true }}
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
                                                                                    backgroundColor: isSelected ? '#FF3030' : 'rgba(0, 0, 0, 0.04)',
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
                                    <Box sx={{ gridColumn: { xs: "span 12", md: "span 6" } }}>
                                        <Controller
                                            name="drawTime"
                                            control={control}
                                            render={({ field, fieldState }) => (
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
                                                            error: !!fieldState.error,
                                                            helperText: fieldState.error?.message,
                                                            InputLabelProps: { shrink: true },
                                                            sx: {
                                                                '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                                    borderColor: '#FF3030 !important',
                                                                },
                                                                '& .MuiInputLabel-root.Mui-focused': {
                                                                    color: '#FF3030 !important',
                                                                }
                                                            }
                                                        },
                                                        popper: {
                                                            sx: {
                                                                '& .Mui-selected, & .Mui-selected:hover': {
                                                                    backgroundColor: '#FF3030 !important',
                                                                    color: '#fff !important',
                                                                },
                                                                '& .MuiClockPointer-root, & .MuiClock-pin': {
                                                                    backgroundColor: '#FF3030 !important',
                                                                },
                                                                '& .MuiClockPointer-thumb': {
                                                                    backgroundColor: '#FF3030 !important',
                                                                    borderColor: '#FF3030 !important',
                                                                },
                                                                '& .MuiButton-textPrimary': {
                                                                    color: '#FF3030 !important',
                                                                }
                                                            }
                                                        }
                                                    }}
                                                />
                                            )}
                                        />
                                    </Box>
                                    <Box sx={{ gridColumn: { xs: "span 12", md: "span 6" } }}>
                                        <Controller
                                            name="prizeRedemptionOfficialDeadlineDays"
                                            control={control}
                                            render={({ field, fieldState }) => (
                                                <TextField
                                                    {...field}
                                                    value={field.value ?? ""}
                                                    onChange={(e) => field.onChange(e.target.value)}
                                                    label="Hạn lĩnh nhà đài (ngày)"
                                                    placeholder="Mặc định hệ thống (30)"
                                                    helperText={
                                                        fieldState.error?.message
                                                        || "Để trống = dùng cấu hình hệ thống. Override khi đài này khác hạn chuẩn."
                                                    }
                                                    error={!!fieldState.error}
                                                    fullWidth
                                                    inputProps={{ inputMode: "numeric" }}
                                                />
                                            )}
                                        />
                                    </Box>
                                </Box>


                                <Box sx={{ mt: 1 }}>
                                    <div className="mb-3 font-semibold">Ảnh nhà đài (Tùy chọn)</div>
                                    <FormUploadSingleFile
                                        name="image"
                                        control={control}
                                        useRawFile={true}
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
                                            <LazyTiptap
                                                value={field.value ?? ""}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    />
                                </Box>
                            </Stack>
                        </CollapsibleCard>
                        <Box gap="calc(3 * var(--spacing))" sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                            <Button
                                type="submit"
                                className="btn-primary-admin"
                                loading={isPending || isUploadingImage}
                                label="Tạo nhà đài"
                                loadingLabel="Đang tạo..."
                            />
                        </Box>
                    </Stack>
                </form>
            </ThemeProvider>

        </>
    )
}
