import { Box, Stack, TextField, ThemeProvider, useTheme, createTheme, FormControl, InputLabel, MenuItem, OutlinedInput, Select, Button, Typography } from "@mui/material"
import { Breadcrumb } from "../../components/ui/Breadcrumb"
import { Title } from "../../components/ui/Title"
import { useState, useMemo, useEffect } from "react"
import { UploadFiles } from "../../components/ui/UploadFiles"
import { CollapsibleCard } from "../../components/ui/CollapsibleCard"
import { prefixAdmin } from "../../constants/routes";
import { useCreateTicket } from "./hooks/useTicket";
import { toast } from "react-toastify";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createTicketSchema, CreateTicketFormValues } from "../../schemas/ticket.schema";
import { LoadingButton } from "../../components/ui/LoadingButton";
import { useProviders } from "../provider/hooks/useProvider";
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from "dayjs";
import "dayjs/locale/en-gb";

interface CustomFile extends File {
    preview: string;
}

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
    } = useForm<CreateTicketFormValues>({
        resolver: zodResolver(createTicketSchema),
        defaultValues: {
            productId: "",
            ticketImg: undefined,
            serialNumber: "",
            numbers: "",
            drawDate: "",
            batchCode: "",
        },
    });

    const [expandedDetail, setExpandedDetail] = useState(true);
    const [files, setFiles] = useState<CustomFile[]>([]);
    const [resetKey, setResetKey] = useState(0);

    const { data: providersRes } = useProviders({ limit: 1000 });
    const providers = (providersRes as any)?.data?.recordList || [];
    const { mutate: create, isPending } = useCreateTicket();

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

    useEffect(() => {
        setValue("ticketImg", files.length > 0 ? files[0] : undefined);
    }, [files, setValue]);

    // Removed fillSample function

    const onSubmit = (data: CreateTicketFormValues) => {
        // Validation for drawDate
        const selectedProvider = providers.find((p: any) => (p.id || p._id) === data.productId);
        if (selectedProvider && data.drawDate) {
            const drawDateObj = dayjs(data.drawDate).startOf('day');
            const today = dayjs().startOf('day');
            const tomorrow = dayjs().add(1, 'day').startOf('day');

            // Backend restriction: Must be today or tomorrow
            if (!drawDateObj.isSame(today) && !drawDateObj.isSame(tomorrow)) {
                setError("drawDate", { message: "Chỉ được phép nhập vé có ngày quay là Hôm nay hoặc Ngày mai (Theo chuẩn BE)" });
                return;
            }

            // Check if day of week matches draw schedule
            const validDays = getValidDays(selectedProvider.drawSchedule);
            if (validDays.length > 0 && !validDays.includes(drawDateObj.day())) {
                setError("drawDate", {
                    message: `Lịch quay nhà đài này là: ${selectedProvider.drawSchedule}. Chọn sai thứ!`
                });
                return;
            }
        }

        let ticketImgPath = "";
        if (files.length > 0) {
            ticketImgPath = files[0].name;
        }

        const payload = {
            productId: data.productId,
            serialNumber: data.serialNumber,
            numbers: data.numbers,
            drawDate: data.drawDate,
            batchCode: data.batchCode,
            ticketImg: ticketImgPath
        };

        create(payload, {
            onSuccess: (res: any) => {
                if (res.success) {
                    toast.success(res.message || "Nhập vé số vào kho thành công!");
                    reset({
                        productId: "",
                        serialNumber: "",
                        numbers: "",
                        drawDate: "",
                        batchCode: "",
                    });
                    setFiles([]);
                    setResetKey(prev => prev + 1);
                } else {
                    toast.error(res.message || "Tạo vé số thất bại");
                }
            },
            onError: (err: any) => {
                toast.error(err?.response?.data?.message || err?.message || "Đã xảy ra lỗi khi tạo vé số");
            }
        });
    };

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title={"Tạo mới vé số"} />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: "/" },
                            { label: "Kho vé số", to: `/${prefixAdmin}/ticket/list` },
                            { label: "Nhập vé" }
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
                            title={"Thông tin vé số"}
                            subheader={"Sản phẩm, dãy số, ngày quay..."}
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
                                            name="productId"
                                            control={control}
                                            render={({ field, fieldState }) => (
                                                <FormControl fullWidth error={!!fieldState.error}>
                                                    <InputLabel shrink>{"Sản phẩm vé số (Nhà đài)"}</InputLabel>
                                                    <Select
                                                        {...field}
                                                        displayEmpty
                                                        input={<OutlinedInput label={"Sản phẩm vé số (Nhà đài)"} notched />}
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

                                    <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" } }}>
                                        <Controller
                                            name="serialNumber"
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

                                    <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" } }}>
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

                                    <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" } }}>
                                        <Controller
                                            name="drawDate"
                                            control={control}
                                            render={({ field, fieldState }) => {
                                                const watchProductId = control._formValues.productId;
                                                const selectedProvider = providers.find((p: any) => (p.id || p._id) === watchProductId);
                                                const validDays = selectedProvider ? getValidDays(selectedProvider.drawSchedule) : [];

                                                const shouldDisableDate = (date: dayjs.Dayjs) => {
                                                    if (!selectedProvider) return true;

                                                    const checkDate = date.startOf('day');
                                                    const today = dayjs().startOf('day');
                                                    const tomorrow = dayjs().add(1, 'day').startOf('day');

                                                    // Strictly today or tomorrow
                                                    if (!checkDate.isSame(today) && !checkDate.isSame(tomorrow)) {
                                                        return true;
                                                    }

                                                    if (validDays.length > 0) {
                                                        return !validDays.includes(date.day());
                                                    }
                                                    return false;
                                                };

                                                return (
                                                    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
                                                        <DatePicker
                                                            label="Ngày quay"
                                                            disabled={!watchProductId}
                                                            value={field.value ? dayjs(field.value) : null}
                                                            onChange={(newValue) => {
                                                                field.onChange(newValue ? newValue.format("YYYY-MM-DD") : "");
                                                            }}
                                                            shouldDisableDate={shouldDisableDate}
                                                            slotProps={{
                                                                textField: {
                                                                    fullWidth: true,
                                                                    error: !!fieldState.error,
                                                                    helperText: !watchProductId ? "Vui lòng chọn nhà đài trước" : fieldState.error?.message,
                                                                    InputLabelProps: { shrink: true }
                                                                }
                                                            }}
                                                        />
                                                    </LocalizationProvider>
                                                );
                                            }}
                                        />
                                    </Box>
                                </Box>

                                <Box sx={{ mt: 2 }}>
                                    <div className="mb-3 font-semibold">Ảnh vé số (Tùy chọn)</div>
                                    <UploadFiles
                                        key={resetKey}
                                        files={files}
                                        onFilesChange={(newFiles) => setFiles(newFiles)}
                                    />
                                </Box>
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



