import { Box, createTheme, FormControl, InputLabel, MenuItem, OutlinedInput, Select, Stack, TextField, ThemeProvider, useTheme, Button, Checkbox, FormControlLabel, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Switch, Divider, ListItemText } from "@mui/material"
import { useTranslation } from "react-i18next";
import { Breadcrumb } from "../../components/ui/Breadcrumb"
import { Title } from "../../components/ui/Title"
import { useState, useMemo, useEffect, type Dispatch, type SetStateAction } from "react"
import { Tiptap } from "../../components/layouts/titap/Tiptap"
import { UploadFiles } from "../../components/ui/UploadFiles"
import { CollapsibleCard } from "../../components/ui/CollapsibleCard"
import { prefixAdmin } from "../../constants/routes";
import { CategoryTreeSelectGeneric } from "../../components/ui/CategoryTreeSelectGeneric";
import { useCreateTicketData, useUpdateTicket, useTicketDetail } from "./hooks/useTicket";
import { toast } from "react-toastify";
import { useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createTicketSchema } from "../../schemas/ticket.schema";
import { LoadingButton } from "../../components/ui/LoadingButton";
import { useProviders } from "../provider/hooks/useProvider";
import { useTicketSubtypes } from "../account-user/hooks/useTicketSubtype";

interface CustomFile extends File {
    preview: string;
}

interface VariantAttribute {
    attrId: string;
    attrType: string;
    label: string;
    value: string;
}

interface Variant {
    id: string;
    attributeValue: VariantAttribute[];
    priceOld: string;
    priceNew: string;
    stock: string;
    status: boolean;
}

export const TicketEditPage = () => {
    const { t } = useTranslation();
    const { id } = useParams();

    const {
        control,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { }
    } = useForm<any>({
        resolver: zodResolver(createTicketSchema),
        defaultValues: {
            name: "",
            description: "",
            content: "",
            position: "0",
            priceOld: "0",
            priceNew: "0",
            stock: "0",
            status: "active",
            category: [],
            attributes: [],
            variants: [],
            images: [],
            providerId: "",
            isFood: false,
            expiryDate: "",
            suitableTicketSubtypes: [],
            minAge: 0,
        }
    });

    const [resetKey] = useState(0);
    const [expandedDetail, setExpandedDetail] = useState(true);
    const [expandedExtra, setExpandedExtra] = useState(true);
    const [expandedPrice, setExpandedPrice] = useState(true);
    const [expandedVariants, setExpandedVariants] = useState(true);

    const toggle = (setter: Dispatch<SetStateAction<boolean>>) =>
        () => setter(prev => !prev);

    const [userTicketType, setUserTicketType] = useState<string>("all");
    const [files, setFiles] = useState<CustomFile[]>([]);
    const [variants, setVariants] = useState<Variant[]>([]);

    const { data: createData } = useCreateTicketData();
    const { data: detailData, isLoading, error } = useTicketDetail(id);
    const { data: providersRes } = useProviders({ limit: 1000 });
    const providers = (providersRes as any)?.data?.recordList || [];
    const { data: ticketSubtypesRes } = useTicketSubtypes({ limit: 1000 });
    const ticketSubtypes = (ticketSubtypesRes as any)?.data?.recordList || [];
    const { mutate: update, isPending } = useUpdateTicket();

    const actualDetail = detailData?.ticketDetail || null;
    const attributes = detailData?.attributeList || createData?.attributeList || [];
    const nestedCategories = detailData?.categoryList || createData?.categoryList || [];

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
            MuiTableHead: {
                styleOverrides: {
                    root: {
                        backgroundColor: "var(--palette-background-neutral)",
                        "& .MuiTableCell-root": {
                            fontWeight: 600,
                            color: "var(--palette-text-secondary)",
                            fontSize: "1rem",
                        }
                    }
                }
            },
            MuiTableCell: {
                styleOverrides: {
                    root: {
                        fontSize: "1rem",
                    }
                }
            },
            MuiTypography: {
                styleOverrides: {
                    root: {
                        fontSize: "1rem",
                    },
                    subtitle1: {
                        fontSize: "1rem",
                        fontWeight: 600,
                    },
                    subtitle2: {
                        fontSize: "1rem",
                        fontWeight: 600,
                    }
                }
            },
            MuiFormControlLabel: {
                styleOverrides: {
                    label: {
                        fontSize: "1rem",
                    }
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

    // Populate form data
    useEffect(() => {
        if (actualDetail) {
            const initialVariants = (actualDetail.variants || []).map((v: any, index: number) => ({
                ...v,
                id: v.id || v._id || `v-edit-${Date.now()}-${index}`
            }));

            reset({
                name: actualDetail.name || "",
                description: actualDetail.description || "",
                content: actualDetail.content || "",
                position: String(actualDetail.position || ""),
                priceOld: String(actualDetail.priceOld || "0"),
                priceNew: String(actualDetail.priceNew || "0"),
                stock: String(actualDetail.stock || "0"),
                status: actualDetail.status || "active",
                category: actualDetail.category || [],
                providerId: actualDetail.providerId || "",
                attributes: actualDetail.attributes || [],
                variants: initialVariants,
                images: actualDetail.images || [],
                isFood: actualDetail.isFood || false,
                expiryDate: actualDetail.expiryDate ? new Date(actualDetail.expiryDate).toISOString().slice(0, 16) : "",
                suitableTicketSubtypes: actualDetail.suitableTicketSubtypes || [],
                minAge: actualDetail.minAge || 0,
            });
            setVariants(initialVariants);
            // For files, if they are strings (URLs), UploadFiles handles it
            setFiles(actualDetail.images?.map((img: string) => ({ name: img, preview: img } as any)) || []);
        }
    }, [actualDetail, reset, id]);

    useEffect(() => {
        setValue("images", files);
    }, [files, setValue]);

    useEffect(() => {
        setValue("variants", variants);
        // Calculate total stock if variants exist
        if (variants.length > 0) {
            const totalStock = variants.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0);
            setValue("stock", String(totalStock));
        }
    }, [variants, setValue]);

    const selectedAttributeIds = watch("attributes") || [];

    const handleToggleAttribute = (id: string) => {
        const next = selectedAttributeIds.includes(id)
            ? selectedAttributeIds.filter(attrId => attrId !== id)
            : [...selectedAttributeIds, id];
        setValue("attributes", next);

        if (next.length === 0) {
            setVariants([]);
        }
    };

    const generateVariants = () => {
        const selectedAttrs = attributes.filter((attr: any) => selectedAttributeIds.includes((attr.id || attr._id).toString()));
        if (selectedAttrs.length === 0) return;

        const cartesian = (arrays: any[][]): any[][] => {
            return arrays.reduce((a, b) =>
                a.flatMap(d => b.map(e => [d, e].flat()))
                , [[]]);
        };

        const attrValues = selectedAttrs.map((attr: any) =>
            (attr.options || []).map((opt: any) => ({
                attrId: (attr.id || attr._id).toString(),
                attrType: attr.type,
                label: opt.label,
                value: opt.value
            }))
        );

        const combinations = cartesian(attrValues);
        // Lấy giá trị hiện tại từ form làm mặc định cho variant
        const currentPriceOld = watch("priceOld") || "0";
        const currentPriceNew = watch("priceNew") || "0";

        const newVariants: Variant[] = combinations.map((combo, index) => ({
            id: `v-${Date.now()}-${index}`,
            attributeValue: combo,
            priceOld: String(currentPriceOld),
            priceNew: String(currentPriceNew),
            stock: "0",
            status: true
        }));

        setVariants(newVariants);
    };

    const handleUpdateVariant = (id: string, field: keyof Variant, value: any) => {
        setVariants(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
    };

    const onSubmit = (data: any) => {
        const payload = {
            ...data,
            category: JSON.stringify(data.category),
            variants: JSON.stringify(data.variants.map((v: any) => ({
                status: v.status,
                attributeValue: v.attributeValue,
                priceOld: Number(v.priceOld) || 0,
                priceNew: Number(v.priceNew) || 0,
                stock: Number(v.stock) || 0
            }))),
            attributes: JSON.stringify(data.attributes),
            images: JSON.stringify(data.images.map((f: any) => f.name || f)),
            suitableTicketSubtypes: JSON.stringify(data.suitableTicketSubtypes),
            priceOld: Number(data.priceOld) || 0,
            priceNew: Number(data.priceNew) || 0,
            stock: Number(data.stock) || 0,
            position: Number(data.position) || 0
        };

        update({ id: id!, data: payload }, {
            onSuccess: (res) => {
                if (res.success) {
                    toast.success(res.message || "Cập nhật vé số thành công!");
                } else {
                    toast.error(res.message || "Cập nhật vé số thất bại");
                }
            },
            onError: (err: any) => {
                toast.error(err?.message || "Đã xảy ra lỗi khi cập nhật vé số");
            }
        });
    };

    if (isLoading) return <Typography sx={{ p: 5, textAlign: 'center' }}>Đang tải dữ liệu...</Typography>;
    if (error) return <Typography sx={{ p: 5, textAlign: 'center', color: 'error.main' }}>Lỗi khi tải dữ liệu sản phẩm. Vui lòng thử lại.</Typography>;

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title={"Chỉnh sửa vé số"} />
                    <Breadcrumb
                        items={[
                            { label: t('admin.dashboard.title'), to: "/" },
                            { label: "Danh sách vé số", to: `/${prefixAdmin}/ticket/list` },
                            { label: t('admin.common.edit') }
                        ]}
                    />
                </div>
            </div>
            <ThemeProvider theme={localTheme}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Stack sx={{
                        margin: "0px calc(15 * var(--spacing))",
                        gap: "calc(5 * var(--spacing))",
                        pb: 10
                    }}>
                        <CollapsibleCard
                            title={t('admin.common.details')}
                            subheader={t('admin.common.description')}
                            expanded={expandedDetail}
                            onToggle={toggle(setExpandedDetail)}
                        >
                            <Stack p="calc(3 * var(--spacing))" gap="calc(3 * var(--spacing))">
                                <Controller
                                    name="name"
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <TextField
                                            {...field}
                                            label={t('admin.ticket.fields.name')}
                                            fullWidth
                                            error={!!fieldState.error}
                                            helperText={fieldState.error?.message}
                                        />
                                    )}
                                />
                                <Controller
                                    name="description"
                                    control={control}
                                    render={({ field }) => (
                                        <Tiptap
                                            value={field.value}
                                            onChange={field.onChange}
                                        />
                                    )}
                                />
                                <UploadFiles
                                    key={resetKey}
                                    files={files}
                                    onFilesChange={(newFiles) => setFiles(newFiles)}
                                />
                            </Stack>
                        </CollapsibleCard>

                        <CollapsibleCard
                            title={t('admin.common.attributes')}
                            subheader={t('admin.common.description')}
                            expanded={expandedExtra}
                            onToggle={toggle(setExpandedExtra)}
                        >
                            <Stack p="calc(3 * var(--spacing))" gap="calc(3 * var(--spacing))">
                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(2, 1fr)",
                                        gap: "calc(3 * var(--spacing)) calc(2 * var(--spacing))",
                                    }}
                                >
                                    <CategoryTreeSelectGeneric
                                        multiple
                                        name="category"
                                        control={control}
                                        categories={nestedCategories}
                                        label={t('admin.ticket.fields.select_category')}
                                    />

                                    <Controller
                                        name="providerId"
                                        control={control}
                                        render={({ field }) => (
                                            <FormControl fullWidth>
                                                <InputLabel shrink>{"Nhà đài"}</InputLabel>
                                                <Select
                                                    {...field}
                                                    displayEmpty
                                                    input={<OutlinedInput label={"Nhà đài"} notched />}
                                                >
                                                    <MenuItem value="">
                                                        <Box sx={{ color: "#919EAB" }}>Chọn nhà đài</Box>
                                                    </MenuItem>
                                                    {Array.isArray(providers) && providers.map((provider: any) => {
                                                        const providerId = provider._id || provider.id;
                                                        return (
                                                            <MenuItem key={providerId} value={providerId}>
                                                                {provider.name}
                                                            </MenuItem>
                                                        );
                                                    })}
                                                </Select>
                                            </FormControl>
                                        )}
                                    />
                                </Box>
                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(2, 1fr)",
                                        gap: "calc(3 * var(--spacing)) calc(2 * var(--spacing))",
                                    }}
                                >
                                    <Controller
                                        name="status"
                                        control={control}
                                        render={({ field }) => (
                                            <FormControl>
                                                <InputLabel id="status-select-label" sx={{ color: "var(--palette-text-secondary)" }}>{t('admin.common.status')}</InputLabel>
                                                <Select
                                                    {...field}
                                                    labelId="status-select-label"
                                                    input={<OutlinedInput label={t('admin.common.status')} />}
                                                >
                                                    <MenuItem value="draft">{t('admin.ticket.status.draft')}</MenuItem>
                                                    <MenuItem value="active">{t('admin.ticket.status.active')}</MenuItem>
                                                    <MenuItem value="inactive">{t('admin.ticket.status.inactive')}</MenuItem>
                                                </Select>
                                            </FormControl>
                                        )}
                                    />

                                    <Controller
                                        name="position"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                {...field}
                                                label={t('admin.common.position')}
                                                fullWidth
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message}
                                            />
                                        )}
                                    />
                                </Box>
                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(2, 1fr)",
                                        gap: "calc(3 * var(--spacing)) calc(2 * var(--spacing))",
                                        alignItems: "center"
                                    }}
                                >
                                    <Controller
                                        name="isFood"
                                        control={control}
                                        render={({ field }) => (
                                            <FormControlLabel
                                                control={<Checkbox {...field} checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                                                label="Vé số có thời hạn quay thưởng"
                                            />
                                        )}
                                    />

                                    {watch("isFood") && (
                                        <>
                                            <Controller
                                                name="expiryDate"
                                                control={control}
                                                render={({ field, fieldState }) => (
                                                    <TextField
                                                        {...field}
                                                        label="Ngày hết hạn"
                                                        type="datetime-local"
                                                        fullWidth
                                                        InputLabelProps={{ shrink: true }}
                                                        inputProps={{ min: new Date().toISOString().slice(0, 16) }}
                                                        error={!!fieldState.error}
                                                        helperText={fieldState.error?.message}
                                                    />
                                                )}
                                            />
                                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                                                <FormControl fullWidth>
                                                    <InputLabel id="userTicket-type-label">Miền</InputLabel>
                                                    <Select
                                                        labelId="userTicket-type-label"
                                                        value={userTicketType}
                                                        label="Miền"
                                                        onChange={(e) => setUserTicketType(e.target.value)}
                                                    >
                                                        <MenuItem value="all">Tất cả</MenuItem>
                                                        <MenuItem value="dog">Miền Nam</MenuItem>
                                                        <MenuItem value="cat">Miền Trung</MenuItem>
                                                    </Select>
                                                </FormControl>
                                                <Controller
                                                    name="suitableTicketSubtypes"
                                                    control={control}
                                                    render={({ field }) => {
                                                        const filteredTicketSubtypes = userTicketType === "all"
                                                            ? ticketSubtypes
                                                            : ticketSubtypes.filter((b: any) => b.type === userTicketType);

                                                        return (
                                                            <FormControl fullWidth>
                                                                <InputLabel id="ticketSubtypes-label">Tỉnh thành ({userTicketType === "all" ? "Tất cả" : userTicketType === "dog" ? "Miền Nam" : "Miền Trung"})</InputLabel>
                                                                <Select
                                                                    {...field}
                                                                    labelId="ticketSubtypes-label"
                                                                    multiple
                                                                    input={<OutlinedInput label={`Tỉnh thành (${userTicketType === "all" ? "Tất cả" : userTicketType === "dog" ? "Miền Nam" : "Miền Trung"})`} />}
                                                                    renderValue={(selected) => (
                                                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                                            {(selected as string[]).map((value) => (
                                                                                <Typography key={value} variant="body2" sx={{ bgcolor: 'var(--palette-background-neutral)', px: 1, borderRadius: 1 }}>
                                                                                    {ticketSubtypes.find((b: any) => (b.id || b._id) === value)?.name || value}
                                                                                </Typography>
                                                                            ))}
                                                                        </Box>
                                                                    )}
                                                                >
                                                                    <MenuItem
                                                                        value="all"
                                                                        onClick={() => {
                                                                            const isSelectedAll = field.value.length === filteredTicketSubtypes.length;
                                                                            if (isSelectedAll) {
                                                                                field.onChange([]);
                                                                            } else {
                                                                                field.onChange(filteredTicketSubtypes.map((b: any) => b.id || b._id));
                                                                            }
                                                                        }}
                                                                    >
                                                                        <Checkbox checked={field.value.length === filteredTicketSubtypes.length && filteredTicketSubtypes.length > 0} />
                                                                        <ListItemText primary="Chọn tất cả" />
                                                                    </MenuItem>
                                                                    {filteredTicketSubtypes.map((ticketSubtype: any) => {
                                                                        const ticketSubtypeId = ticketSubtype.id || ticketSubtype._id;
                                                                        return (
                                                                            <MenuItem key={ticketSubtypeId} value={ticketSubtypeId}>
                                                                                <Checkbox checked={field.value.indexOf(ticketSubtypeId) > -1} />
                                                                                <ListItemText primary={`${ticketSubtype.name} (${ticketSubtype.type === 'dog' ? 'Chó' : 'Mèo'})`} />
                                                                            </MenuItem>
                                                                        );
                                                                    })}
                                                                </Select>
                                                            </FormControl>
                                                        );
                                                    }}
                                                />
                                            </Box>
                                            <Controller
                                                name="minAge"
                                                control={control}
                                                render={({ field, fieldState }) => {
                                                    const months = Number(field.value) || 0;
                                                    let ageText = `${months} tháng`;
                                                    if (months >= 12) {
                                                        const years = Math.floor(months / 12);
                                                        const remMonths = months % 12;
                                                        ageText = `${years} năm ${remMonths > 0 ? `${remMonths} tháng` : ''}`;
                                                    }
                                                    return (
                                                        <TextField
                                                            {...field}
                                                            label="Độ tuổi tối thiểu (Tháng)"
                                                            type="number"
                                                            fullWidth
                                                            error={!!fieldState.error}
                                                            helperText={fieldState.error?.message || `Tương đương: ${ageText}`}
                                                        />
                                                    );
                                                }}
                                            />
                                        </>
                                    )}
                                </Box>
                            </Stack>
                        </CollapsibleCard>

                        <CollapsibleCard
                            title={"Giá"}
                            subheader={"Các trường liên quan đến giá"}
                            expanded={expandedPrice}
                            onToggle={toggle(setExpandedPrice)}
                        >
                            <Stack p="calc(3 * var(--spacing))" gap="calc(3 * var(--spacing))">
                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: "calc(3 * var(--spacing))" }}>
                                    <Controller
                                        name="priceOld"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                {...field}
                                                label={"Giá gốc"}
                                                fullWidth
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message}
                                            />
                                        )}
                                    />
                                    <Controller
                                        name="priceNew"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                {...field}
                                                label={"Giá mới"}
                                                fullWidth
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message}
                                            />
                                        )}
                                    />
                                </Box>
                                <Controller
                                    name="stock"
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <TextField
                                            {...field}
                                            label={"Còn lại"}
                                            fullWidth
                                            disabled={variants.length > 0}
                                            error={!!fieldState.error}
                                            helperText={variants.length > 0 ? "Tổng từ các biến thể" : fieldState.error?.message}
                                        />
                                    )}
                                />
                            </Stack>
                        </CollapsibleCard>

                        <CollapsibleCard
                            title={"Biến thể vé số"}
                            subheader={"Tạo các biến thể dựa trên thuộc tính"}
                            expanded={expandedVariants}
                            onToggle={toggle(setExpandedVariants)}
                        >
                            <Stack p="calc(3 * var(--spacing))" gap="calc(3 * var(--spacing))">
                                <Box>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Danh sách thuộc tính</Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                        {attributes.map((attr: any) => {
                                            const attrId = (attr.id || attr._id).toString();
                                            return (
                                                <FormControlLabel
                                                    key={attrId}
                                                    control={
                                                        <Checkbox
                                                            checked={selectedAttributeIds.includes(attrId)}
                                                            onChange={() => handleToggleAttribute(attrId)}
                                                        />
                                                    }
                                                    label={attr.name}
                                                />
                                            );
                                        })}
                                    </Box>
                                    <Button
                                        variant="outlined"
                                        size="large"
                                        sx={{ mt: 2, textTransform: 'none', borderRadius: "var(--shape-borderRadius)", fontWeight: 600, fontSize: '0.875rem' }}
                                        onClick={generateVariants}
                                    >
                                        Tạo biến thể
                                    </Button>
                                </Box>

                                {selectedAttributeIds.length > 0 && variants.length > 0 && (
                                    <>
                                        <Divider />
                                        <Box>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Danh sách biến thể</Typography>
                                            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid var(--palette-text-disabled)33', borderRadius: "var(--shape-borderRadius-lg)", overflow: 'hidden' }}>
                                                <Table>
                                                    <TableHead>
                                                        <TableRow>
                                                            <TableCell width={80}>Trạng thái</TableCell>
                                                            {attributes.filter((a: any) => selectedAttributeIds.includes((a.id || a._id).toString())).map((a: any) => (
                                                                <TableCell key={(a.id || a._id).toString()}>{a.name}</TableCell>
                                                            ))}
                                                            <TableCell>Giá cũ</TableCell>
                                                            <TableCell>Giá mới</TableCell>
                                                            <TableCell>Còn lại</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {variants.map((v) => (
                                                            <TableRow key={v.id}>
                                                                <TableCell>
                                                                    <Switch
                                                                        size="small"
                                                                        checked={v.status}
                                                                        onChange={(e) => handleUpdateVariant(v.id, 'status', e.target.checked)}
                                                                        color="success"
                                                                    />
                                                                </TableCell>
                                                                {v.attributeValue.map((attr, idx) => (
                                                                    <TableCell key={idx}>
                                                                        <Typography sx={{ fontSize: '0.875rem' }}>{attr.label}</Typography>
                                                                    </TableCell>
                                                                ))}
                                                                <TableCell>
                                                                    <TextField size="small" placeholder="0" value={v.priceOld} onChange={(e) => handleUpdateVariant(v.id, 'priceOld', e.target.value)} />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <TextField size="small" placeholder="0" value={v.priceNew} onChange={(e) => handleUpdateVariant(v.id, 'priceNew', e.target.value)} />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <TextField size="small" placeholder="0" value={v.stock} onChange={(e) => handleUpdateVariant(v.id, 'stock', e.target.value)} />
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        </Box>
                                    </>
                                )}
                            </Stack>
                        </CollapsibleCard>

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: "calc(2 * var(--spacing))" }}>
                            <LoadingButton
                                type="submit"
                                loading={isPending}
                                label="Cập nhật vé số"
                                loadingLabel="Đang xử lý..."
                            />
                        </Box>
                    </Stack>
                </form>
            </ThemeProvider>
        </>
    )
}




