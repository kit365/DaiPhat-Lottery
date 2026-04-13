import {
    Dialog,
    DialogTitle,
    DialogContent,
    TextField,
    Button,
    IconButton,
    Box,
    CircularProgress,
    DialogActions,
    Tooltip
} from "@mui/material";
import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { Close as CloseIcon } from "@mui/icons-material";
import { toast } from "react-toastify";
import { useCreateTicketAgeRange, useUpdateTicketAgeRange, useTicketAgeRangeDetail } from "../hooks/useTicket";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";

const schema = z.object({
    name: z.string().min(1, "Tên không được để trống"),
    description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface AgeRangeFormDialogProps {
    open: boolean;
    onClose: () => void;
    editId?: string | number | null;
}

export const AgeRangeFormDialog = ({ open, onClose, editId }: AgeRangeFormDialogProps) => {
    const { t } = useTranslation();
    const isEdit = !!editId;

    // Hooks
    const { mutate: create, isPending: isCreating } = useCreateTicketAgeRange();
    const { mutate: update, isPending: isUpdating } = useUpdateTicketAgeRange();
    const { data: detailData, isLoading: isLoadingDetail } = useTicketAgeRangeDetail(editId || undefined);

    const { control, handleSubmit, reset, setValue } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: "",
            description: ""
        }
    });

    useEffect(() => {
        if (isEdit && detailData) {
            setValue("name", detailData.name);
            setValue("description", detailData.description || "");
        } else if (!isEdit) {
            reset({ name: "", description: "" });
        }
    }, [isEdit, detailData, setValue, reset, open]);

    const onSubmit = (data: FormValues) => {
        const payload = {
            name: data.name,
            description: data.description || ""
        };

        if (isEdit) {
            update({ id: editId!, data: payload }, {
                onSuccess: (res) => {
                    if (res.success) {
                        toast.success(t("admin.ticket.age_range.update_success"));
                        onClose();
                    } else {
                        toast.error(res.message || t("admin.common.error"));
                    }
                },
                onError: () => toast.error(t("admin.common.error"))
            });
        } else {
            create(payload, {
                onSuccess: (res) => {
                    if (res.success) {
                        toast.success(t("admin.ticket.age_range.create_success"));
                        onClose();
                    } else {
                        toast.error(res.message || t("admin.common.error"));
                    }
                },
                onError: () => toast.error(t("admin.common.error"))
            });
        }
    };

    const isLoading = isEdit && isLoadingDetail;
    const isSubmitting = isCreating || isUpdating;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            slotProps={{
                paper: {
                    sx: { borderRadius: "var(--shape-borderRadius-lg)", padding: "8px" }
                }
            }}
            sx={{ zIndex: 1400 }} // Higher than list dialog
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1.125rem', fontWeight: 700 }}>
                {isEdit ? t("admin.ticket.age_range.edit_title") : t("admin.ticket.age_range.create_title")}
                <Tooltip title={t("admin.common.close")}>
                    <IconButton onClick={onClose} size="small" sx={{ '&:hover': { backgroundColor: 'var(--palette-background-neutral)' } }}>
                        <CloseIcon />
                    </IconButton>
                </Tooltip>
            </DialogTitle>

            <DialogContent>
                {isLoading ? (
                    <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
                ) : (
                    <form id="age-range-form" onSubmit={handleSubmit(onSubmit)}>
                        <Box display="flex" flexDirection="column" gap={2} pt={1}>
                            <Controller
                                name="name"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField
                                        {...field}
                                        label={t("admin.ticket.age_range.fields.name_label")}
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
                                    <TextField
                                        {...field}
                                        label={t("admin.ticket.age_range.fields.desc_label")}
                                        fullWidth
                                        multiline
                                        rows={3}
                                    />
                                )}
                            />
                        </Box>
                    </form>
                )}
            </DialogContent>

            {!isLoading && (
                <DialogActions sx={{ padding: '0 24px 24px 24px', justifyContent: 'flex-end' }}>
                    <Button
                        variant="contained"
                        type="submit"
                        form="age-range-form"
                        disabled={isSubmitting}
                        sx={{
                            background: 'var(--palette-text-primary)',
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            padding: "8px 24px",
                            borderRadius: "var(--shape-borderRadius)",
                            textTransform: 'none',
                            boxShadow: "none",
                            '&:hover': {
                                background: "var(--palette-grey-700)",
                                boxShadow: "var(--customShadows-z8)"
                            }
                        }}
                    >
                        {isSubmitting ? t("admin.common.processing") : (isEdit ? t("admin.common.update") : t("admin.common.create"))}
                    </Button>
                </DialogActions>
            )}
        </Dialog>
    );
};




