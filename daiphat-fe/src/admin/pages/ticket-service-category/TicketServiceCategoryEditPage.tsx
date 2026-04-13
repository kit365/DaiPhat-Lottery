import { Box, Stack, TextField, ThemeProvider, useTheme, MenuItem, FormControl, InputLabel, Select, Chip, OutlinedInput, CircularProgress } from "@mui/material"
import { Breadcrumb } from "../../components/ui/Breadcrumb"
import { Title } from "../../components/ui/Title"
import { Tiptap } from "../../components/layouts/titap/Tiptap"
import { useState, useEffect, type Dispatch, type SetStateAction } from "react";
import { CollapsibleCard } from "../../components/ui/CollapsibleCard";
import { useUpdateTicketServiceCategory, useNestedTicketServiceCategories, useTicketServiceCategoryDetail } from "./hooks/useTicketServiceCategory";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { ticketServiceCategorySchema, TicketServiceCategoryFormValues } from "../../schemas/service-category.schema";
import { getTicketServiceCategoryTheme } from "./configs/theme";
import { prefixAdmin } from "../../constants/routes";
import { FormUploadSingleFile } from "../../components/upload/FormUploadSingleFile";
import { toast } from "react-toastify";
import { LoadingButton } from "../../components/ui/LoadingButton";
import { CategoryParentSelect } from "../../components/ui/CategoryTreeSelect";
import { SwitchButton } from "../../components/ui/SwitchButton";
import { useParams, useNavigate } from "react-router-dom";
import { confirmAction } from "../../utils/swal";

const REGIONAL_TYPES = ["XSMN", "XSMB", "XSMT"];

export const TicketServiceCategoryEditPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [expandedDetail, setExpandedDetail] = useState(true);
    const [expandedConfig, setExpandedConfig] = useState(true);

    const toggle = (setter: Dispatch<SetStateAction<boolean>>) =>
        () => setter(prev => !prev);

    const outerTheme = useTheme();
    const localTheme = getTicketServiceCategoryTheme(outerTheme);

    const { data: category, isLoading: isFetching } = useTicketServiceCategoryDetail(id);
    const { data: nestedCategories = [] } = useNestedTicketServiceCategories();
    const { mutate: update, isPending } = useUpdateTicketServiceCategory();

    const {
        control,
        handleSubmit,
        reset
    } = useForm<TicketServiceCategoryFormValues>({
        resolver: zodResolver(ticketServiceCategorySchema),
        defaultValues: {
            name: "",
            slug: "",
            description: "",
            parentId: "",
            status: "active",
            avatar: "",
            userTicketTypes: ["XSMN", "XSMB", "XSMT"],
        },
    });

    useEffect(() => {
        if (category) {
            reset({
                name: category.name || "",
                slug: category.slug || "",
                description: category.description || "",
                parentId: category.parentId || "",
                status: category.status || "active",
                avatar: category.avatar || "",
                userTicketTypes: category.userTicketTypes || ["XSMN", "XSMB", "XSMT"],
            });
        }
    }, [category, reset]);

    const onSubmit = (data: TicketServiceCategoryFormValues) => {
        const executeUpdate = () => {
            update({ id: id as string, data }, {
                onSuccess: (response) => {
                    if (response.code === 200 || response.success) {
                        toast.success("Cập nhật danh mục thành công!");
                        navigate(`/${prefixAdmin}/ticketService/categories`);
                    } else {
                        toast.error(response.message || "Cập nhật thất bại");
                    }
                },
                onError: () => {
                    toast.error("Cập nhật danh mục thất bại");
                }
            });
        };

        if (data.status === "inactive" && category?.status !== "inactive") {
            confirmAction(
                "Xác nhận tạm ẩn?",
                "Nếu bạn tạm ẩn danh mục này, tất cả các dịch vụ thuộc danh mục này cũng sẽ bị tạm ẩn. Bạn có chắc chắn?",
                executeUpdate,
                "warning"
            );
        } else {
            executeUpdate();
        }
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
                    <Title title="Chỉnh sửa danh mục dịch vụ" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: "/" },
                            { label: "Danh mục loại vé", to: `/${prefixAdmin}/ticketService/categories` },
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
                            subheader="Tiêu đề, mô tả, hình ảnh..."
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
                                                label="Tên danh mục"
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message}
                                            />
                                        )}
                                    />
                                    <CategoryParentSelect
                                        control={control}
                                        name="parentId"
                                        categories={nestedCategories.filter((c: any) => c._id !== id)}
                                    />
                                </Box>
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
                                <FormUploadSingleFile
                                    name="avatar"
                                    control={control}
                                />
                            </Stack>
                        </CollapsibleCard>

                        <CollapsibleCard
                            title="Cấu hình"
                            subheader="Cấu hình tiện ích và vùng miền..."
                            expanded={expandedConfig}
                            onToggle={toggle(setExpandedConfig)}
                        >
                            <Stack p="calc(3 * var(--spacing))" gap="calc(3 * var(--spacing))">
                                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "calc(3 * var(--spacing)) calc(2 * var(--spacing))" }}>
                                    <Controller
                                        name="userTicketTypes"
                                        control={control}
                                        render={({ field }) => (
                                            <FormControl fullWidth>
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
                                            </FormControl>
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
