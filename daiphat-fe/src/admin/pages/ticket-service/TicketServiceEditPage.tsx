import { Box, Stack, TextField, ThemeProvider, useTheme, Button, MenuItem, FormControl, InputLabel, Select, Chip, OutlinedInput, Typography, Table, TableBody, TableCell, TableHead, TableRow, IconButton, CircularProgress, Divider } from "@mui/material"
import { Breadcrumb } from "../../components/ui/Breadcrumb"
import { Title } from "../../components/ui/Title"
import { Tiptap } from "../../components/layouts/titap/Tiptap"
import { useState, useEffect, useMemo, type Dispatch, type SetStateAction } from "react";
import { CollapsibleCard } from "../../components/ui/CollapsibleCard";
import { useUpdateTicketService, useTicketServiceDetail } from "./hooks/useTicketService";
import { useNestedTicketServiceCategories } from "../ticket-service-category/hooks/useTicketServiceCategory";
import { useDepartments } from "../hr/hooks/useDepartments";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { ticketServiceSchema, TicketServiceFormValues } from "../../schemas/service.schema";
import { getTicketServiceTheme } from "./configs/theme";
import { prefixAdmin } from "../../constants/routes";
import { toast } from "react-toastify";
import { LoadingButton } from "../../components/ui/LoadingButton";
import { SwitchButton } from "../../components/ui/SwitchButton";
import { CategoryParentSelect } from "../../components/ui/CategoryTreeSelect";
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { useNavigate, useParams } from "react-router-dom";
import { UploadFiles } from "../../components/ui/UploadFiles";
import { Icon } from "@iconify/react";

const REGIONAL_TYPES = ["XSMN", "XSMB", "XSMT"];
const PRICING_TYPES = [
    { value: 'fixed', label: 'Cố định' },
    { value: 'by-weight', label: 'Theo số lượng' },
];

export const TicketServiceEditPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [expandedDetail, setExpandedDetail] = useState(true);
    const [expandedPricing, setExpandedPricing] = useState(true);

    const toggle = (setter: Dispatch<SetStateAction<boolean>>) =>
        () => setter(prev => !prev);

    const outerTheme = useTheme();
    const localTheme = getTicketServiceTheme(outerTheme);

    const { data: ticketService, isLoading: isFetching } = useTicketServiceDetail(id);
    const { data: categories = [] } = useNestedTicketServiceCategories();
    const departmentsRes = useDepartments();
    const departments = useMemo(() => {
        if (!departmentsRes.data) return [];
        const data = departmentsRes.data;
        if (Array.isArray(data.data?.recordList)) return data.data.recordList;
        if (Array.isArray(data.recordList)) return data.recordList;
        if (Array.isArray(data.data)) return data.data;
        if (Array.isArray(data)) return data;
        return [];
    }, [departmentsRes.data]);
    const { mutate: update, isPending } = useUpdateTicketService();

    const {
        control,
        handleSubmit,
        watch,
        reset
    } = useForm<TicketServiceFormValues>({
        resolver: zodResolver(ticketServiceSchema as any),
        defaultValues: {
            name: "",
            slug: "",
            description: "",
            procedure: "",
            categoryId: "",
            departmentId: "",
            duration: 30,
            minDuration: 30,
            maxExtensionMinutes: 30,
            minAgeMonths: 0,
            userTicketTypes: ["XSMN", "XSMB", "XSMT"],
            pricingType: "fixed",
            basePrice: 0,
            priceList: [{ label: "", value: 0 }],
            status: "active",
            images: [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "priceList"
    });

    const pricingType = watch("pricingType");

    useEffect(() => {
        if (ticketService) {
            reset({
                name: ticketService.name || "",
                slug: ticketService.slug || "",
                description: ticketService.description || "",
                procedure: ticketService.procedure || "",
                categoryId: ticketService.categoryId || "",
                departmentId: ticketService.departmentId || "",
                duration: ticketService.duration || 30,
                minDuration: ticketService.minDuration || 30,
                maxExtensionMinutes: ticketService.maxExtensionMinutes || 30,
                minAgeMonths: ticketService.minAgeMonths || 0,
                userTicketTypes: ticketService.userTicketTypes || ["XSMN", "XSMB", "XSMT"],
                pricingType: ticketService.pricingType || "fixed",
                basePrice: ticketService.basePrice || 0,
                priceList: (ticketService.priceList && ticketService.priceList.length > 0) ? ticketService.priceList : [{ label: "", value: 0 }],
                status: ticketService.status || "active",
                images: ticketService.images || [],
            });
        }
    }, [ticketService, reset]);

    const onSubmit = (data: TicketServiceFormValues) => {
        console.log("Submitting ticketService data:", data);
        update({ id: id as string, data }, {
            onSuccess: (response) => {
                if (response.code === 200 || response.success) {
                    toast.success("Cập nhật dịch vụ thành công!");
                    navigate(`/${prefixAdmin}/ticketService/list`);
                } else {
                    toast.error(response.message || "Cập nhật thất bại");
                }
            },
            onError: (error: any) => {
                const message = error.response?.data?.message || "Cập nhật dịch vụ thất bại";
                toast.error(message);
            }
        });
    };

    const onError = (errors: any) => {
        console.error("Form validation errors:", errors);
        toast.error("Vui lòng kiểm tra lại thông tin các trường bị lỗi");
    };

    if (isFetching) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <IconButton
                            onClick={() => navigate(`/${prefixAdmin}/ticketService/list`)}
                            sx={{ color: "var(--palette-action-active)", p: 0.75, mr: 1, mt: 0.25 }}
                        >
                            <Icon icon="eva:arrow-ios-back-fill" width={20} />
                        </IconButton>
                        <Title title="Chỉnh sửa dịch vụ" />
                    </Box>
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: "/" },
                            { label: "Loại vé", to: `/${prefixAdmin}/ticketService/list` },
                            { label: "Chỉnh sửa" }
                        ]}
                    />
                </div>
            </div>
            <ThemeProvider theme={localTheme}>
                <form onSubmit={handleSubmit(onSubmit, onError)}>
                    <Stack sx={{ margin: "0px calc(15 * var(--spacing))", gap: "calc(5 * var(--spacing))" }}>
                        <CollapsibleCard
                            title="Thông tin cơ bản"
                            subheader="Tên, mô tả, danh mục..."
                            expanded={expandedDetail}
                            onToggle={toggle(setExpandedDetail)}
                        >
                            <Stack p="calc(3 * var(--spacing))" gap="calc(3 * var(--spacing))">
                                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "calc(3 * var(--spacing)) calc(2 * var(--spacing))" }}>
                                    <Controller
                                        name="name"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                {...field}
                                                label="Tên dịch vụ"
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message}
                                            />
                                        )}
                                    />
                                    <CategoryParentSelect
                                        control={control}
                                        name="categoryId"
                                        label="Danh mục"
                                        categories={categories}
                                    />
                                    <Controller
                                        name="departmentId"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <FormControl fullWidth error={!!fieldState.error}>
                                                <InputLabel>Phòng ban phụ trách</InputLabel>
                                                <Select
                                                    {...field}
                                                    label="Phòng ban phụ trách"
                                                >
                                                    {departments.map((dept: any) => (
                                                        <MenuItem key={dept._id} value={dept._id}>
                                                            {dept.name}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                                {fieldState.error && (
                                                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                                                        {fieldState.error.message}
                                                    </Typography>
                                                )}
                                            </FormControl>
                                        )}
                                    />
                                    <Controller
                                        name="duration"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                {...field}
                                                type="number"
                                                inputProps={{ step: "0.1" }}
                                                label="Tổng thời gian (xong hết cả dọn dẹp)"
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message || "Bao gồm thời gian làm và chuẩn bị/dọn dẹp (phút)"}
                                                onChange={(e) => field.onChange(Number(e.target.value))}
                                            />
                                        )}
                                    />

                                    <Controller
                                        name="minDuration"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                {...field}
                                                type="number"
                                                inputProps={{ step: "0.1" }}
                                                label="Thời lượng tối thiểu (phút)"
                                                placeholder="Ngăn hoàn thành sớm"
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message}
                                                onChange={(e) => field.onChange(Number(e.target.value))}
                                            />
                                        )}
                                    />
                                    <Controller
                                        name="maxExtensionMinutes"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                {...field}
                                                type="number"
                                                label="Gia hạn tối đa (phút)"
                                                placeholder="Ví dụ: 30"
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message || "Tổng thời gian gia hạn cho phép (khi bận quá giờ)"}
                                                onChange={(e) => field.onChange(Number(e.target.value))}
                                            />
                                        )}
                                    />

                                    <Controller
                                        name="minAgeMonths"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                {...field}
                                                type="number"
                                                label="Số lượng tối thiểu"
                                                placeholder="Ví dụ: 1"
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message || "Số lượng tối thiểu khi mua vé qua dịch vụ này"}
                                                onChange={(e) => field.onChange(Number(e.target.value))}
                                            />
                                        )}
                                    />

                                    <Controller
                                        name="userTicketTypes"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <FormControl fullWidth error={!!fieldState.error}>
                                                <InputLabel>Vùng miền áp dụng</InputLabel>
                                                <Select
                                                    {...field}
                                                    multiple
                                                    input={<OutlinedInput label="Vùng miền áp dụng" />}
                                                    renderValue={(selected) => (
                                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                            {(selected as string[]).map((value) => (
                                                                <Chip key={value} label={value} size="small" />
                                                            ))}
                                                        </Box>
                                                    )}
                                                >
                                                    {REGIONAL_TYPES.map((name) => (
                                                        <MenuItem key={name} value={name}>{name}</MenuItem>
                                                    ))}
                                                </Select>
                                                {fieldState.error && (
                                                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                                                        {fieldState.error.message}
                                                    </Typography>
                                                )}
                                            </FormControl>
                                        )}
                                    />
                                </Box>

                                <Controller
                                    name="images"
                                    control={control}
                                    render={({ field }) => (
                                        <UploadFiles
                                            files={field.value as any || []}
                                            onFilesChange={field.onChange}
                                        />
                                    )}
                                />

                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Mô tả dịch vụ</Typography>
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

                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Quy trình thực hiện (Các bước thực hiện)</Typography>
                                    <Controller
                                        name="procedure"
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

                        <CollapsibleCard
                            title="Giá dịch vụ"
                            subheader="Cấu hình giá cố định hoặc theo số lượng"
                            expanded={expandedPricing}
                            onToggle={toggle(setExpandedPricing)}
                        >
                            <Stack p="calc(3 * var(--spacing))" gap="calc(3 * var(--spacing))">
                                <Controller
                                    name="pricingType"
                                    control={control}
                                    render={({ field }) => (
                                        <FormControl fullWidth>
                                            <InputLabel>Loại giá</InputLabel>
                                            <Select {...field} label="Loại giá">
                                                {PRICING_TYPES.map(type => (
                                                    <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    )}
                                />

                                {pricingType === 'fixed' ? (
                                    <Controller
                                        name="basePrice"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                type="number"
                                                label="Giá cố định (VNĐ)"
                                                fullWidth
                                                onChange={(e) => field.onChange(Number(e.target.value))}
                                            />
                                        )}
                                    />
                                ) : (
                                    <Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                            <Typography variant="subtitle2">Bảng giá theo số lượng</Typography>
                                            <Button color="primary" sx={{ color: '#00A76F', fontWeight: 700 }} startIcon={<AddIcon />} onClick={() => append({ label: '', value: 0 })}>Thêm mức</Button>
                                        </Box>
                                        <Table>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ fontSize: '0.8125rem', width: 220 }}>Số lượng (vé)</TableCell>
                                                    <TableCell sx={{ fontSize: '0.8125rem', width: 120, textAlign: 'center' }}>Quy mô</TableCell>
                                                    <TableCell sx={{ fontSize: '0.8125rem', width: 220 }}>Giá (VNĐ)</TableCell>
                                                    <TableCell width={50}></TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {fields.map((field, index) => {
                                                    const priceList = watch("priceList");
                                                    const prevVal = index > 0 ? priceList[index - 1]?.label : null;
                                                    const currentVal = priceList[index]?.label;

                                                    let rangeText = "";
                                                    if (currentVal) {
                                                        if (index === 0) {
                                                            rangeText = `< ${currentVal} vé`;
                                                        } else if (prevVal) {
                                                            rangeText = `${prevVal} -> ${currentVal} vé`;
                                                        }
                                                    }

                                                    return (
                                                        <TableRow key={field.id}>
                                                            <TableCell>
                                                                <Controller
                                                                    name={`priceList.${index}.label`}
                                                                    control={control}
                                                                    render={({ field }) => (
                                                                        <TextField
                                                                            {...field}
                                                                            fullWidth
                                                                            size="small"
                                                                            placeholder="Ví dụ: 5"
                                                                        />
                                                                    )}
                                                                />
                                                            </TableCell>
                                                            <TableCell sx={{ textAlign: 'center' }}>
                                                                {rangeText && (
                                                                    <Typography variant="caption" sx={{ whiteSpace: 'nowrap', color: '#00A76F', fontWeight: 600 }}>
                                                                        {rangeText}
                                                                    </Typography>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Controller
                                                                    name={`priceList.${index}.value`}
                                                                    control={control}
                                                                    render={({ field }) => (
                                                                        <TextField
                                                                            {...field}
                                                                            type="number"
                                                                            fullWidth
                                                                            size="small"
                                                                            onChange={(e) => field.onChange(Number(e.target.value))}
                                                                        />
                                                                    )}
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <IconButton color="error" onClick={() => remove(index)}><DeleteIcon /></IconButton>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </Box>
                                )}


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
                                loading={isPending}
                                label="Lưu thay đổi"
                                loadingLabel="Đang lưu..."
                                sx={{ minHeight: "3rem", minWidth: "4rem" }}
                            />
                        </Box>
                    </Stack>
                </form>
            </ThemeProvider>
        </>
    );
};




