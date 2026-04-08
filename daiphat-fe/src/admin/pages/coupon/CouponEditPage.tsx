import { Box, Stack, TextField, ThemeProvider, useTheme, MenuItem, Select, FormControl, InputLabel, CircularProgress } from "@mui/material"
import { Breadcrumb } from "../../components/ui/Breadcrumb"
import { Title } from "../../components/ui/Title"
import { useState, useEffect, type Dispatch, type SetStateAction } from "react";
import { CollapsibleCard } from "../../components/ui/CollapsibleCard";
import { useUpdateCoupon, useCouponDetail } from "./hooks/useCoupon";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { createCouponSchema } from "../../schemas/coupon.schema";
import { getCouponTheme } from "./configs/theme";
import { prefixAdmin } from "../../constants/routes";
import { toast } from "react-toastify";
import { LoadingButton } from "../../components/ui/LoadingButton";
import { SwitchButton } from "../../components/ui/SwitchButton";
import { useParams, useNavigate } from "react-router-dom";
import { DateRangePicker } from "../../components/ui/DateRangePicker";
import dayjs from "dayjs";

export const CouponEditPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [expandedDetail, setExpandedDetail] = useState(true);
    const toggle = (setter: Dispatch<SetStateAction<boolean>>) =>
        () => setter(prev => !prev);

    const outerTheme = useTheme();
    const localTheme = getCouponTheme(outerTheme);

    const { data: couponData, isLoading: isLoadingDetail } = useCouponDetail(id);

    const {
        control,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors }
    } = useForm<any>({
        resolver: zodResolver(createCouponSchema),
        defaultValues: {
            code: "",
            name: "",
            description: "",
            typeDiscount: "percentage",
            value: 0,
            minOrderValue: 0,
            maxDiscountValue: 0,
            usageLimit: 0,
            startDate: "",
            endDate: "",
            typeDisplay: "private",
            status: "inactive",
        },
    });

    // Populate form when data loaded
    useEffect(() => {
        if (couponData) {
            reset({
                code: couponData.code || "",
                name: couponData.name || "",
                description: couponData.description || "",
                typeDiscount: couponData.typeDiscount || "percentage",
                value: couponData.value || 0,
                minOrderValue: couponData.minOrderValue || 0,
                maxDiscountValue: couponData.maxDiscountValue || 0,
                usageLimit: couponData.usageLimit || 0,
                startDate: (couponData.startDateFormat || (couponData.startDate ? dayjs(couponData.startDate).format("DD/MM/YYYY") : "")) || "",
                endDate: (couponData.endDateFormat || (couponData.endDate ? dayjs(couponData.endDate).format("DD/MM/YYYY") : "")) || "",
                typeDisplay: couponData.typeDisplay || "private",
                status: couponData.status || "inactive",
            });
        }
    }, [couponData, reset]);

    const typeDiscount = watch("typeDiscount");

    const { mutate: update, isPending } = useUpdateCoupon();

    const onSubmit = (data: any) => {
        update({ id: id!, data }, {
            onSuccess: (response) => {
                if (response.success) {
                    toast.success(response.message || "Cập nhật mã giảm giá thành công");
                    navigate(`/${prefixAdmin}/coupon/list`);
                } else {
                    toast.error(response.message);
                }
            },
            onError: () => {
                toast.error("Cập nhật mã giảm giá thất bại");
            }
        });
    };

    if (isLoadingDetail) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Chỉnh sửa mã giảm giá" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: "/" },
                            { label: "Mã giảm giá", to: `/${prefixAdmin}/coupon/list` },
                            { label: "Chỉnh sửa" }
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
                            title="Thông tin cơ bản"
                            subheader="Mã, tên, mô tả..."
                            expanded={expandedDetail}
                            onToggle={toggle(setExpandedDetail)}
                        >
                            <Stack p="calc(3 * var(--spacing))" gap="calc(3 * var(--spacing))">
                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(2, 1fr)",
                                        gap: "calc(3 * var(--spacing)) calc(2 * var(--spacing))",
                                    }}
                                >
                                    <Controller
                                        name="code"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                {...field}
                                                label="Mã giảm giá"
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message}
                                            />
                                        )}
                                    />
                                    <Controller
                                        name="name"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                {...field}
                                                label="Tên mã giảm giá"
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message}
                                            />
                                        )}
                                    />
                                </Box>
                                <Controller
                                    name="description"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Mô tả"
                                            multiline
                                            rows={3}
                                            fullWidth
                                        />
                                    )}
                                />
                            </Stack>
                        </CollapsibleCard>

                        <CollapsibleCard
                            title="Cấu hình giảm giá"
                            subheader="Loại giảm giá, giá trị, giới hạn..."
                            expanded={true}
                            onToggle={() => { }}
                        >
                            <Stack p="calc(3 * var(--spacing))" gap="calc(3 * var(--spacing))">
                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(2, 1fr)",
                                        gap: "calc(3 * var(--spacing)) calc(2 * var(--spacing))",
                                    }}
                                >
                                    <Controller
                                        name="typeDiscount"
                                        control={control}
                                        render={({ field }) => (
                                            <FormControl fullWidth>
                                                <InputLabel>Loại giảm giá</InputLabel>
                                                <Select {...field} label="Loại giảm giá">
                                                    <MenuItem value="percentage">Phần trăm (%)</MenuItem>
                                                    <MenuItem value="fixed">Số tiền cố định (VNĐ)</MenuItem>
                                                </Select>
                                            </FormControl>
                                        )}
                                    />
                                    <Controller
                                        name="value"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                {...field}
                                                label={typeDiscount === 'percentage' ? 'Phần trăm giảm (%)' : 'Số tiền giảm (VNĐ)'}
                                                type="number"
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message}
                                            />
                                        )}
                                    />
                                    <Controller
                                        name="minOrderValue"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="Đơn hàng tối thiểu (VNĐ)"
                                                type="number"
                                            />
                                        )}
                                    />
                                    <Controller
                                        name="maxDiscountValue"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="Giảm tối đa (VNĐ)"
                                                type="number"
                                            />
                                        )}
                                    />
                                    <Controller
                                        name="usageLimit"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="Số lần sử dụng tối đa"
                                                type="number"
                                            />
                                        )}
                                    />
                                    <Controller
                                        name="typeDisplay"
                                        control={control}
                                        render={({ field }) => (
                                            <FormControl fullWidth>
                                                <InputLabel>Hiển thị</InputLabel>
                                                <Select {...field} label="Hiển thị">
                                                    <MenuItem value="public">Công khai</MenuItem>
                                                    <MenuItem value="private">Riêng tư</MenuItem>
                                                </Select>
                                            </FormControl>
                                        )}
                                    />
                                </Box>
                            </Stack>
                        </CollapsibleCard>

                        <CollapsibleCard
                            title="Thời gian hiệu lực"
                            subheader="Ngày bắt đầu và kết thúc"
                            expanded={true}
                            onToggle={() => { }}
                        >
                            <Stack p="calc(3 * var(--spacing))" gap="calc(3 * var(--spacing))">
                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(2, 1fr)",
                                        gap: "calc(3 * var(--spacing)) calc(2 * var(--spacing))",
                                    }}
                                >
                                    <Box sx={{ gridColumn: "span 2" }}>
                                        <DateRangePicker
                                            startDate={watch("startDate")}
                                            endDate={watch("endDate")}
                                            onChange={({ startDate, endDate }) => {
                                                setValue("startDate", startDate);
                                                setValue("endDate", endDate);
                                            }}
                                            error={!!errors.startDate || !!errors.endDate}
                                            helperText={(errors.startDate?.message as string) || (errors.endDate?.message as string)}
                                        />
                                    </Box>
                                </Box>
                            </Stack>
                        </CollapsibleCard>

                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 2 }}>
                            <Box sx={{ flexGrow: 1 }}>
                                <SwitchButton
                                    control={control}
                                    name="status"
                                    checkedValue="active"
                                    uncheckedValue="inactive"
                                />
                            </Box>
                            <LoadingButton
                                type="submit"
                                loading={isPending}
                                label="Cập nhật mã giảm giá"
                                loadingLabel="Đang lưu..."
                                sx={{
                                    minHeight: "44px",
                                    minWidth: "180px",
                                    borderRadius: "12px",
                                    fontSize: "0.875rem",
                                    fontWeight: 700,
                                    boxShadow: "var(--customShadows-primary)",
                                    "& .MuiLoadingButton-loadingIndicator": { color: "common.white" }
                                }}
                            />
                        </Box>
                    </Stack>
                </form>
            </ThemeProvider>
        </>
    )
}




