import { Box, Stack, TextField, ThemeProvider, useTheme, CircularProgress, createTheme, MenuItem, Checkbox, ListItemText, Typography } from "@mui/material";
import { REGION_DATA, REGION_OPTIONS } from "../../constants/region.constants";
import { DAYS_OF_WEEK } from "../../constants/schedule.constants";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { Title } from "../../components/ui/Title";
import { DatePicker, TimePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import { Tiptap } from "../../components/layouts/titap/Tiptap";
import { useState, useEffect, type Dispatch, type SetStateAction, useMemo } from "react";
import { CollapsibleCard } from "../../components/ui/CollapsibleCard";
import { useProviderDetail, useUpdateProvider, useUploadProviderImage } from "./hooks/useProvider";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { CreateProviderFormValues, createProviderSchema } from "../../schemas/provider.schema";
import { SwitchButton } from "../../components/ui/SwitchButton";
import { prefixAdmin } from "../../constants/routes";
import { toast } from "react-toastify";
import { LoadingButton } from "../../components/ui/LoadingButton";
import { FormUploadSingleFile } from "../../components/upload/FormUploadSingleFile";
import { useParams } from "react-router-dom";

export const ProviderEditPage = () => {
    const { id } = useParams();
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
    } = useForm<CreateProviderFormValues>({
        resolver: zodResolver(createProviderSchema),
        defaultValues: {
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
            displayOrder: 0,
        },
    });

    const regionValue = watch("region");
    const provinceOptions = regionValue ? REGION_DATA[regionValue] || [] : [];

    useEffect(() => {
        if (detailRes) {
            reset({
                name: detailRes.name || "",
                description: detailRes.description || "",
                status: detailRes.status || "active",
                type: detailRes.type || "TRADITIONAL",
                price: detailRes.price || 10000,
                province: detailRes.province || "",
                region: detailRes.region || "",
                numberLength: detailRes.numberLength || 6,
                minNumber: detailRes.minNumber || 0,
                maxNumber: detailRes.maxNumber || 999999,
                drawDays: detailRes.drawDays || [],
                drawTime: detailRes.drawTime || "16:15",
                image: detailRes.image || "",
                displayOrder: detailRes.displayOrder || 0,
            });
        }
    }, [detailRes, reset]);

    const onSubmit = (data: CreateProviderFormValues) => {
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
                                            name="type"
                                            control={control}
                                            render={({ field, fieldState }) => (
                                                <TextField
                                                    {...field}
                                                    select
                                                    label="Loại vé"
                                                    error={!!fieldState.error}
                                                    helperText={fieldState.error?.message}
                                                    fullWidth
                                                >
                                                    <MenuItem value="TRADITIONAL">Truyền thống</MenuItem>
                                                </TextField>
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
                                                    fullWidth
                                                >
                                                    {REGION_OPTIONS.map((option) => (
                                                        <MenuItem key={option.value} value={option.value}>
                                                            {option.label}
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
                                            )}
                                        />
                                    </Box>
                                </Box>

                                <Box sx={{ mt: 1 }}>
                                    <Typography variant="subtitle2" sx={{ mb: '12px', fontWeight: 600, color: 'text.primary' }}>
                                        Cấu hình vé (dùng cho máy quét)
                                    </Typography>
                                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "calc(2 * var(--spacing))" }}>
                                        <Controller
                                            name="numberLength"
                                            control={control}
                                            render={({ field, fieldState }) => (
                                                <TextField
                                                    {...field}
                                                    type="number"
                                                    label="Độ dài số"
                                                    error={!!fieldState.error}
                                                    helperText={fieldState.error?.message}
                                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                                    fullWidth
                                                />
                                            )}
                                        />
                                        <Controller
                                            name="minNumber"
                                            control={control}
                                            render={({ field, fieldState }) => (
                                                <TextField
                                                    {...field}
                                                    type="number"
                                                    label="Số nhỏ nhất"
                                                    error={!!fieldState.error}
                                                    helperText={fieldState.error?.message}
                                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                                    fullWidth
                                                />
                                            )}
                                        />
                                        <Controller
                                            name="maxNumber"
                                            control={control}
                                            render={({ field, fieldState }) => (
                                                <TextField
                                                    {...field}
                                                    type="number"
                                                    label="Số lớn nhất"
                                                    error={!!fieldState.error}
                                                    helperText={fieldState.error?.message}
                                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                                    fullWidth
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
