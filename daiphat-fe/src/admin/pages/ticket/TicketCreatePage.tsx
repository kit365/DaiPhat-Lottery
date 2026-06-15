import { Box, Stack, TextField, ThemeProvider, useTheme, createTheme, FormControl, InputLabel, MenuItem, OutlinedInput, Select, Button, Typography, IconButton } from "@mui/material"
import { Breadcrumb } from "../../components/ui/Breadcrumb"
import { Title } from "../../components/ui/Title"
import { useState, useMemo } from "react"
import { CollapsibleCard } from "../../components/ui/CollapsibleCard"
import { TicketSerialImageField } from "./components/TicketSerialImageField"
import { prefixAdmin } from "../../constants/routes";
import { useCreateTicket } from "./hooks/useTicket";
import { toast } from "react-toastify";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createTicketSchema, CreateTicketFormValues } from "../../schemas/ticket.schema";
import { LoadingButton } from "../../components/ui/LoadingButton";
import { useProviders } from "../provider/hooks/useProvider";
import dayjs from "dayjs";
import "dayjs/locale/en-gb";
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';

const SCHEDULE_TO_DAY_MAP: Record<string, number[]> = {
    "Thứ Hai": [1], "T2": [1], "Thứ 2": [1],
    "Thứ Ba": [2], "T3": [2], "Thứ 3": [2],
    "Thứ Tư": [3], "T4": [3], "Thứ 4": [3],
    "Thứ Năm": [4], "T5": [4], "Thứ 5": [4],
    "Thứ Sáu": [5], "T6": [5], "Thứ 6": [5],
    "Thứ Bảy": [6], "T7": [6], "Thứ 7": [6],
    "Chủ Nhật": [0], "CN": [0]
};

const getValidDays = (schedule: string) => {
    if (!schedule) return [];
    const validDays: number[] = [];
    Object.keys(SCHEDULE_TO_DAY_MAP).forEach(key => {
        if (schedule.includes(key)) {
            validDays.push(...SCHEDULE_TO_DAY_MAP[key]);
        }
    });
    return validDays;
};

export const TicketCreatePage = () => {
    const {
        control,
        handleSubmit,
        setValue,
        setError,
        reset,
        watch,
    } = useForm<CreateTicketFormValues>({
        resolver: zodResolver(createTicketSchema),
        defaultValues: {
            stationId: "",
            serials: [{ serialNumber: "", ticketImg: undefined }],
            numbers: "",
            batchCode: "",
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "serials"
    });

    const [expandedDetail, setExpandedDetail] = useState(true);
    const [expandedSerials, setExpandedSerials] = useState(true);
    const [resetKey, setResetKey] = useState(0);

    const { data: providersRes } = useProviders({ size: 1000 });
    const providers = (providersRes as any)?.data?.recordList || [];
    const { mutateAsync: createAsync, isPending } = useCreateTicket();

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

    const onSubmit = async (data: CreateTicketFormValues) => {
        // Validation for drawDate
        const selectedProvider = providers.find((p: any) => String(p.id || p._id) === String(data.stationId));
        let finalDrawDate = "";
        
        if (selectedProvider) {
            const drawSchedule = selectedProvider.drawSchedule;
            const validDays = getValidDays(drawSchedule);
            const today = dayjs().startOf('day');
            const tomorrow = dayjs().add(1, 'day').startOf('day');

            if (validDays.length > 0) {
                if (validDays.includes(today.day())) {
                    finalDrawDate = today.format("YYYY-MM-DD");
                } else if (validDays.includes(tomorrow.day())) {
                    finalDrawDate = tomorrow.format("YYYY-MM-DD");
                } else {
                    toast.error(`Nhà đài này có lịch quay là ${drawSchedule}, không quay vào hôm nay hoặc ngày mai.`);
                    return;
                }
            } else {
                finalDrawDate = today.format("YYYY-MM-DD");
            }
        } else {
            toast.error("Vui lòng chọn nhà đài");
            return;
        }

        const payload = {
            stationId: data.stationId,
            serials: data.serials.map(s => ({
                serialNumber: s.serialNumber,
                ticketImg: typeof s.ticketImg === "string" && s.ticketImg.trim() ? s.ticketImg.trim() : undefined,
            })),
            numbers: data.numbers,
            drawDate: finalDrawDate,
            batchCode: data.batchCode
        };

        try {
            const res: any = await createAsync(payload);
            if (res.success) {
                toast.success("Nhập các vé số vào kho thành công!");
                reset({
                    stationId: "",
                    serials: [{ serialNumber: "", ticketImg: undefined }],
                    numbers: "",
                    batchCode: "",
                });
                setResetKey(prev => prev + 1);
            } else {
                toast.error(res.message || "Tạo vé số thất bại");
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err?.message || "Đã xảy ra lỗi khi tạo vé số");
        }
    };

    const handleQuickCreateBenTre = async () => {
        const benTre = providers.find((p: any) => p.province === "Bến Tre" || p.name.includes("Bến Tre"));
        if (!benTre) {
            toast.error("Không tìm thấy đài Bến Tre trong hệ thống!");
            return;
        }

        const confirm = window.confirm("Bạn có chắc muốn tạo nhanh 3 lô vé số Bến Tre (mỗi lô 10 tờ) không?");
        if (!confirm) return;

        const stationId = benTre.id || benTre._id;
        const drawSchedule = benTre.drawSchedule;
        const validDays = getValidDays(drawSchedule);
        const today = dayjs().startOf('day');
        const tomorrow = dayjs().add(1, 'day').startOf('day');
        let finalDrawDate = today.format("YYYY-MM-DD");
        
        if (validDays.length > 0) {
            if (validDays.includes(today.day())) {
                finalDrawDate = today.format("YYYY-MM-DD");
            } else if (validDays.includes(tomorrow.day())) {
                finalDrawDate = tomorrow.format("YYYY-MM-DD");
            }
        }

        const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const batches = [
            { numbers: "778899", prefix: `BT1_${randomSuffix}_` },
            { numbers: "556677", prefix: `BT2_${randomSuffix}_` },
            { numbers: "334455", prefix: `BT3_${randomSuffix}_` }
        ];

        try {
            for (const batch of batches) {
                const serials = Array.from({ length: 10 }).map((_, i) => ({
                    serialNumber: `${batch.prefix}${String(i + 1).padStart(3, '0')}`,
                    ticketImg: ""
                }));

                await createAsync({
                    stationId,
                    serials,
                    numbers: batch.numbers,
                    drawDate: finalDrawDate,
                    batchCode: `LOHANG_BT_${batch.prefix}`
                });
            }
            toast.success("Tạo nhanh 3 lô Bến Tre thành công!");
            window.location.reload();
        } catch (err) {
            toast.error("Lỗi khi tạo nhanh Bến Tre!");
        }
    };

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title={"Tạo mới lô vé số"} />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: "/" },
                            { label: "Kho vé số", to: `/${prefixAdmin}/ticket/list` },
                            { label: "Nhập vé" }
                        ]}
                    />
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <Button
                        onClick={handleQuickCreateBenTre}
                        disabled={isPending}
                        sx={{
                            background: '#10b981',
                            minHeight: "2.25rem",
                            fontWeight: 700,
                            fontSize: "0.875rem",
                            padding: "6px 12px",
                            borderRadius: "var(--shape-borderRadius)",
                            textTransform: "none",
                            boxShadow: "none",
                            color: "#fff",
                            "&:hover": {
                                background: "#059669",
                                boxShadow: "var(--customShadows-z8)"
                            }
                        }}
                        variant="contained"
                    >
                        {isPending ? "Đang tạo..." : "Tạo mẫu 3 lô Bến Tre"}
                    </Button>
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
                            title={"Thông tin chung"}
                            subheader={"Nhà đài, dãy số, mã lô..."}
                            expanded={expandedDetail}
                            onToggle={() => setExpandedDetail(!expandedDetail)}
                        >
                            <Stack p="calc(3 * var(--spacing))" gap="calc(3 * var(--spacing))">
                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(12, 1fr)",
                                        gap: "calc(3 * var(--spacing)) calc(2 * var(--spacing))",
                                    }}
                                >
                                    <Box sx={{ gridColumn: { xs: "span 12", md: "span 6" } }}>
                                        <Controller
                                            name="stationId"
                                            control={control}
                                            render={({ field, fieldState }) => (
                                                <FormControl fullWidth error={!!fieldState.error}>
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
                                                            const providerId = provider.id || provider._id;
                                                            return (
                                                                <MenuItem key={providerId} value={providerId}>
                                                                    {provider.name}
                                                                </MenuItem>
                                                            );
                                                        })}
                                                    </Select>
                                                    {fieldState.error && <p className="text-red-500 text-xs mt-1 ml-3">{fieldState.error.message}</p>}
                                                </FormControl>
                                            )}
                                        />
                                    </Box>

                                    <Box sx={{ gridColumn: { xs: "span 12", md: "span 6" } }}>
                                        <Controller
                                            name="batchCode"
                                            control={control}
                                            render={({ field, fieldState }) => (
                                                <TextField
                                                    {...field}
                                                    label="Mã lô nhập"
                                                    fullWidth
                                                    error={!!fieldState.error}
                                                    helperText={fieldState.error?.message}
                                                />
                                            )}
                                        />
                                    </Box>

                                    <Box sx={{ gridColumn: { xs: "span 12", md: "span 12" } }}>
                                        <Controller
                                            name="numbers"
                                            control={control}
                                            render={({ field, fieldState }) => (
                                                <TextField
                                                    {...field}
                                                    label="Dãy số"
                                                    fullWidth
                                                    error={!!fieldState.error}
                                                    helperText={fieldState.error?.message}
                                                />
                                            )}
                                        />
                                    </Box>
                                </Box>
                            </Stack>
                        </CollapsibleCard>

                        <CollapsibleCard
                            title={"Danh sách vé số (Sê-ri)"}
                            subheader={"Thêm các số sê-ri và ảnh vé số thuộc lô này"}
                            expanded={expandedSerials}
                            onToggle={() => setExpandedSerials(!expandedSerials)}
                        >
                            <Stack p="calc(3 * var(--spacing))" gap="calc(3 * var(--spacing))">
                                {fields.map((item, index) => (
                                    <Box key={item.id} sx={{
                                        p: 3,
                                        border: "1px dashed var(--palette-divider)",
                                        borderRadius: 2,
                                        position: "relative"
                                    }}>
                                        <Box sx={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            mb: 2
                                        }}>
                                            <Typography variant="subtitle2" fontWeight="600">
                                                Vé #{index + 1}
                                            </Typography>
                                            {fields.length > 1 && (
                                                <IconButton 
                                                    size="small" 
                                                    color="error"
                                                    onClick={() => remove(index)}
                                                >
                                                    <DeleteOutlineIcon />
                                                </IconButton>
                                            )}
                                        </Box>
                                        
                                        <Box sx={{
                                            display: "grid",
                                            gridTemplateColumns: "repeat(12, 1fr)",
                                            gap: "calc(3 * var(--spacing)) calc(2 * var(--spacing))",
                                        }}>
                                            <Box sx={{ gridColumn: { xs: "span 12", md: "span 12" } }}>
                                                <Controller
                                                    name={`serials.${index}.serialNumber`}
                                                    control={control}
                                                    render={({ field, fieldState }) => (
                                                        <TextField
                                                            {...field}
                                                            label="Số sê-ri"
                                                            fullWidth
                                                            error={!!fieldState.error}
                                                            helperText={fieldState.error?.message}
                                                        />
                                                    )}
                                                />
                                            </Box>
                                            <TicketSerialImageField control={control} index={index} />
                                        </Box>
                                    </Box>
                                ))}

                                <Button
                                    variant="outlined"
                                    startIcon={<AddIcon />}
                                    onClick={() => append({ serialNumber: "", ticketImg: undefined })}
                                    sx={{ alignSelf: "flex-start", mt: 1 }}
                                >
                                    Thêm Số sê-ri
                                </Button>
                            </Stack>
                        </CollapsibleCard>

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: "calc(2 * var(--spacing))" }}>
                            <LoadingButton
                                type="submit"
                                loading={isPending}
                                label={"Nhập vé"}
                                loadingLabel="Đang xử lý..."
                                sx={{ minHeight: "3rem", minWidth: "4rem" }}
                            />
                        </Box>
                    </Stack>
                </form>
            </ThemeProvider>
        </>
    )
}
