"use client";

import { Box, Stack, TextField, ThemeProvider, useTheme, createTheme, FormControl, InputLabel, MenuItem, OutlinedInput, Select, Button, Typography, IconButton, CircularProgress, Pagination, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material"
import { Breadcrumb } from "../../../../../components/ui/Breadcrumb"
import { Title } from "../../../../../components/ui/Title"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CollapsibleCard } from "../../../../../components/ui/CollapsibleCard"
import { TicketSerialImageField } from "../sections/TicketSerialImageField"
import { formatImportBatchCode } from "../../../import-batch/utils/importBatchCode";
import { prefixAdmin } from "../../../../../constants/routes";
import { useUpdateTicket, useTicketDetail } from "../../hooks/useTicket";
import { toast } from "react-toastify";
import { useForm, Controller, useFieldArray, useFormState } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { buildLegacyUpdateTicketSchema, LegacyUpdateTicketFormValues } from "../../schemas/ticket.schema";
import {
    getTicketStatusLabel,
    normalizeTicketStatus,
} from "../../constants/ticket-status.config";
import { LoadingButton } from "../../../../../components/ui/LoadingButton";
import { useStations } from '../../../../station/hooks/useStation';
import { useRegions } from "../../../../region/hooks/useRegion";
import {
    getVisibleFieldErrorMessage,
    shouldShowFieldError,
} from "../../utils/ticketSerialValidation";
import {
    getTicketNumberLengthHint,
    resolveRegionLengthRules,
    sanitizeTicketNumberInput,
} from "../../utils/ticketNumberValidation";
import { resolveAvailableTicketQuantity } from "../../utils/ticketQuantity";
import { buildSerialStatusFilterOptions } from "../../constants/serial-status-filter.config";
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

    const { data: providersRes } = useStations({ limit: 1000 });
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
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "serials"
    });

    const { isSubmitted } = useFormState({ control });

    const originalStatus = normalizeTicketStatus(ticketDetail?.status);
    const ticketSerials = Array.isArray(ticketDetail?.serials) ? ticketDetail.serials : [];
    const hasLockedSerials = ticketSerials.some((serial: any) => ["RESERVED", "SOLD"].includes(normalizeTicketStatus(serial?.status)));
    const isTicketEditable = originalStatus === "IN_STOCK" && !hasLockedSerials;

    const [expandedDetail, setExpandedDetail] = useState(true);
    const [expandedSerials, setExpandedSerials] = useState(true);
    const [searchSerial, setSearchSerial] = useState("");
    const [filterStatus, setFilterStatus] = useState("ALL");
    const [resetKey, setResetKey] = useState(0);

    const filteredFields = useMemo(() => {
        return fields.map((field, originalIndex) => ({
            ...field,
            originalIndex
        })).filter((item) => {
            const staticData = ticketDetail?.serials?.[item.originalIndex];
            const serialNum = staticData ? staticData.serialNumber || "" : (item as any).serialNumber || "";
            const status = staticData ? staticData.status || "IN_STOCK" : "IN_STOCK";

            const matchesSearch = !searchSerial || serialNum.toLowerCase().includes(searchSerial.toLowerCase());
            const matchesStatus = filterStatus === "ALL" || status.toUpperCase() === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [fields, searchSerial, filterStatus, ticketDetail?.serials]);

    const availableSerialStatusOptions = useMemo(
        () => buildSerialStatusFilterOptions(ticketDetail?.serials || []),
        [ticketDetail?.serials]
    );

    const [page, setPage] = useState(1);
    const itemsPerPage = 10;
    const totalPages = Math.ceil(filteredFields.length / itemsPerPage);

    useEffect(() => {
        setPage(1);
    }, [searchSerial, filterStatus]);

    const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
        setPage(value);
    };

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
                        fontSize: "0.875rem",
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
                        <Stack spacing={3}>
                            <CollapsibleCard
                                title={"Thông tin vé số"}
                                subheader={"Nhà đài, dãy số, ngày quay..."}
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
                                        <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" } }}>
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

                                        <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" } }}>
                                            <TextField
                                                label="Trạng thái"
                                                fullWidth
                                                disabled
                                                value={getTicketStatusLabel(ticketDetail?.status)}
                                                InputProps={{
                                                    readOnly: true,
                                                    sx: { fontWeight: 600 }
                                                }}
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
                                                        disabled={!isTicketEditable}
                                                        error={shouldShowFieldError(fieldState, isSubmitted)}
                                                        helperText={getVisibleFieldErrorMessage(fieldState, isSubmitted)}
                                                        placeholder={getTicketNumberLengthHint(numberLengthRules)}
                                                        inputProps={{
                                                            inputMode: "numeric",
                                                            maxLength: numberLengthRules.maxLength,
                                                        }}
                                                        InputProps={{
                                                            sx: { 
                                                                fontWeight: 700, 
                                                                color: 'error.main',
                                                                fontSize: '1.1rem',
                                                                letterSpacing: '2px'
                                                            }
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

                                        <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                            <Typography variant="caption" color="text.secondary">Ngày quay</Typography>
                                            <Typography variant="body1" fontWeight={600}>
                                                {ticketDetail?.drawDate ? dayjs(ticketDetail.drawDate).format('DD/MM/YYYY') : 'N/A'}
                                            </Typography>
                                            {providers?.find((p: any) => (p.id || p._id)?.toString() === (ticketDetail?.stationId || ticketDetail?.providerId)?.toString())?.drawTime && (
                                                <Typography variant="caption" color="text.secondary">
                                                    {providers.find((p: any) => (p.id || p._id)?.toString() === (ticketDetail?.stationId || ticketDetail?.providerId)?.toString())?.drawTime}
                                                </Typography>
                                            )}
                                        </Box>
                                        
                                        <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                            <Typography variant="caption" color="text.secondary">Số lượng</Typography>
                                            <Typography variant="body1" fontWeight={600}>
                                                {resolveAvailableTicketQuantity(ticketDetail)} tờ
                                            </Typography>
                                        </Box>

                                        <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                            <Typography variant="caption" color="text.secondary">Giá (mỗi vé)</Typography>
                                            <Typography variant="body1" fontWeight={600}>{ticketDetail?.priceSnapshot ? `${ticketDetail.priceSnapshot.toLocaleString('vi-VN')} đ` : 'N/A'}</Typography>
                                        </Box>

                                        <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                            <Typography variant="caption" color="text.secondary">Đã duyệt</Typography>
                                            <Typography variant="body1" fontWeight={600}>{ticketDetail?.verified ? 'Có' : 'Không'}</Typography>
                                        </Box>

                                        <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                            <Typography variant="caption" color="text.secondary">Ngày tạo</Typography>
                                            <Typography variant="body1" fontWeight={600}>
                                                {ticketDetail?.createdAt ? dayjs(ticketDetail.createdAt).format('DD/MM/YYYY HH:mm') : (ticketDetail?.importedAt ? dayjs(ticketDetail.importedAt).format('DD/MM/YYYY HH:mm') : 'N/A')}
                                            </Typography>
                                        </Box>
                                        
                                        <Box sx={{ gridColumn: { xs: "span 12", md: "span 4" }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                            <Typography variant="caption" color="text.secondary">Người tạo</Typography>
                                            <Typography variant="body1" fontWeight={600}>{ticketDetail?.createdBy || 'N/A'}</Typography>
                                        </Box>
                                    </Box>
                                </Stack>
                            </CollapsibleCard>
                        </Stack>
                        
                        <CollapsibleCard
                            title={"Danh sách vé số (Sê-ri)"}
                            subheader={"Thêm các số sê-ri và ảnh vé số thuộc lô này"}
                            expanded={expandedSerials}
                            onToggle={() => setExpandedSerials(!expandedSerials)}
                        >
                            <Stack p="calc(3 * var(--spacing))" gap="calc(3 * var(--spacing))">
                                {!isTicketEditable && (
                                    <Typography variant="body2" color="warning.main">
                                        Vé này chỉ được sửa khi ở trạng thái Trong kho, và không có sê-ri nào đang giữ chỗ hoặc đã bán.
                                    </Typography>
                                )}
                                
                                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 1 }}>
                                    <TextField
                                        size="small"
                                        placeholder="Tìm kiếm sê-ri..."
                                        value={searchSerial}
                                        onChange={(e) => setSearchSerial(e.target.value)}
                                        sx={{ minWidth: 200 }}
                                    />
                                    <Select
                                        size="small"
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                        sx={{ minWidth: 180 }}
                                    >
                                        <MenuItem value="ALL">Tất cả trạng thái</MenuItem>
                                        {availableSerialStatusOptions.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {option.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </Box>

                                {filteredFields.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                                        Không có sê-ri nào phù hợp.
                                    </Typography>
                                ) : (
                                    <TableContainer>
                                    <Table size="small" sx={{ minWidth: 720 }}>
                                        <TableHead>
                                            <TableRow sx={{
                                                bgcolor: "var(--palette-background-neutral)",
                                                "& .MuiTableCell-head": {
                                                    borderBottom: "none",
                                                    color: "var(--palette-text-secondary)",
                                                    fontWeight: 600,
                                                    fontSize: "0.75rem",
                                                    py: 1,
                                                    whiteSpace: "nowrap",
                                                },
                                            }}>
                                                <TableCell width={48} align="center">#</TableCell>
                                                <TableCell width={80} align="center">Ảnh</TableCell>
                                                <TableCell width={200}>Số sê-ri</TableCell>
                                                <TableCell>Mã lô</TableCell>
                                                <TableCell>Trạng thái</TableCell>
                                                <TableCell>Tạo lúc</TableCell>
                                                <TableCell width={48} align="center"></TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {filteredFields.slice((page - 1) * itemsPerPage, page * itemsPerPage).map((item) => {
                                                const index = item.originalIndex;
                                                const serialData = ticketDetail?.serials?.[index];
                                                const isLocked = isExistingLockedSerial(index);
                                                
                                                return (
                                                    <TableRow key={item.id} hover sx={{
                                                        backgroundColor: isLocked ? "rgba(0, 0, 0, 0.02)" : "transparent",
                                                        "&:hover": { bgcolor: "var(--palette-action-hover)" },
                                                        "& .MuiTableCell-root": {
                                                            borderBottom: "1px dashed var(--palette-divider)",
                                                            py: 1,
                                                            verticalAlign: "middle",
                                                        },
                                                    }}>
                                                        <TableCell align="center">
                                                            <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                                                                {index + 1}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Box sx={{ width: 64, height: 48, mx: "auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                                <TicketSerialImageField
                                                                    control={control}
                                                                    index={index}
                                                                    disabled={isLocked}
                                                                    compact={true}
                                                                />
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Controller
                                                                name={`serials.${index}.serialNumber`}
                                                                control={control}
                                                                render={({ field, fieldState }) => (
                                                                    <TextField
                                                                        {...field}
                                                                        size="small"
                                                                        fullWidth
                                                                        disabled={isLocked}
                                                                        error={shouldShowFieldError(fieldState, isSubmitted)}
                                                                        helperText={getVisibleFieldErrorMessage(fieldState, isSubmitted)}
                                                                        InputProps={{
                                                                            sx: { fontWeight: 700, fontFamily: 'monospace' }
                                                                        }}
                                                                    />
                                                                )}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            {serialData?.batchCode ? (
                                                                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.8125rem", color: "text.primary" }}>
                                                                    {formatImportBatchCode(serialData.batchCode)}
                                                                </Typography>
                                                            ) : (
                                                                <Typography variant="body2" color="text.disabled">N/A</Typography>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {serialData?.statusDisplayName ? (
                                                                <Chip 
                                                                    label={serialData.statusDisplayName} 
                                                                    size="small" 
                                                                    color="primary"
                                                                    variant={"soft" as any}
                                                                    sx={{ height: 22, borderRadius: "var(--shape-borderRadius-sm)", fontWeight: 700, fontSize: "0.6875rem" }}
                                                                />
                                                            ) : (
                                                                <Typography variant="body2" color="text.disabled">N/A</Typography>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" sx={{ fontSize: "0.8125rem", color: "text.primary" }}>
                                                                {serialData?.createdAt ? dayjs(serialData.createdAt).format("DD/MM/YY HH:mm") : "N/A"}
                                                            </Typography>
                                                            {serialData?.createdBy && (
                                                                <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                                                                    Bởi: {serialData.createdBy}
                                                                </Typography>
                                                            )}
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            {fields.length > 1 && (
                                                                <IconButton 
                                                                    size="small" 
                                                                    color="error"
                                                                    disabled={isLocked}
                                                                    onClick={() => {
                                                                        remove(index);
                                                                        const newTotalPages = Math.ceil((fields.length - 1) / itemsPerPage);
                                                                        if (page > newTotalPages && newTotalPages > 0) setPage(newTotalPages);
                                                                    }}
                                                                >
                                                                    <DeleteOutlineIcon fontSize="small" />
                                                                </IconButton>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                )}

                                {totalPages > 1 && (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                                        <Pagination 
                                            count={totalPages} 
                                            page={page} 
                                            onChange={handlePageChange} 
                                            color="primary" 
                                        />
                                    </Box>
                                )}

                                <Button
                                    variant="outlined"
                                    startIcon={<AddIcon />}
                                    disabled={!isTicketEditable}
                                    onClick={() => {
                                        append({ serialNumber: "", ticketImg: undefined });
                                        // Clear filter/search to see the newly added row
                                        if (searchSerial) setSearchSerial("");
                                        if (filterStatus !== "ALL") setFilterStatus("ALL");
                                        setPage(Math.ceil((fields.length + 1) / itemsPerPage));
                                    }}
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
                                disabled={!isTicketEditable}
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
