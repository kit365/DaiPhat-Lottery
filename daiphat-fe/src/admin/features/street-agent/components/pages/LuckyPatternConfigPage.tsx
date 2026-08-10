"use client";

import { useMemo, useState } from "react";
import {
    Box, Card, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { PageHeader } from "../../../../components/ui/PageHeader";
import { Button } from '../../../../components/ui/Button';
import { CanAccess } from "../../../../components/auth/CanAccess";
import { ROUTES } from "../../../../constants/routes";
import { PERMISSIONS } from "../../../../constants/permission.constants";
import { DATA_GRID_LOCALE_VN } from "../../../../../shared/components/DataTable/localeText.config";
import { dataGridStyles } from "../../../../shared/data-grid";
import { EditIcon } from "../../../../assets/icons";
import {
    useCreateLuckyPatternConfig,
    useLuckyPatternConfigs,
    useRecomputeLuckyPatterns,
    useUpdateLuckyPatternConfig,
} from "../../hooks/useLuckyPattern";
import {
    upsertLuckyPatternConfigSchema,
    UpsertLuckyPatternConfigFormValues,
} from "../../schemas/street-agent.schema";
import { LuckyPatternConfig } from "../../types/street-agent.type";
import {
    LUCKY_MATCH_POSITION_LABELS,
    LUCKY_PATTERN_TYPE_LABELS,
} from "../configs/constants";

const fieldSx = {
    "& .MuiOutlinedInput-root": {
        borderRadius: "var(--shape-borderRadius)",
        fontSize: "0.875rem",
    },
};

const defaultFormValues: UpsertLuckyPatternConfigFormValues = {
    patternType: "EXACT",
    exactNumbers: "",
    matchDigits: "",
    matchPosition: "SUFFIX",
    name: "",
    description: "",
    badgeLabel: "",
    badgeColor: "#F59E0B",
    priority: 100,
    active: true,
};

export const LuckyPatternConfigPage = () => {
    const { data: patterns = [], isLoading } = useLuckyPatternConfigs();
    const { mutate: createPattern, isPending: isCreating } = useCreateLuckyPatternConfig();
    const { mutate: updatePattern, isPending: isUpdating } = useUpdateLuckyPatternConfig();
    const { mutate: recompute, isPending: isRecomputing } = useRecomputeLuckyPatterns();

    const [openDialog, setOpenDialog] = useState(false);
    const [editing, setEditing] = useState<LuckyPatternConfig | null>(null);

    const { control, handleSubmit, reset, watch } = useForm<UpsertLuckyPatternConfigFormValues>({
        resolver: zodResolver(upsertLuckyPatternConfigSchema) as any,
        defaultValues: defaultFormValues,
    });

    const patternType = watch("patternType");

    const openCreate = () => {
        setEditing(null);
        reset(defaultFormValues);
        setOpenDialog(true);
    };

    const openEdit = (row: LuckyPatternConfig) => {
        setEditing(row);
        reset({
            patternType: row.patternType,
            exactNumbers: row.exactNumbers || "",
            matchDigits: row.matchDigits || "",
            matchPosition: row.matchPosition || "SUFFIX",
            name: row.name,
            description: row.description || "",
            badgeLabel: row.badgeLabel,
            badgeColor: row.badgeColor || "#F59E0B",
            priority: row.priority ?? 100,
            active: row.active ?? true,
        });
        setOpenDialog(true);
    };

    const onSubmit = (data: UpsertLuckyPatternConfigFormValues) => {
        const payload = {
            ...data,
            exactNumbers: data.patternType === "EXACT" ? data.exactNumbers || null : null,
            matchDigits: data.patternType === "DIGIT_MATCH" ? data.matchDigits || null : null,
            matchPosition: data.patternType === "DIGIT_MATCH" ? data.matchPosition || null : null,
            description: data.description || null,
            badgeColor: data.badgeColor || null,
            priority: data.priority ?? 100,
            active: data.active ?? true,
        };

        if (editing) {
            updatePattern(
                { id: editing.id, data: payload },
                {
                    onSuccess: (response) => {
                        toast.success(response.message || "Đã cập nhật cấu hình số đẹp.");
                        setOpenDialog(false);
                    },
                    onError: (error: any) => {
                        toast.error(error.response?.data?.message || "Cập nhật thất bại");
                    },
                }
            );
            return;
        }

        createPattern(payload, {
            onSuccess: (response) => {
                toast.success(response.message || "Đã tạo cấu hình số đẹp.");
                setOpenDialog(false);
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.message || "Tạo cấu hình thất bại");
            },
        });
    };

    const columns: GridColDef[] = useMemo(
        () => [
            {
                field: "name",
                headerName: "Tên",
                flex: 1.2,
                minWidth: 180,
            },
            {
                field: "patternType",
                headerName: "Loại",
                width: 160,
                valueFormatter: (value) => LUCKY_PATTERN_TYPE_LABELS[value as string] || value,
            },
            {
                field: "rule",
                headerName: "Quy tắc",
                flex: 1,
                minWidth: 180,
                valueGetter: (_value, row) =>
                    row.patternType === "EXACT"
                        ? row.exactNumbers || "—"
                        : `${row.matchDigits || "—"} (${LUCKY_MATCH_POSITION_LABELS[row.matchPosition || ""] || row.matchPosition || "—"})`,
            },
            {
                field: "badgeLabel",
                headerName: "Badge",
                width: 140,
                renderCell: (params: GridRenderCellParams) => (
                    <Chip
                        size="small"
                        label={params.row.badgeLabel}
                        sx={{
                            fontWeight: 700,
                            bgcolor: params.row.badgeColor || "rgba(245, 158, 11, 0.16)",
                            color: params.row.badgeColor ? "#fff" : "rgb(183, 110, 0)",
                        }}
                    />
                ),
            },
            {
                field: "priority",
                headerName: "Ưu tiên",
                width: 100,
            },
            {
                field: "active",
                headerName: "Trạng thái",
                width: 120,
                renderCell: (params: GridRenderCellParams) => (
                    <Chip
                        size="small"
                        label={params.value ? "Đang dùng" : "Tắt"}
                        sx={{
                            fontWeight: 700,
                            bgcolor: params.value ? "rgba(34, 197, 94, 0.16)" : "rgba(145, 158, 171, 0.16)",
                            color: params.value ? "rgb(17, 141, 87)" : "var(--palette-text-secondary)",
                        }}
                    />
                ),
            },
            {
                field: "actions",
                headerName: "",
                width: 80,
                sortable: false,
                renderCell: (params: GridRenderCellParams) => (
                    <CanAccess permission={PERMISSIONS.STREET_AGENT.EDIT}>
                        <IconButton size="small" onClick={() => openEdit(params.row as LuckyPatternConfig)}>
                            <EditIcon />
                        </IconButton>
                    </CanAccess>
                ),
            },
        ],
        []
    );

    return (
        <>
            <PageHeader
                title="Cấu hình số đẹp"
                breadcrumbItems={[
                    { label: "Dashboard", to: "/" },
                    { label: "Vé số" },
                    { label: "Cấu hình số đẹp" },
                ]}
                action={
                    <CanAccess permission={PERMISSIONS.STREET_AGENT.EDIT}>
                        <Stack direction="row" spacing={1.5}>
                            <Button
                                variant="outlined"
                                startIcon={<RefreshIcon />}
                                disabled={isRecomputing}
                                onClick={() =>
                                    recompute(undefined, {
                                        onSuccess: (response) =>
                                            toast.success(response.message || "Đã đánh dấu lại số đẹp."),
                                        onError: (error: any) =>
                                            toast.error(error.response?.data?.message || "Recompute thất bại"),
                                    })
                                }
                            >
                                Đánh dấu lại vé tồn
                            </Button>
                            <Button className="btn-primary-admin" variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
                                Thêm cấu hình
                            </Button>
                        </Stack>
                    </CanAccess>
                }
            />

            <Card
                elevation={0}
                sx={{
                    borderRadius: "var(--shape-borderRadius-lg)",
                    bgcolor: "var(--palette-background-paper)",
                    boxShadow: "var(--customShadows-card)",
                    overflow: "hidden",
                }}
            >
                <Box sx={{ width: "100%", minHeight: 520 }}>
                    <DataGrid
                        className="admin-datagrid"
                        rows={patterns}
                        getRowId={(row) => row.id}
                        loading={isLoading}
                        columns={columns}
                        disableRowSelectionOnClick
                        pageSizeOptions={[10, 20]}
                        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                        localeText={DATA_GRID_LOCALE_VN}
                        slots={{
                            noRowsOverlay: () => (
                                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                                    {isLoading ? <CircularProgress size={32} /> : <span className="admin-datagrid-empty">Chưa có cấu hình số đẹp</span>}
                                </Box>
                            ),
                        }}
                        sx={{ ...dataGridStyles, height: 520 }}
                    />
                </Box>
            </Card>

            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="sm">
                <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
                        {editing ? "Cập nhật cấu hình số đẹp" : "Thêm cấu hình số đẹp"}
                    </Typography>
                    <IconButton onClick={() => setOpenDialog(false)}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <DialogContent dividers>
                        <Stack spacing={2.5}>
                            <Controller
                                name="name"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField {...field} label="Tên cấu hình" fullWidth error={!!fieldState.error} helperText={fieldState.error?.message} sx={fieldSx} />
                                )}
                            />
                            <Controller
                                name="patternType"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField {...field} select label="Loại pattern" fullWidth error={!!fieldState.error} helperText={fieldState.error?.message} sx={fieldSx}>
                                        {Object.entries(LUCKY_PATTERN_TYPE_LABELS).map(([value, label]) => (
                                            <MenuItem key={value} value={value}>
                                                {label}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                )}
                            />
                            {patternType === "EXACT" ? (
                                <Controller
                                    name="exactNumbers"
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <TextField {...field} value={field.value ?? ""} label="Số khớp chính xác" fullWidth error={!!fieldState.error} helperText={fieldState.error?.message} sx={fieldSx} />
                                    )}
                                />
                            ) : (
                                <>
                                    <Controller
                                        name="matchDigits"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextField {...field} value={field.value ?? ""} label="Cụm số khớp" fullWidth error={!!fieldState.error} helperText={fieldState.error?.message} sx={fieldSx} />
                                        )}
                                    />
                                    <Controller
                                        name="matchPosition"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextField {...field} select label="Vị trí khớp" fullWidth error={!!fieldState.error} helperText={fieldState.error?.message} sx={fieldSx}>
                                                {Object.entries(LUCKY_MATCH_POSITION_LABELS).map(([value, label]) => (
                                                    <MenuItem key={value} value={value}>
                                                        {label}
                                                    </MenuItem>
                                                ))}
                                            </TextField>
                                        )}
                                    />
                                </>
                            )}
                            <Controller
                                name="badgeLabel"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField {...field} label="Nhãn badge" fullWidth error={!!fieldState.error} helperText={fieldState.error?.message} sx={fieldSx} />
                                )}
                            />
                            <Controller
                                name="badgeColor"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField {...field} value={field.value ?? ""} label="Màu badge" placeholder="#F59E0B" fullWidth error={!!fieldState.error} helperText={fieldState.error?.message} sx={fieldSx} />
                                )}
                            />
                            <Controller
                                name="priority"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField
                                        {...field}
                                        value={field.value ?? ""}
                                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                                        type="number"
                                        label="Độ ưu tiên"
                                        fullWidth
                                        error={!!fieldState.error}
                                        helperText={fieldState.error?.message}
                                        sx={fieldSx}
                                    />
                                )}
                            />
                            <Controller
                                name="description"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField {...field} value={field.value ?? ""} label="Mô tả" fullWidth multiline minRows={2} error={!!fieldState.error} helperText={fieldState.error?.message} sx={fieldSx} />
                                )}
                            />
                            <Controller
                                name="active"
                                control={control}
                                render={({ field }) => (
                                    <FormControlLabel
                                        control={<Switch checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                                        label="Đang dùng"
                                    />
                                )}
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, py: 2 }}>
                        <Button onClick={() => setOpenDialog(false)}>Hủy</Button>
                        <Button
                            type="submit"
                            loading={isCreating || isUpdating}
                            label={editing ? "Lưu" : "Tạo"}
                            loadingLabel="Đang lưu..."
                        />
                    </DialogActions>
                </form>
            </Dialog>
        </>
    );
};
