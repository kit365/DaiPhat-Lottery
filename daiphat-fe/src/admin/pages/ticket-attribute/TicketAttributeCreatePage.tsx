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
    Tooltip
} from "@mui/material";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { Title } from "../../components/ui/Title";
import { useState, Dispatch, SetStateAction } from "react";
import { CollapsibleCard } from "../../components/ui/CollapsibleCard";
import {
    useCreateTicketAttribute
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
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { ATTRIBUTE_TYPES } from "./configs/constants";

// DnD Imports
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Schema validation 
const attributeOptionSchema = z.object({
    label: z.string().min(1, "Nhãn không được để trống"),
    value: z.string().min(1, "Giá trị không được để trống"),
});

const createAttributeSchema = z.object({
    name: z.string().min(1, "Tên thông số không được để trống").max(100),
    type: z.string().min(1, "Vui lòng chọn kiểu hiển thị"),
    options: z.array(attributeOptionSchema).optional(),
});

type CreateAttributeFormValues = z.infer<typeof createAttributeSchema>;

const ATTRIBUTE_TYPES_WITH_DEFAULT = [
    { value: '', label: '-- Chọn kiểu hiển thị --' },
    ...ATTRIBUTE_TYPES
];

// Sortable Item Component
interface SortableAttributeOptionProps {
    id: string;
    index: number;
    control: any;
    remove: (index: number) => void;
    fieldsLength: number;
    isColorType: boolean;
}

const SortableAttributeOption = ({ id, index, control, remove, fieldsLength, isColorType }: SortableAttributeOptionProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <Box
            ref={setNodeRef}
            style={style}
            sx={{
                display: "flex",
                alignItems: "center", 
                gap: "calc(2 * var(--spacing))",
                backgroundColor: "var(--palette-background-paper)",
                padding: '8px 0',
            }}
        >
            <Box
                {...attributes}
                {...listeners}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--palette-text-disabled)',
                    cursor: 'grab',
                    padding: '8px',
                    borderRadius: '50%',
                    '&:hover': {
                        backgroundColor: 'rgba(145, 158, 171, 0.08)',
                        color: 'var(--palette-text-secondary)'
                    },
                    '&:active': {
                        cursor: 'grabbing',
                    }
                }}
            >
                <DragIndicatorIcon />
            </Box>

            <Controller
                name={`options.${index}.label`}
                control={control}
                render={({ field: inputField, fieldState }) => (
                    <TextField
                        {...inputField}
                        label="Nhãn (Label)"
                        placeholder={isColorType ? "Ví dụ: Đỏ" : "Ví dụ: Số lượng..."}
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
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                                <TextField
                                    {...inputField}
                                    label="Giá trị (Hex)"
                                    placeholder="#FF0000"
                                    error={!!fieldState.error}
                                    helperText={fieldState.error?.message}
                                    sx={{ flex: 1 }}
                                    size="small"
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

            <Tooltip title="Xóa lựa chọn">
                <IconButton
                    onClick={() => remove(index)}
                    disabled={fieldsLength === 1}
                    sx={{
                        color: fieldsLength === 1 ? 'var(--palette-text-disabled)' : 'var(--palette-error-main)',
                        '&:hover': {
                            backgroundColor: 'rgba(255, 86, 48, 0.08)'
                        }
                    }}
                >
                    <DeleteOutlineIcon />
                </IconButton>
            </Tooltip>
        </Box>
    );
};


export const TicketAttributeCreatePage = () => {
    const [expandedDetail, setExpandedDetail] = useState(true);
    const [expandedValues, setExpandedValues] = useState(true);
    const toggle = (setter: Dispatch<SetStateAction<boolean>>) =>
        () => setter(prev => !prev);

    const outerTheme = useTheme();
    const localTheme = getTicketAttributeTheme(outerTheme);

    const {
        control,
        handleSubmit,
        reset,
        watch,
    } = useForm<CreateAttributeFormValues>({
        resolver: zodResolver(createAttributeSchema),
        defaultValues: {
            name: "",
            type: "select",
            options: [{ label: "", value: "" }],
        },
    });

    const { fields, append, remove, replace, move } = useFieldArray({
        control,
        name: "options",
    });

    // Sensors for Drag and Drop
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            const oldIndex = fields.findIndex((item) => item.id === active.id);
            const newIndex = fields.findIndex((item) => item.id === over?.id);
            move(oldIndex, newIndex);
        }
    };

    // Watch type to conditionally render fields
    const watchedType = watch("type");
    const isColorType = watchedType === 'color';

    // Create mutation
    const { mutate: create, isPending } = useCreateTicketAttribute();

    const onSubmit = (data: CreateAttributeFormValues) => {
        create(data, {
            onSuccess: (response) => {
                if (response.success) {
                    toast.success(response.message || "Tạo thông số thành công!");
                    reset({
                        name: "",
                        type: "select",
                        options: [{ label: "", value: "" }],
                    });
                } else {
                    toast.error(response.message);
                }
            },
            onError: () => {
                toast.error("Có lỗi xảy ra khi tạo thông số");
            }
        });
    };

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Tạo mới thông số vé số" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: "/" },
                            { label: "Thông số vé số", to: `/${prefixAdmin}/ticket/attribute/list` },
                            { label: "Thêm mới" }
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
                            subheader="Nhập tên và kiểu hiển thị của thông số"
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
                                                <InputLabel shrink={true}>Kiểu hiển thị</InputLabel>
                                                <Select
                                                    {...field}
                                                    label="Kiểu hiển thị"
                                                    displayEmpty
                                                    renderValue={(selected) => {
                                                        if (!selected) {
                                                            return <span style={{ color: 'var(--palette-text-disabled)' }}>-- Chọn kiểu hiển thị --</span>;
                                                        }
                                                        const selectedOption = ATTRIBUTE_TYPES_WITH_DEFAULT.find(opt => opt.value === selected);
                                                        return selectedOption ? selectedOption.label : selected;
                                                    }}
                                                    onChange={(e) => {
                                                        field.onChange(e);
                                                        if (fields.length === 0) {
                                                            replace([{ label: "", value: "" }]);
                                                        }
                                                    }}
                                                >
                                                    {ATTRIBUTE_TYPES_WITH_DEFAULT.map((type) => (
                                                        <MenuItem
                                                            key={type.value}
                                                            value={type.value}
                                                            sx={{ fontSize: '0.875rem', display: type.value === '' ? 'none' : 'block' }}
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
                            title="Danh sách lựa chọn"
                            subheader={isColorType ? "Thêm các màu sắc cho thông số" : "Thêm các giá trị lựa chọn"}
                            expanded={expandedValues}
                            onToggle={toggle(setExpandedValues)}
                        >
                            <Stack p="calc(3 * var(--spacing))" gap="calc(2 * var(--spacing))">
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={fields}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {fields.map((field, index) => (
                                            <SortableAttributeOption
                                                key={field.id}
                                                id={field.id}
                                                index={index}
                                                control={control}
                                                remove={remove}
                                                fieldsLength={fields.length}
                                                isColorType={isColorType}
                                            />
                                        ))}
                                    </SortableContext>
                                </DndContext>

                                <Button
                                    type="button"
                                    variant="outlined"
                                    color="primary"
                                    startIcon={<AddIcon />}
                                    onClick={() => append({ label: "", value: "" })}
                                    sx={{
                                        borderStyle: 'dashed',
                                        borderWidth: '1px',
                                        justifyContent: 'center',
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        py: 1.5,
                                        mt: 1,
                                        color: 'var(--palette-primary-main)',
                                        borderColor: 'rgba(0, 167, 111, 0.3)',
                                        fontSize: '0.875rem',
                                        '&:hover': {
                                            borderColor: 'var(--palette-primary-main)',
                                            backgroundColor: 'rgba(0, 167, 111, 0.08)'
                                        }
                                    }}
                                >
                                    {isColorType ? "Thêm màu" : "Thêm lựa chọn"}
                                </Button>
                            </Stack>
                        </CollapsibleCard>


                        <Box gap="calc(3 * var(--spacing))" sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                            <LoadingButton
                                type="submit"
                                loading={isPending}
                                label="Tạo thông số"
                                loadingLabel="Đang tạo..."
                                sx={{ minHeight: "3rem", minWidth: "4rem", padding: "8px 22px" }}
                            />
                        </Box>
                    </Stack>
                </form>
            </ThemeProvider>
        </>
    )
}
