"use client";

import { useMemo, useState } from "react";
import {
    Box,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    IconButton,
    MenuItem,
    Stack,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import StarIcon from "@mui/icons-material/Star";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { LazyDataGrid } from "@/admin/shared/data-grid/LazyDataGrid";
import { dataGridStyles } from "@/admin/shared/data-grid";
import { DATA_GRID_LOCALE_VN } from "@/shared/components/DataTable/localeText.config";
import { Button } from "@/admin/components/ui/Button";
import { CanAccess } from "@/admin/components/auth/CanAccess";
import { DeleteIcon, EditIcon } from "@/admin/assets/icons";
import { PERMISSIONS } from "@/admin/constants/permission.constants";
import { SettingsContentTabs } from "./SettingsContentTabs";
import {
    useContractTemplates,
    useCreateContractTemplate,
    useDeleteContractTemplate,
    useSetDefaultContractTemplate,
    useUpdateContractTemplate,
} from "../hooks/useContracts";
import {
    openContractTemplatePdf,
    openDefaultContractTemplatePdf,
} from "../services/contractService";
import {
    upsertContractSchema,
    UpsertContractFormValues,
} from "../schemas/contract.schema";
import {
    CONTRACT_TYPE_LABELS,
    ContractTemplate,
    ContractType,
    UpsertContractPayload,
} from "../types/contract.type";

const TYPE_TABS: ContractType[] = ["STREET_AGENT_SALES", "PRIZE_PAYOUT"];

const fieldSx = {
    "& .MuiOutlinedInput-root": {
        borderRadius: "var(--shape-borderRadius)",
        fontSize: "0.875rem",
    },
};

const defaultArticlesForType = (type: ContractType): UpsertContractFormValues["articles"] => {
    if (type === "PRIZE_PAYOUT") {
        return [
            { title: "Điều 1. Phạm vi", kind: "TEXT", body: "<p></p>" },
            { title: "Điều 2. Vé trúng thưởng", kind: "PRIZE_TICKET_TABLE", body: "<p>Danh sách vé, giải và số tiền dưới đây là phụ lục không tách rời của hợp đồng:</p>" },
            { title: "Điều 3. Thuế, hoa hồng và số tiền chi trả", kind: "TEXT", body: "<p>{{taxPolicy}}</p><p>{{commissionPolicy}}</p>" },
        ];
    }
    return [
        { title: "Điều 1. Phạm vi hợp tác", kind: "TEXT", body: "<p></p>" },
        { title: "Điều 2. Hạn mức và bàn giao vé", kind: "TEXT", body: "<p>Hợp đồng có hiệu lực từ <strong>{{contractStartDate}}</strong> đến <strong>{{contractEndDate}}</strong>.</p>" },
    ];
};

const defaultFormValues = (type: ContractType): UpsertContractFormValues => ({
    type,
    title: type === "PRIZE_PAYOUT" ? "Hợp đồng xác nhận trả thưởng vé số" : "Hợp đồng cộng tác bán vé số",
    staffName: type === "PRIZE_PAYOUT" ? "Mẫu nhận thưởng" : "Mẫu cộng tác bán vé số",
    subtitle: "",
    partyARoleLabel: type === "PRIZE_PAYOUT" ? "Bên A - Đại lý trả thưởng" : "Bên A - Đại lý giao vé",
    partyBRoleLabel: type === "PRIZE_PAYOUT" ? "Bên B - Người nhận thưởng" : "Bên B - Người bán vé số dạo",
    partyASignatureLabel: "ĐẠI DIỆN BÊN A",
    partyBSignatureLabel: type === "PRIZE_PAYOUT" ? "BÊN B - NGƯỜI NHẬN THƯỞNG" : "BÊN B - NGƯỜI BÁN VÉ SỐ DẠO",
    footerNote: "",
    isDefault: false,
    articles: defaultArticlesForType(type),
});

export const ContractsSettingsTab = () => {
    const [tabIndex, setTabIndex] = useState(0);
    const activeType = TYPE_TABS[tabIndex] ?? "STREET_AGENT_SALES";
    const { data: contracts = [], isLoading } = useContractTemplates(activeType);
    const { mutate: createContract, isPending: isCreating } = useCreateContractTemplate();
    const { mutate: updateContract, isPending: isUpdating } = useUpdateContractTemplate();
    const { mutate: setDefault, isPending: isSettingDefault } = useSetDefaultContractTemplate();
    const { mutate: removeContract, isPending: isDeleting } = useDeleteContractTemplate();

    const [openDialog, setOpenDialog] = useState(false);
    const [editing, setEditing] = useState<ContractTemplate | null>(null);
    const [pdfBusy, setPdfBusy] = useState(false);

    const { control, handleSubmit, reset, watch } = useForm<UpsertContractFormValues>({
        resolver: zodResolver(upsertContractSchema) as any,
        defaultValues: defaultFormValues(activeType),
    });
    const { fields, append, remove, move } = useFieldArray({ control, name: "articles" });
    const formType = watch("type");

    const openCreate = () => {
        setEditing(null);
        reset(defaultFormValues(activeType));
        setOpenDialog(true);
    };

    const openEdit = (row: ContractTemplate) => {
        setEditing(row);
        reset({
            type: row.type,
            title: row.title,
            staffName: row.staffName,
            subtitle: row.subtitle || "",
            partyARoleLabel: row.partyARoleLabel,
            partyBRoleLabel: row.partyBRoleLabel,
            partyASignatureLabel: row.partyASignatureLabel,
            partyBSignatureLabel: row.partyBSignatureLabel,
            footerNote: row.footerNote || "",
            isDefault: row.isDefault,
            articles: (row.articles || []).map((article) => ({
                code: article.code,
                ordinal: article.ordinal,
                title: article.title,
                kind: article.kind || "TEXT",
                body: article.body || "",
            })),
        });
        setOpenDialog(true);
    };

    const runPdf = async (
        action: () => Promise<void>,
        failureMessage: string
    ) => {
        try {
            setPdfBusy(true);
            await action();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : failureMessage);
        } finally {
            setPdfBusy(false);
        }
    };

    const onSubmit = (data: UpsertContractFormValues) => {
        const payload: UpsertContractPayload = {
            type: data.type,
            title: data.title,
            staffName: data.staffName,
            subtitle: data.subtitle || null,
            partyARoleLabel: data.partyARoleLabel,
            partyBRoleLabel: data.partyBRoleLabel,
            partyASignatureLabel: data.partyASignatureLabel,
            partyBSignatureLabel: data.partyBSignatureLabel,
            footerNote: data.footerNote || null,
            isDefault: data.isDefault,
            articles: data.articles.map((article, index) => ({
                code: article.code ?? undefined,
                ordinal: index + 1,
                title: article.title,
                kind: article.kind,
                body: article.body || "",
            })),
        };
        if (editing) {
            updateContract(
                { id: editing.id, data: payload },
                { onSuccess: () => setOpenDialog(false) }
            );
        } else {
            createContract(payload, { onSuccess: () => setOpenDialog(false) });
        }
    };

    const columns = useMemo<GridColDef[]>(
        () => [
            {
                field: "staffName",
                headerName: "Tên nhân viên",
                flex: 1.2,
                minWidth: 180,
            },
            {
                field: "title",
                headerName: "Tên khách",
                flex: 1.2,
                minWidth: 180,
            },
            {
                field: "code",
                headerName: "Mã",
                width: 140,
            },
            {
                field: "isDefault",
                headerName: "Mặc định",
                width: 120,
                renderCell: (params: GridRenderCellParams) =>
                    params.value ? (
                        <Chip size="small" color="error" label="Mặc định" icon={<StarIcon />} />
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            —
                        </Typography>
                    ),
            },
            {
                field: "actions",
                headerName: "",
                width: 220,
                sortable: false,
                renderCell: (params: GridRenderCellParams) => {
                    const row = params.row as ContractTemplate;
                    return (
                        <Stack direction="row" spacing={0.25} alignItems="center">
                            <Tooltip title="Xem trước PDF">
                                <IconButton
                                    size="small"
                                    disabled={pdfBusy}
                                    onClick={() =>
                                        runPdf(
                                            () => openContractTemplatePdf(row.id, "preview"),
                                            "Không xem trước được PDF"
                                        )
                                    }
                                >
                                    <VisibilityIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Tải PDF">
                                <IconButton
                                    size="small"
                                    disabled={pdfBusy}
                                    onClick={() =>
                                        runPdf(
                                            () => openContractTemplatePdf(row.id, "download"),
                                            "Không tải được PDF"
                                        )
                                    }
                                >
                                    <DownloadIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            {!row.isDefault ? (
                                <CanAccess permission={PERMISSIONS.SETTINGS.EDIT}>
                                    <Tooltip title="Đặt mặc định">
                                        <IconButton
                                            size="small"
                                            disabled={isSettingDefault}
                                            onClick={() => setDefault(row.id)}
                                        >
                                            <StarIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </CanAccess>
                            ) : null}
                            <CanAccess permission={PERMISSIONS.SETTINGS.EDIT}>
                                <IconButton size="small" onClick={() => openEdit(row)}>
                                    <EditIcon />
                                </IconButton>
                            </CanAccess>
                            <CanAccess permission={PERMISSIONS.SETTINGS.EDIT}>
                                <Tooltip
                                    title={
                                        row.isDefault
                                            ? "Không xóa được bản mặc định"
                                            : "Xóa"
                                    }
                                >
                                    <span>
                                        <IconButton
                                            size="small"
                                            disabled={row.isDefault || isDeleting}
                                            onClick={() => {
                                                if (
                                                    window.confirm(
                                                        `Xóa hợp đồng "${row.staffName}"?`
                                                    )
                                                ) {
                                                    removeContract(row.id);
                                                }
                                            }}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            </CanAccess>
                        </Stack>
                    );
                },
            },
        ],
        [pdfBusy, isSettingDefault, isDeleting]
    );

    const headerActions = (
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            <Button
                variant="outlined"
                startIcon={<VisibilityIcon />}
                disabled={pdfBusy || !contracts.some((item) => item.isDefault)}
                onClick={() =>
                    runPdf(
                        () => openDefaultContractTemplatePdf(activeType, "preview"),
                        "Không xem trước được PDF mặc định"
                    )
                }
            >
                Xem trước
            </Button>
            <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                disabled={pdfBusy || !contracts.some((item) => item.isDefault)}
                onClick={() =>
                    runPdf(
                        () => openDefaultContractTemplatePdf(activeType, "download"),
                        "Không tải được PDF mặc định"
                    )
                }
            >
                Tải PDF
            </Button>
            <CanAccess permission={PERMISSIONS.SETTINGS.EDIT}>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
                    Thêm hợp đồng
                </Button>
            </CanAccess>
        </Stack>
    );

    return (
        <Box>
            <Stack
                direction={{ xs: "column", md: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", md: "center" }}
                spacing={2}
                sx={{ mb: 2 }}
            >
                <SettingsContentTabs
                    value={tabIndex}
                    labels={TYPE_TABS.map((type) => CONTRACT_TYPE_LABELS[type])}
                    onChange={setTabIndex}
                />
                {headerActions}
            </Stack>

            {isLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                    <CircularProgress size={28} />
                </Box>
            ) : (
                <Box sx={{ ...dataGridStyles, height: 480 }}>
                    <LazyDataGrid
                        rows={contracts}
                        columns={columns}
                        getRowId={(row) => row.id}
                        disableRowSelectionOnClick
                        localeText={DATA_GRID_LOCALE_VN}
                        pageSizeOptions={[10, 25]}
                        initialState={{
                            pagination: { paginationModel: { pageSize: 10, page: 0 } },
                        }}
                        slots={{
                            noRowsOverlay: () => (
                                <Stack height="100%" alignItems="center" justifyContent="center">
                                    <Typography color="text.secondary">
                                        Chưa có hợp đồng {CONTRACT_TYPE_LABELS[activeType].toLowerCase()}.
                                    </Typography>
                                </Stack>
                            ),
                        }}
                    />
                </Box>
            )}

            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="md">
                <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    {editing ? "Sửa hợp đồng" : "Thêm hợp đồng"}
                    <IconButton onClick={() => setOpenDialog(false)}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <Controller
                                name="staffName"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField
                                        {...field}
                                        label="Tên hiển thị cho nhân viên"
                                        fullWidth
                                        error={!!fieldState.error}
                                        helperText={fieldState.error?.message}
                                        sx={fieldSx}
                                    />
                                )}
                            />
                            <Controller
                                name="title"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField
                                        {...field}
                                        label="Tên hiển thị cho khách (tiêu đề PDF)"
                                        fullWidth
                                        error={!!fieldState.error}
                                        helperText={fieldState.error?.message}
                                        sx={fieldSx}
                                    />
                                )}
                            />
                        </Stack>
                        <Controller
                            name="subtitle"
                            control={control}
                            render={({ field }) => (
                                <TextField {...field} value={field.value || ""} label="Phụ đề" fullWidth sx={fieldSx} />
                            )}
                        />
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <Controller
                                name="partyARoleLabel"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField
                                        {...field}
                                        label="Nhãn Bên A"
                                        fullWidth
                                        error={!!fieldState.error}
                                        helperText={fieldState.error?.message}
                                        sx={fieldSx}
                                    />
                                )}
                            />
                            <Controller
                                name="partyBRoleLabel"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField
                                        {...field}
                                        label="Nhãn Bên B"
                                        fullWidth
                                        error={!!fieldState.error}
                                        helperText={fieldState.error?.message}
                                        sx={fieldSx}
                                    />
                                )}
                            />
                        </Stack>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <Controller
                                name="partyASignatureLabel"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField
                                        {...field}
                                        label="Nhãn chữ ký Bên A"
                                        fullWidth
                                        error={!!fieldState.error}
                                        helperText={fieldState.error?.message}
                                        sx={fieldSx}
                                    />
                                )}
                            />
                            <Controller
                                name="partyBSignatureLabel"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField
                                        {...field}
                                        label="Nhãn chữ ký Bên B"
                                        fullWidth
                                        error={!!fieldState.error}
                                        helperText={fieldState.error?.message}
                                        sx={fieldSx}
                                    />
                                )}
                            />
                        </Stack>
                        <Controller
                            name="footerNote"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    value={field.value || ""}
                                    label="Ghi chú cuối trang"
                                    fullWidth
                                    multiline
                                    minRows={2}
                                    sx={fieldSx}
                                />
                            )}
                        />
                        <Controller
                            name="isDefault"
                            control={control}
                            render={({ field }) => (
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={Boolean(field.value)}
                                            onChange={(_, checked) => field.onChange(checked)}
                                        />
                                    }
                                    label="Đặt làm hợp đồng mặc định của loại này"
                                />
                            )}
                        />

                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle1" fontWeight={700}>
                                Điều khoản
                            </Typography>
                            <Button
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={() =>
                                    append({
                                        title: `Điều ${fields.length + 1}`,
                                        kind: "TEXT",
                                        body: "<p></p>",
                                    })
                                }
                            >
                                Thêm điều
                            </Button>
                        </Stack>

                        <Stack spacing={2}>
                            {fields.map((field, index) => (
                                <Box
                                    key={field.id}
                                    sx={{
                                        p: 2,
                                        borderRadius: 2,
                                        border: "1px solid",
                                        borderColor: "divider",
                                    }}
                                >
                                    <Stack spacing={1.5}>
                                        <Stack direction="row" spacing={1} alignItems="flex-start">
                                            <Controller
                                                name={`articles.${index}.title`}
                                                control={control}
                                                render={({ field: titleField, fieldState }) => (
                                                    <TextField
                                                        {...titleField}
                                                        label={`Tiêu đề điều ${index + 1}`}
                                                        fullWidth
                                                        error={!!fieldState.error}
                                                        helperText={fieldState.error?.message}
                                                        sx={fieldSx}
                                                    />
                                                )}
                                            />
                                            {formType === "PRIZE_PAYOUT" ? (
                                                <Controller
                                                    name={`articles.${index}.kind`}
                                                    control={control}
                                                    render={({ field: kindField }) => (
                                                        <TextField
                                                            {...kindField}
                                                            select
                                                            label="Loại"
                                                            sx={{ ...fieldSx, minWidth: 180 }}
                                                        >
                                                            <MenuItem value="TEXT">Văn bản</MenuItem>
                                                            <MenuItem value="PRIZE_TICKET_TABLE">
                                                                Bảng vé trúng
                                                            </MenuItem>
                                                            <MenuItem value="OPTIONAL_TEXT">
                                                                Tùy chọn
                                                            </MenuItem>
                                                        </TextField>
                                                    )}
                                                />
                                            ) : null}
                                            <IconButton
                                                size="small"
                                                disabled={index === 0}
                                                onClick={() => move(index, index - 1)}
                                            >
                                                <ArrowUpwardIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                disabled={index === fields.length - 1}
                                                onClick={() => move(index, index + 1)}
                                            >
                                                <ArrowDownwardIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                disabled={fields.length <= 1}
                                                onClick={() => remove(index)}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </Stack>
                                        <Controller
                                            name={`articles.${index}.body`}
                                            control={control}
                                            render={({ field: bodyField }) => (
                                                <TextField
                                                    {...bodyField}
                                                    value={bodyField.value || ""}
                                                    label="Nội dung HTML (có thể dùng {{placeholder}})"
                                                    fullWidth
                                                    multiline
                                                    minRows={3}
                                                    sx={fieldSx}
                                                />
                                            )}
                                        />
                                    </Stack>
                                </Box>
                            ))}
                        </Stack>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button variant="outlined" onClick={() => setOpenDialog(false)}>
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        loading={isCreating || isUpdating}
                        onClick={handleSubmit(onSubmit)}
                    >
                        {editing ? "Lưu" : "Tạo"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
