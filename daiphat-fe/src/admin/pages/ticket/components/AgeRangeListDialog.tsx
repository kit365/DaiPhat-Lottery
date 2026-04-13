import {
    Dialog,
    DialogTitle,
    DialogContent,
    Button,
    List,
    ListItem,
    ListItemText,
    IconButton,
    Box,
    CircularProgress,
    Typography,
    Stack,
    Tooltip
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Delete as DeleteIcon, Edit as EditIcon, Close as CloseIcon } from "@mui/icons-material";
import { useDeleteTicketAgeRange, useTicketAgeRanges } from "../hooks/useTicket";
import { toast } from "react-toastify";
import { AgeRangeFormDialog } from "./AgeRangeFormDialog";

interface AgeRangeListDialogProps {
    open: boolean;
    onClose: () => void;
}

export const AgeRangeListDialog = ({ open, onClose }: AgeRangeListDialogProps) => {
    const { t } = useTranslation();
    const [formOpen, setFormOpen] = useState(false);
    const [editId, setEditId] = useState<string | number | null>(null);

    const { data: ageRanges = [], isLoading } = useTicketAgeRanges();
    const { mutate: deleteAgeRange } = useDeleteTicketAgeRange();

    const handleCreate = () => {
        setEditId(null);
        setFormOpen(true);
    };

    const handleEdit = (id: string | number) => {
        setEditId(id);
        setFormOpen(true);
    };

    const handleDelete = (id: string | number) => {
        if (confirm(t("admin.common.confirm_delete"))) {
            deleteAgeRange(id, {
                onSuccess: (res) => {
                    if (res.success) {
                        toast.success(t("admin.ticket.age_range.delete_success"));
                    } else {
                        toast.error(res.message || t("admin.common.error"));
                    }
                }
            });
        }
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                maxWidth="sm"
                fullWidth
                slotProps={{
                    paper: {
                        sx: { borderRadius: "var(--shape-borderRadius-lg)", padding: "16px", minHeight: "400px" }
                    }
                }}
            >
                <DialogTitle sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '1.125rem',
                    fontWeight: 700,
                    padding: "8px 8px 16px 8px"
                }}>
                    {t("admin.ticket.age_range.title")}
                    <Tooltip title={t("admin.common.close")}>
                        <IconButton onClick={onClose} size="small" sx={{ '&:hover': { backgroundColor: 'var(--palette-background-neutral)' } }}>
                            <CloseIcon />
                        </IconButton>
                    </Tooltip>
                </DialogTitle>

                <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            variant="contained"
                            onClick={handleCreate}
                            sx={{
                                background: 'var(--palette-text-primary)',
                                minHeight: "2.25rem",
                                fontWeight: 700,
                                fontSize: "0.875rem",
                                padding: "var(--shape-borderRadius-sm) calc(2 * var(--spacing))",
                                borderRadius: "var(--shape-borderRadius)",
                                textTransform: "none",
                                boxShadow: "none",
                                "&:hover": {
                                    background: "var(--palette-grey-700)",
                                    boxShadow: "var(--customShadows-z8)"
                                }
                            }}
                        >
                            {t("admin.common.add") || "Thêm"}
                        </Button>
                    </Box>

                    <Box sx={{ flex: 1, overflowY: 'auto' }}>
                        {isLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                                <CircularProgress />
                            </Box>
                        ) : ageRanges.length === 0 ? (
                            <Typography sx={{ textAlign: 'center', color: 'var(--palette-text-disabled)', py: 4, fontSize: '0.875rem' }}>
                                {t("admin.ticket.age_range.no_data")}
                            </Typography>
                        ) : (
                            <List>
                                {ageRanges.map((item: any) => (
                                    <ListItem
                                        key={item.ageRangeId}
                                        sx={{
                                            borderBottom: '1px solid var(--palette-text-disabled)29',
                                            borderRadius: "var(--shape-borderRadius)",
                                            '&:hover': { backgroundColor: 'var(--palette-text-disabled)29' }
                                        }}
                                        secondaryAction={
                                            <Stack direction="row" spacing={0.5}>
                                                <Tooltip title={t("admin.common.edit")}>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleEdit(item.ageRangeId)}
                                                        sx={{
                                                            '&:hover': { backgroundColor: 'rgba(99, 115, 129, 0.08)' }
                                                        }}
                                                    >
                                                        <EditIcon sx={{ fontSize: '1.125rem', color: 'var(--palette-text-secondary)' }} />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title={t("admin.common.delete")}>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleDelete(item.ageRangeId)}
                                                        sx={{
                                                            '&:hover': { backgroundColor: 'rgba(255, 86, 48, 0.08)' }
                                                        }}
                                                    >
                                                        <DeleteIcon sx={{ fontSize: '1.125rem', color: 'var(--palette-error-main)' }} />
                                                    </IconButton>
                                                </Tooltip>
                                            </Stack>
                                        }
                                    >
                                        <ListItemText
                                            primary={item.name}
                                            secondary={item.description}
                                            primaryTypographyProps={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--palette-text-primary)' }}
                                            secondaryTypographyProps={{ fontSize: '0.8125rem' }}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        )}
                    </Box>
                </DialogContent>
            </Dialog>

            {formOpen && (
                <AgeRangeFormDialog
                    open={formOpen}
                    onClose={() => setFormOpen(false)}
                    editId={editId}
                />
            )}
        </>
    );
};




