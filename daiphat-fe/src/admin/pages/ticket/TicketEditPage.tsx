import { Box, Stack, TextField, ThemeProvider, useTheme, createTheme, FormControl, InputLabel, MenuItem, OutlinedInput, Select, Button, Typography, IconButton, CircularProgress, FormHelperText } from "@mui/material"
import { Breadcrumb } from "../../components/ui/Breadcrumb"
import { Title } from "../../components/ui/Title"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CollapsibleCard } from "../../components/ui/CollapsibleCard"
import { TicketSerialImageField } from "./components/TicketSerialImageField"
import { formatImportBatchCode } from "../import-batch/utils/importBatchCode";
import { prefixAdmin } from "../../constants/routes";
import { useUpdateTicket, useTicketDetail } from "./hooks/useTicket";
import { toast } from "react-toastify";
import { useForm, Controller, useFieldArray, useFormState } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { buildLegacyUpdateTicketSchema, LegacyUpdateTicketFormValues } from "../../schemas/ticket.schema";
import {
    TICKET_STATUS_OPTIONS,
    canTransitionTicketStatus,
    getAllowedTicketStatusTransitions,
    getTicketStatusLabel,
    getTicketStatusTransitionHint,
    normalizeTicketStatus,
} from "./configs/ticket-status.config";
import { LoadingButton } from "../../components/ui/LoadingButton";
import { useProviders } from "../provider/hooks/useProvider";
import { useRegions } from "../region/hooks/useRegion";
import {
    getVisibleFieldErrorMessage,
    shouldShowFieldError,
} from "./utils/ticketSerialValidation";
import {
    getTicketNumberLengthHint,
    resolveRegionLengthRules,
    sanitizeTicketNumberInput,
} from "./utils/ticketNumberValidation";
import dayjs from "dayjs";
import "dayjs/locale/en-gb";
import { useParams, useNavigate } from "react-router-dom";
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

export const TicketEditPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: ticketDetail, isLoading: isLoadingTicket } = useTicketDetail(id);

    const { data: providersRes } = useProviders({ size: 1000 });
    const providers = (providersRes as any)?.data?.recordList || [];
    const { data: regionsRes } = useRegions();
    const regions = regionsRes?.data || [];

    const numberLengthRulesRef = useRef(resolveRegionLengthRules(null));

    const dynamicLegacyResolver = useCallback(
        async (values: LegacyUpdateTicketFormValues, context: unknown, options: unknown) =>
            zodResolver(buildLegacyUpdateTicketSchema(numberLengthRulesRef.current))(
                values,
                context as never,
                options as never
            ),
        []
    );

    const {
        control,
        handleSubmit,
        setValue,
        setError,
        reset,
        watch,
    } = useForm<LegacyUpdateTicketFormValues>({
        resolver: dynamicLegacyResolver,
        mode: 'onTouched',
        reValidateMode: 'onChange',
        defaultValues: {
            stationId: "",
            serials: [{ serialNumber: "", ticketImg: undefined }],
            numbers: "",
            status: "",
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "serials"
    });

    const { isSubmitted } = useFormState({ control });

    const originalStatus = normalizeTicketStatus(ticketDetail?.status);
    const allowedStatusValues = new Set(getAllowedTicketStatusTransitions(ticketDetail?.status));
    const canManuallyChangeStatus = allowedStatusValues.size > 1;
    const ticketSerials = Array.isArray(ticketDetail?.serials) ? ticketDetail.serials : [];
    const hasLockedSerials = ticketSerials.some((serial: any) => ["RESERVED", "SOLD"].includes(normalizeTicketStatus(serial?.status)));
    const isTicketEditable = ["IN_STOCK", "ISSUER_FAULT"].includes(originalStatus) && !hasLockedSerials;

    const [expandedDetail, setExpandedDetail] = useState(true);
    const [expandedSerials, setExpandedSerials] = useState(true);
    const [resetKey, setResetKey] = useState(0);

    const watchedStationId = watch("stationId");
    const numberLengthRules = useMemo(() => {
        const stationId =
            watchedStationId ||
            ticketDetail?.stationId ||
            ticketDetail?.productId ||
            ticketDetail?.providerId;
        const provider = providers.find(
            (p: any) => String(p.id || p._id) === String(stationId)
        );
        const region = regions.find((r: any) => r.code === provider?.region);
        return resolveRegionLengthRules(region);
    }, [providers, regions, ticketDetail, watchedStationId]);

    useEffect(() => {
        numberLengthRulesRef.current = numberLengthRules;
    }, [numberLengthRules]);

    const { mutate: update, isPending } = useUpdateTicket();

    const isExistingLockedSerial = (index: number) => {
        const serial = ticketDetail?.serials?.[index];
        if (!serial?.id) {
            return false;
        }
        return normalizeTicketStatus(serial.status) !== "IN_STOCK";
    };

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
        if (ticketDetail) {
            const serials = Array.isArray(ticketDetail.serials) && ticketDetail.serials.length > 0
                ? ticketDetail.serials.map((serial: any) => ({
                    id: serial.id,
                    serialNumber: serial.serialNumber || "",
                    ticketImg: serial.ticketImg || undefined,
                }))
                : [{
                    serialNumber: ticketDetail.serialNumber || "",
                    ticketImg: ticketDetail.ticketImg || undefined,
                }];

            reset({
                stationId: (ticketDetail.stationId || ticketDetail.productId || ticketDetail.providerId || "").toString(),
                serials,
                numbers: ticketDetail.numbers || "",
                status: normalizeTicketStatus(ticketDetail.status),
            });
            setResetKey((prev) => prev + 1);
        }
    }, [ticketDetail, reset]);

    const onSubmit = (data: LegacyUpdateTicketFormValues) => {
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

        const nextStatus = normalizeTicketStatus(data.status);

        const payload: Record<string, unknown> = {
            numbers: data.numbers,
            drawDate: ticketDetail?.drawDate || finalDrawDate,
            serials: data.serials.map((s) => ({
                ...(s.id != null && s.id !== "" ? { id: Number(s.id) } : {}),
                serialNumber: s.serialNumber,
                ...(typeof s.ticketImg === "string" && s.ticketImg.trim()
                    ? { ticketImg: s.ticketImg.trim() }
                    : {}),
            })),
        };

        // Status is automatically updated, manual transition removed.

        if (id) {
            update({ id, data: payload }, {
                onSuccess: (res: any) => {
                    if (res.success) {
                        toast.success(res.message || "Cập nhật vé số thành công!");
                        navigate(`/${prefixAdmin}/ticket/list`);
                    } else {
                        toast.error(res.message || "Cập nhật vé số thất bại");
                    }
                },
                onError: (err: any) => {
                    toast.error(err?.response?.data?.message || err?.message || "Đã xảy ra lỗi khi cập nhật");
                }
            });
        }
    };

    if (isLoadingTicket) {
        return <Box display="flex" justifyContent="center" alignItems="center" height="400px"><CircularProgress /></Box>
    }

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title={"Sửa vé số"} />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: "/" },
                            { label: "Kho vé số", to: `/${prefixAdmin}/ticket/list` },
                            { label: "Sửa vé" }
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
                                                <FormControl fullWidth error={shouldShowFieldError(fieldState, isSubmitted)}>
                                                    <InputLabel shrink>{"Nhà đài"}</InputLabel>
                                                    <Select
                                                        {...field}
                                                        displayEmpty
                                                        disabled={!isTicketEditable}
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
                                                    {shouldShowFieldError(fieldState, isSubmitted) && (
                                                        <p className="text-red-500 text-xs mt-1 ml-3">{fieldState.error?.message}</p>
                                                    )}
                                                </FormControl>
                                            )}
                                        />
                                    </Box>

                                    <Box sx={{ gridColumn: { xs: "span 12", md: "span 6" } }}>
                                        <TextField
                                            label="Trạng thái"
                                            fullWidth
                                            disabled
                                            value={getTicketStatusLabel(ticketDetail?.status)}
                                            helperText="Trạng thái lô vé được cập nhật tự động."
                                            InputProps={{
                                                readOnly: true,
                                            }}
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
                                                    disabled={!isTicketEditable}
                                                    error={shouldShowFieldError(fieldState, isSubmitted)}
                                                    helperText={getVisibleFieldErrorMessage(fieldState, isSubmitted)}
                                                    placeholder={getTicketNumberLengthHint(numberLengthRules)}
                                                    inputProps={{
                                                        inputMode: "numeric",
                                                        maxLength: numberLengthRules.maxLength,
                                                    }}
                                                    onChange={(event) => {
                                                        field.onChange(
                                                            sanitizeTicketNumberInput(
                                                                event.target.value,
                                                                numberLengthRules.maxLength
                                                            )
                                                        );
                                                    }}
                                                />
                                            )}
                                        />
                                    </Box>
                                </Box>
                            </Stack>
                        </CollapsibleCard>

                        {ticketDetail && (
                            <CollapsibleCard
                                title={"Thông tin bổ sung"}
                                subheader={"Các thông tin chi tiết khác của lô vé này"}
                                expanded={true}
                            >
                                <Stack p="calc(3 * var(--spacing))" gap="calc(3 * var(--spacing))">
                                    <Box
                                        sx={{
                                            display: "grid",
                                            gridTemplateColumns: "repeat(12, 1fr)",
                                            gap: "calc(3 * var(--spacing)) calc(2 * var(--spacing))",
                                        }}
                                    >
                                        <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" } }}>
                                            <Typography variant="caption" color="text.secondary">Ngày quay</Typography>
                                            <Typography variant="body1" fontWeight={600}>
                                                {ticketDetail.drawDate ? dayjs(ticketDetail.drawDate).format('DD/MM/YYYY') : 'N/A'}
                                            </Typography>
                                            {providers?.find((p: any) => (p.id || p._id)?.toString() === (ticketDetail.stationId || ticketDetail.providerId)?.toString())?.drawTime && (
                                                <Typography variant="body2" color="text.secondary">
                                                    {providers.find((p: any) => (p.id || p._id)?.toString() === (ticketDetail.stationId || ticketDetail.providerId)?.toString())?.drawTime}
                                                </Typography>
                                            )}
                                        </Box>
                                        
                                        <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" } }}>
                                            <Typography variant="caption" color="text.secondary">Số lượng</Typography>
                                            <Typography variant="body1" fontWeight={600}>{ticketDetail.quantity ?? 'N/A'} tờ</Typography>
                                        </Box>

                                        <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" } }}>
                                            <Typography variant="caption" color="text.secondary">Giá (mỗi vé)</Typography>
                                            <Typography variant="body1" fontWeight={600}>{ticketDetail.priceSnapshot ? `${ticketDetail.priceSnapshot.toLocaleString('vi-VN')} đ` : 'N/A'}</Typography>
                                        </Box>

                                        <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" } }}>
                                            <Typography variant="caption" color="text.secondary">Đã duyệt</Typography>
                                            <Typography variant="body1" fontWeight={600}>{ticketDetail.verified ? 'Có' : 'Không'}</Typography>
                                        </Box>

                                        <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" } }}>
                                            <Typography variant="caption" color="text.secondary">Người tạo</Typography>
                                            <Typography variant="body1" fontWeight={600}>{ticketDetail.createdBy || 'N/A'}</Typography>
                                        </Box>

                                        <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" } }}>
                                            <Typography variant="caption" color="text.secondary">Ngày tạo</Typography>
                                            <Typography variant="body1" fontWeight={600}>
                                                {ticketDetail.createdAt ? dayjs(ticketDetail.createdAt).format('DD/MM/YYYY HH:mm') : (ticketDetail.importedAt ? dayjs(ticketDetail.importedAt).format('DD/MM/YYYY HH:mm') : 'N/A')}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Stack>
                            </CollapsibleCard>
                        )}

                        <CollapsibleCard
                            title={"Danh sách vé số (Sê-ri)"}
                            subheader={"Thêm các số sê-ri và ảnh vé số thuộc lô này"}
                            expanded={expandedSerials}
                            onToggle={() => setExpandedSerials(!expandedSerials)}
                        >
                            <Stack p="calc(3 * var(--spacing))" gap="calc(3 * var(--spacing))">
                                {!isTicketEditable && (
                                    <Typography variant="body2" color="warning.main">
                                        Vé này chỉ được sửa khi ở trạng thái Trong kho hoặc Lỗi in ấn, và không có sê-ri nào đang giữ chỗ hoặc đã bán.
                                    </Typography>
                                )}
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
                                                    disabled={isExistingLockedSerial(index)}
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
                                                            disabled={isExistingLockedSerial(index)}
                                                            error={shouldShowFieldError(fieldState, isSubmitted)}
                                                            helperText={getVisibleFieldErrorMessage(fieldState, isSubmitted)}
                                                        />
                                                    )}
                                                />
                                            </Box>
                                            <TicketSerialImageField
                                                control={control}
                                                index={index}
                                                disabled={isExistingLockedSerial(index)}
                                            />
                                            <Box sx={{ gridColumn: { xs: "span 12", md: "span 12" } }}>
                                                <Stack direction={{ xs: "column", md: "row" }} gap={2}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Mã lô nhập: <strong>{formatImportBatchCode(ticketDetail?.serials?.[index]?.batchCode)}</strong>
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Trạng thái: <strong>{ticketDetail?.serials?.[index]?.statusDisplayName || "N/A"}</strong>
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Ngày tạo: <strong>{ticketDetail?.serials?.[index]?.createdAt ? dayjs(ticketDetail.serials[index].createdAt).format("DD/MM/YYYY HH:mm") : "N/A"}</strong>
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Người tạo: <strong>{ticketDetail?.serials?.[index]?.createdBy || "N/A"}</strong>
                                                    </Typography>
                                                </Stack>
                                            </Box>
                                        </Box>
                                    </Box>
                                ))}

                                <Button
                                    variant="outlined"
                                    startIcon={<AddIcon />}
                                    disabled={!isTicketEditable}
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
                                disabled={!isTicketEditable && !canManuallyChangeStatus}
                                label={"Lưu thay đổi"}
                                loadingLabel="Đang lưu..."
                                sx={{ minHeight: "3rem", minWidth: "4rem" }}
                            />
                        </Box>
                    </Stack>
                </form>
            </ThemeProvider>
        </>
    )
}
