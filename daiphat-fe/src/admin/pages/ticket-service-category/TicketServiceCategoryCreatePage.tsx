import { Box, Stack, TextField, ThemeProvider, useTheme, MenuItem, FormControl, InputLabel, Select, Chip, OutlinedInput } from "@mui/material"
import { Breadcrumb } from "../../components/ui/Breadcrumb"
import { Title } from "../../components/ui/Title"
import { Tiptap } from "../../components/layouts/titap/Tiptap"
import { useState, type Dispatch, type SetStateAction } from "react";
import { CollapsibleCard } from "../../components/ui/CollapsibleCard";
import { useCreateTicketServiceCategory, useNestedTicketServiceCategories } from "./hooks/useTicketServiceCategory";
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

const REGIONAL_TYPES = ["XSMN", "XSMB", "XSMT"];

export const TicketServiceCategoryCreatePage = () => {
    const [expandedDetail, setExpandedDetail] = useState(true);
    const [expandedConfig, setExpandedConfig] = useState(true);

    const toggle = (setter: Dispatch<SetStateAction<boolean>>) =>
        () => setter(prev => !prev);

    const outerTheme = useTheme();
    const localTheme = getTicketServiceCategoryTheme(outerTheme);

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

    const { data: nestedCategories = [] } = useNestedTicketServiceCategories();
    const { mutate: create, isPending } = useCreateTicketServiceCategory();

    const onSubmit = (data: TicketServiceCategoryFormValues) => {
        console.log(data);
        create(data, {
            onSuccess: (response) => {
                if (response.code === 201 || response.success) {
                    toast.success("Tạo danh mục thành công!");
                    reset();
                } else {
                    toast.error(response.message || "Tạo danh mục thất bại");
                }
            },
            onError: () => {
                toast.error("Tạo danh mục thất bại");
            }
        });
    };

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Tạo mới danh mục dịch vụ" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: "/" },
                            { label: "Danh mục loại vé", to: `/${prefixAdmin}/ticketService/categories` },
                            { label: "Tạo mới" }
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
                                        categories={nestedCategories}
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
                                label="Tạo danh mục"
                                loadingLabel="Đang tạo..."
                                sx={{ minHeight: "3rem", minWidth: "4rem" }}
                            />
                        </Box>
                    </Stack>
                </form>
            </ThemeProvider>
        </>
    );
};




