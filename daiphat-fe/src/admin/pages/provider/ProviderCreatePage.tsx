import { Box, Stack, TextField, ThemeProvider, useTheme, createTheme, MenuItem, Checkbox, ListItemText, Typography } from "@mui/material"
import { REGION_DATA, REGION_OPTIONS } from "../../constants/region.constants";
import { DAYS_OF_WEEK } from "../../constants/schedule.constants";
import { Breadcrumb } from "../../components/ui/Breadcrumb"
import { Title } from "../../components/ui/Title"
import { DatePicker, TimePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import { Tiptap } from "../../components/layouts/titap/Tiptap"
import { useState, useMemo, type Dispatch, type SetStateAction } from "react";
import { CollapsibleCard } from "../../components/ui/CollapsibleCard";
import { useCreateProvider, useUploadProviderImage } from "./hooks/useProvider";
import { useRegions } from "../region/hooks/useRegion";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { CreateProviderFormValues, createProviderSchema } from "../../schemas/provider.schema";

import { prefixAdmin } from "../../constants/routes";
import { toast } from "react-toastify";
import { LoadingButton } from "../../components/ui/LoadingButton";
import { FormUploadSingleFile } from "../../components/upload/FormUploadSingleFile";

export const ProviderCreatePage = () => {
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
        setValue,
        formState: { isValid },
    } = useForm<CreateProviderFormValues>({
        resolver: zodResolver(createProviderSchema),
        mode: "onChange",
        reValidateMode: "onChange",
        defaultValues: {
            name: "",
            description: "",
            status: "active",
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

    const regionValue = watch("region");
    const provinceOptions = regionValue ? REGION_DATA[regionValue] || [] : [];

    const { mutate: create, isPending } = useCreateProvider();
    const { mutate: uploadImage, isPending: isUploadingImage } = useUploadProviderImage();

    const onSubmit = (data: CreateProviderFormValues) => {
        const payload = {
            ...data,
            image: "", // Image will be uploaded in the second step
        };

        create(payload, {
            onSuccess: (response) => {
                if (response.success) {
                    const createdProviderId = response.data?.id || response.data?._id;
                    const fileToUpload = data.image instanceof File ? data.image : null;

                    if (createdProviderId && fileToUpload) {
                        uploadImage({ id: createdProviderId, file: fileToUpload }, {
                            onSuccess: () => {
                                finalizeSuccess(response.message);
                            },
                            onError: (uploadErr: any) => {
                                toast.error(uploadErr?.response?.data?.message || uploadErr?.message || "Tạo nhà đài thành công nhưng lỗi tải ảnh lên");
                                finalizeSuccess(response.message);
                            }
                        });
                    } else {
                        finalizeSuccess(response.message);
                    }

                    function finalizeSuccess(msg: string) {
                        toast.success(msg || "Tạo nhà đài thành công");
                        reset({
                            name: "",
                            description: "",
                            status: "active",
                            price: 10000,
                            commissionRate: 0.05,
                            province: "",
                            region: "",
                            drawDays: [],
                            drawTime: "16:15",
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
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Tạo mới nhà đài" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: "/" },
                            { label: "Nhà đài", to: `/${prefixAdmin}/provider/list` },
                            { label: "Tạo mới" }
                        ]}
                    />
                </div>
            </div>
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
                                                    required
                                                    error={!!fieldState.error}
                                                    helperText={fieldState.error?.message}
                                                    fullWidth
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
                                                    required
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
                                                    value={field.value ?? ""}
                                                    onChange={(e) => {
                                                        const raw = e.target.value;
                                                        field.onChange(raw === "" ? undefined : Number(raw));
                                                    }}
                                                    type="number"
                                                    inputProps={{ min: 0, max: 1, step: 0.01 }}
                                                    label="Tỷ lệ hoa hồng"
                                                    required
                                                    helperText={fieldState.error?.message || "VD: 0.05 = 5% (giá trị từ 0 đến 1)"}
                                                    error={!!fieldState.error}
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
                                                    required
                                                    error={!!fieldState.error}
                                                    helperText={fieldState.error?.message}
                                                    onChange={(e) => {
                                                        field.onChange(e);
                                                        setValue("province", ""); // reset province when region changes
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
                                                        required
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
                                                            required: true,
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
                                            <Tiptap
                                                value={field.value ?? ""}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    />
                                </Box>
                            </Stack>
                        </CollapsibleCard>
                        <Box gap="calc(3 * var(--spacing))" sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                            <LoadingButton
                                type="submit"
                                loading={isPending || isUploadingImage}
                                disabled={!isValid || isPending || isUploadingImage}
                                label="Tạo nhà đài"
                                loadingLabel="Đang tạo..."
                                sx={{ minHeight: "3rem", minWidth: "4rem" }}
                            />
                        </Box>
                    </Stack>
                </form>
            </ThemeProvider>

        </>
    )
}
