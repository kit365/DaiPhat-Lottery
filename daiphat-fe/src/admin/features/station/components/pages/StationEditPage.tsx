"use client";

import { useRouteParams } from "@/hooks/useRouteParams";
import { Box, IconButton, InputAdornment, Stack, TextField, Tooltip, ThemeProvider, useTheme, CircularProgress, createTheme, MenuItem, Typography } from "@mui/material";
import { REGION_DATA } from "../../../../constants/region.constants";
import { DAYS_OF_WEEK } from "../../../../constants/schedule.constants";
import { PageHeader } from "../../../../components/ui/PageHeader";
import { SpinnerLoading } from "../../../../components/ui/SpinnerLoading";
import { TimePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import { LazyTiptap } from "../../../../components/layouts/titap/LazyTiptap";
import { useState, useEffect, type Dispatch, type SetStateAction, useMemo } from "react";
import { CollapsibleCard } from "../../../../components/ui/CollapsibleCard";
import { useStationDetail, useUpdateStation, useUploadStationImage } from "../../hooks/useStation";
import { useRegions } from "../../../region/hooks/useRegion";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { CreateStationFormValues, createStationSchema } from "../../schemas/station.schema";
import { SwitchButton } from "../../../../components/ui/SwitchButton";
import { prefixAdmin } from "../../../../constants/routes";
import AutoFixHighOutlinedIcon from "@mui/icons-material/AutoFixHighOutlined";
import { toast } from "react-toastify";
import { suggestStationCode } from "../../services/stationService";
import { Button } from "../../../../components/ui/Button";
import { FormUploadSingleFile } from "../../../../components/upload/FormUploadSingleFile";

export const StationEditPage = () => {
    const { id } = useRouteParams();
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

    const { data: detailRes, isLoading: isLoadingDetail } = useStationDetail(id);
    const { mutate: update, isPending: isUpdating } = useUpdateStation();
    const { mutateAsync: uploadImageAsync, isPending: isUploadingImage } = useUploadStationImage();

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
    } = useForm<CreateStationFormValues>({
        resolver: zodResolver(createStationSchema) as any,
        defaultValues: {
            name: "",
            code: "",
            description: "",
            status: "active",
            type: "TRADITIONAL",
            price: 10000,
            commissionRate: 0.1,
            province: "",
            region: "",
            numberLength: 6,
            minNumber: 0,
            maxNumber: 999999,
            drawDays: [],
            drawTime: "16:15",
            displayOrder: 0,
        },
    });

    // The generate button asks the backend, because only it knows which codes are
    // already taken by other stations.
    const [suggestingCode, setSuggestingCode] = useState(false);
    const watchedName = watch("name");

    const handleSuggestCode = async () => {
        const name = watchedName?.trim();
        if (!name) {
            return;
        }
        setSuggestingCode(true);
        try {
            const suggested = await suggestStationCode(name, id ? Number(id) : undefined);
            setValue("code", suggested, { shouldDirty: true, shouldValidate: true });
        } catch {
            toast.error("Không tạo được mã tự động. Vui lòng nhập mã thủ công.");
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

    useEffect(() => {
        if (detailRes) {
            reset({
                name: detailRes.name || "",
                code: detailRes.code || "",
                description: detailRes.description || "",
                status: (detailRes.status === "inactive" ? "inactive" : "active") as "active" | "inactive",
                type: detailRes.type || "TRADITIONAL",
                price: detailRes.price || 10000,
                commissionRate: (detailRes as any).commissionRate !== undefined && (detailRes as any).commissionRate !== null ? (detailRes as any).commissionRate : "",
                province: detailRes.province || "",
                region: detailRes.region || "",
                numberLength: detailRes.numberLength || 6,
                minNumber: detailRes.minNumber || 0,
                maxNumber: detailRes.maxNumber || 999999,
                drawDays: Array.isArray(detailRes.drawDays)
                    ? detailRes.drawDays
                    : typeof detailRes.drawDays === "string"
                        ? detailRes.drawDays.split(",").map((d) => d.trim()).filter(Boolean)
                        : [],
                drawTime: detailRes.drawTime || "16:15",
                image: detailRes.image || detailRes.avatar || detailRes.thumbnailUrl || "",
                displayOrder: detailRes.displayOrder || 0,
            });
        }
    }, [detailRes, reset]);

    const onSubmit = (data: CreateStationFormValues) => {
        const payload = {
            ...data,
            image: typeof data.image === 'string' ? data.image : (detailRes?.image || ""),
        };

        update({ id: id!, data: payload }, {
            onSuccess: (response) => {
                if (response.success) {
                    toast.success(response.message || "Cập nhật nhà đài thành công");
                } else {
                    toast.error(response.message);
                }
            },
            onError: (err: any) => {
                const message = err?.response?.data?.message || err?.message || "Cập nhật nhà đài thất bại";
                toast.error(message);
            }
        });
    };

    if (isLoadingDetail) {
        return (
            <>
                <PageHeader
                    title="Chỉnh sửa nhà đài"
                    breadcrumbItems={[
                        { label: "Dashboard", to: "/" },
                        { label: "Nhà đài", to: `/${prefixAdmin}/provider/list` },
                        { label: "Chỉnh sửa" }
                    ]}
                />
                <SpinnerLoading />
            </>
        );
    }

    return (
        <>
            <PageHeader
                title="Chỉnh sửa nhà đài"
                breadcrumbItems={[
                            { label: "Dashboard", to: "/" },
                            { label: "Nhà đài", to: `/${prefixAdmin}/provider/list` },
                            { label: "Chỉnh sửa" }
                        ]}
            />

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
                                                        field.onChange(e);
                                                        setValue("province", ""); // reset province when region changes
                                                    }}
                                                    disabled
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
                                                        disabled
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
                                                    disabled
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
                                            <LazyTiptap
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
                            />
                            <Button
                                type="submit"
                                className="btn-primary-admin"
                                loading={isUpdating || isUploadingImage}
                                label="Cập nhật nhà đài"
                                loadingLabel="Đang cập nhật..."
                            />
                        </Box>
                    </Stack>
                </form>
            </ThemeProvider>
        </>
    );
};
