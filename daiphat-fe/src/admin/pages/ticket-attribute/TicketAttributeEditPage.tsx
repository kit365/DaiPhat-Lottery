import {
    Box,
    Stack,
    TextField,
    ThemeProvider,
    useTheme,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    IconButton,
    Typography,
    CircularProgress
} from "@mui/material";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { Title } from "../../components/ui/Title";
import { useState, useEffect, Dispatch, SetStateAction } from "react";
import { CollapsibleCard } from "../../components/ui/CollapsibleCard";
import {
    useTicketAttributeDetail,
    useUpdateTicketAttribute
} from "./hooks/useTicketAttribute";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { getTicketAttributeTheme } from "./configs/theme";
import { prefixAdmin } from "../../constants/routes";
import { toast } from "react-toastify";
import { LoadingButton } from "../../components/ui/LoadingButton";
import { z } from "zod";
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useParams } from "react-router-dom";

// Schema validation 
const attributeOptionSchema = z.object({
    _id: z.string().optional(), // For editing existing options
    label: z.string().min(1, "Nhãn không được để trống"),
    value: z.string().min(1, "Giá trị không được để trống"),
});

const editAttributeSchema = z.object({
    name: z.string().min(1, "Tên thông số không được để trống").max(100),
    type: z.string().min(1, "Vui lòng chọn kiểu hiển thị"),
    options: z.array(attributeOptionSchema).optional(),
});

type EditAttributeFormValues = z.infer<typeof editAttributeSchema>;

import { ATTRIBUTE_TYPES } from "./configs/constants";

export const TicketAttributeEditPage = () => {
    const { id } = useParams();
    const [expandedDetail, setExpandedDetail] = useState(true);
    const [expandedValues, setExpandedValues] = useState(true);
    const toggle = (setter: Dispatch<SetStateAction<boolean>>) =>
        () => setter(prev => !prev);

    const outerTheme = useTheme();
    const localTheme = getTicketAttributeTheme(outerTheme);

    // Fetch detail
    const { data: detailRes, isLoading: isLoadingDetail } = useTicketAttributeDetail(id);

    const {
        control,
        handleSubmit,
        reset,
        watch,
    } = useForm<EditAttributeFormValues>({
        resolver: zodResolver(editAttributeSchema),
        defaultValues: {
            name: "",
            type: "text",
            options: [{ label: "", value: "" }],
        },
    });

    const { fields, append, remove, replace } = useFieldArray({
        control,
        name: "options",
    });

    // Watch type to conditionally render fields
    const watchedType = watch("type");
    const isColorType = watchedType === 'color';

    // Populate form with detail data
    useEffect(() => {
        if (detailRes) {
            const detail = detailRes; 

            reset({
                name: detail.name || "",
                type: detail.type || "text",
                options: detail.options ? detail.options.map((opt: any) => ({
                    _id: opt._id,
                    label: opt.label,
                    value: opt.value
                })) : [{ label: "", value: "" }],
            });
        }
    }, [detailRes, reset]);

    // Update mutation
    const { mutate: update, isPending } = useUpdateTicketAttribute();

    const onSubmit = (data: EditAttributeFormValues) => {
        // Strip _id from options before sending to API
        const submitData = {
            ...data,
            options: data.options?.map(opt => ({
                label: opt.label,
                value: opt.value
            }))
        };

        update({ id: id!, data: submitData }, {
            onSuccess: (response) => {
                if (response.success) {
                    toast.success(response.message || "Cập nhật thông số thành common!");
                } else {
                    toast.error(response.message);
                }
            },
            onError: () => {
                toast.error("Có lỗi xảy ra khi cập nhật thông số");
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
                    <Title title="Chỉnh sửa thông số vé số" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: "/" },
                            { label: "Thông số vé số", to: `/${prefixAdmin}/ticket/attribute/list` },
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
                            title="Thông tin thông số"
                            subheader="Cập nhật tên và kiểu hiển thị"
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
                                        name="name"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                {...field}
                                                label="Tên thông số"
                                                placeholder="Ví dụ: Kỳ mở thưởng, Loại vé..."
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message}
                                            />
                                        )}
                                    />
                                    <Controller
                                        name="type"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <FormControl error={!!fieldState.error}>
                                                <InputLabel>Kiểu hiển thị</InputLabel>
                                                <Select
                                                    {...field}
                                                    label="Kiểu hiển thị"
                                                    onChange={(e) => {
                                                        field.onChange(e);
                                                        if (fields.length === 0) {
                                                            replace([{ label: "", value: "" }]);
                                                        }
                                                    }}
                                                >
                                                    {ATTRIBUTE_TYPES.map((type) => (
                                                        <MenuItem
                                                            key={type.value}
                                                            value={type.value}
                                                            sx={{ fontSize: '0.875rem' }}
                                                        >
                                                            {type.label}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                                {fieldState.error && (
                                                    <Typography
                                                        sx={{
                                                            color: '#d32f2f',
                                                            fontSize: '0.75rem',
                                                            mt: 0.5,
                                                            ml: 1.75
                                                        }}
                                                    >
                                                        {fieldState.error.message}
                                                    </Typography>
                                                )}
                                            </FormControl>
                                        )}
                                    />
                                </Box>
                            </Stack>
                        </CollapsibleCard>

                        <CollapsibleCard
                            title="Danh sách giá trị"
                            subheader={isColorType ? "Chỉnh sửa các màu sắc cho thông số" : "Chỉnh sửa các giá trị lựa chọn"}
                            expanded={expandedValues}
                            onToggle={toggle(setExpandedValues)}
                        >
                            <Stack p="calc(3 * var(--spacing))" gap="calc(2 * var(--spacing))">
                                {fields.map((field, index) => (
                                    <Box
                                        key={field.id}
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "calc(2 * var(--spacing))",
                                        }}
                                    >
                                        <Controller
                                            name={`options.${index}.label`}
                                            control={control}
                                            render={({ field: inputField, fieldState }) => (
                                                <TextField
                                                    {...inputField}
                                                    label="Nhãn (Label)"
                                                    placeholder={isColorType ? "Ví dụ: Đỏ" : "Ví dụ: Giá trị..."}
                                                    error={!!fieldState.error}
                                                    helperText={fieldState.error?.message}
                                                    sx={{ flex: 1 }}
                                                />
                                            )}
                                        />

                                        {isColorType ? (
                                            <Controller
                                                name={`options.${index}.value`}
                                                control={control}
                                                render={({ field: inputField, fieldState }) => {
                                                    const colorValue = inputField.value || '';
                                                    const isValidHex = /^#[0-9A-Fa-f]{6}$/.test(colorValue);

                                                    return (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: 220 }}>
                                                            <TextField
                                                                {...inputField}
                                                                label="Mã màu"
                                                                placeholder="#FF0000"
                                                                error={!!fieldState.error}
                                                                helperText={fieldState.error?.message}
                                                                sx={{ flex: 1 }}
                                                                onChange={(e) => {
                                                                    inputField.onChange(e.target.value); 
                                                                }}
                                                            />
                                                            <Box
                                                                sx={{
                                                                    width: 40,
                                                                    height: 40,
                                                                    borderRadius: "var(--shape-borderRadius)",
                                                                    border: '1px solid var(--palette-text-disabled)33',
                                                                    backgroundColor: isValidHex ? colorValue : 'var(--palette-background-neutral)',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    position: 'relative',
                                                                    overflow: 'hidden',
                                                                    cursor: 'pointer',
                                                                    transition: 'background-color 0.2s',
                                                                }}
                                                            >
                                                                <input
                                                                    type="color"
                                                                    value={isValidHex ? colorValue : '#000000'}
                                                                    onChange={(e) => inputField.onChange(e.target.value.toUpperCase())}
                                                                    style={{
                                                                        position: 'absolute',
                                                                        width: '200%',
                                                                        height: '200%',
                                                                        opacity: 0,
                                                                        cursor: 'pointer',
                                                                        top: '-50%',
                                                                        left: '-50%'
                                                                    }}
                                                                />
                                                            </Box>
                                                        </Box>
                                                    );
                                                }}
                                            />
                                        ) : (
                                            <Controller
                                                name={`options.${index}.value`}
                                                control={control}
                                                render={({ field: inputField, fieldState }) => (
                                                    <TextField
                                                        {...inputField}
                                                        label="Giá trị (Value)"
                                                        placeholder="Giá trị hiển thị..."
                                                        error={!!fieldState.error}
                                                        helperText={fieldState.error?.message}
                                                        sx={{ flex: 1 }}
                                                    />
                                                )}
                                            />
                                        )}

                                        <IconButton
                                            onClick={() => remove(index)}
                                            disabled={fields.length === 1}
                                            sx={{
                                                color: fields.length === 1 ? 'var(--palette-text-disabled)' : 'var(--palette-error-main)',
                                                '&:hover': {
                                                    backgroundColor: 'rgba(255, 86, 48, 0.08)'
                                                }
                                            }}
                                        >
                                            <DeleteOutlineIcon />
                                        </IconButton>
                                    </Box>
                                ))}

                                <Button
                                    type="button"
                                    onClick={() => append({ label: "", value: "" })}
                                    startIcon={<AddIcon />}
                                    sx={{
                                        alignSelf: 'flex-start',
                                        color: 'var(--palette-primary-main)',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        textTransform: 'none',
                                        '&:hover': {
                                            backgroundColor: 'rgba(0, 167, 111, 0.08)'
                                        }
                                    }}
                                >
                                    {isColorType ? "Thêm màu" : "Thêm giá trị"}
                                </Button>
                            </Stack>
                        </CollapsibleCard>


                        <Box gap="calc(3 * var(--spacing))" sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                            <LoadingButton
                                type="submit"
                                loading={isPending}
                                label="Cập nhật thông số"
                                loadingLabel="Đang cập nhật..."
                                sx={{ minHeight: "3rem", minWidth: "4rem", padding: "8px 22px" }}
                            />
                        </Box>
                    </Stack>
                </form>
            </ThemeProvider>
        </>
    );
};
