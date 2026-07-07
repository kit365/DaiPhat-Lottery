import {
    Dialog,
    DialogTitle,
    DialogContent,
    TextField,
    Button,
    List,
    ListItem,
    ListItemText,
    IconButton,
    Box,
    CircularProgress,
    Typography,
    Tooltip
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Delete as DeleteIcon, Close as CloseIcon } from "@mui/icons-material";
import { useBlogTags, useCreateBlogTag, useDeleteBlogTag } from "../../../hooks/useBlogTag";
import { AppToast as toast } from '../../../../utils/toast.util';
import { confirmDelete } from "../../../utils/swal";

interface BlogTagDialogProps {
    open: boolean;
    onClose: () => void;
}

export const BlogTagDialog = ({ open, onClose }: BlogTagDialogProps) => {
    const { t } = useTranslation();
    const [tagName, setTagName] = useState("");

    // Hooks
    const { data: tags = [], isLoading } = useBlogTags();
    const { mutate: createTag, isPending: isCreating } = useCreateBlogTag();
    const { mutate: deleteTag } = useDeleteBlogTag();

    const handleCreate = () => {
        if (!tagName.trim()) return;

        createTag({ name: tagName }, {
            onSuccess: (res) => {
                if (res.success) {
                    toast.success(t("admin.ticket.tags.create_success"));
                    setTagName("");
                } else {
                    toast.error(res.message || t("admin.ticket.tags.create_error"));
                }
            },
            onError: () => {
                toast.error(t("admin.common.error"));
            }
        });
    };

    const handleDelete = (id: number | string) => {
        confirmDelete(t("admin.ticket.tags.delete_confirm"), () => {
            deleteTag(id, {
                onSuccess: (res) => {
                    if (res.success) {
                        toast.success(t("admin.ticket.tags.delete_success"));
                    } else {
                        toast.error(res.message || t("admin.ticket.tags.delete_error"));
                    }
                }
            });
        });
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: "var(--shape-borderRadius-lg)",
                    padding: "16px",
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
                {t("admin.blog.tags.title")}
                <Tooltip title={t("admin.common.close")}>
                    <IconButton onClick={onClose} size="small" sx={{ '&:hover': { backgroundColor: 'var(--palette-background-neutral)' } }}>
                        <CloseIcon />
                    </IconButton>
                </Tooltip>
            </DialogTitle>

            <DialogContent sx={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '500px', p: 0 }}>

                {/* Input Area */}
                <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
                    <TextField
                        fullWidth
                        placeholder={t("admin.ticket.tags.add_placeholder")}
                        value={tagName}
                        onChange={(e) => setTagName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreate();
                        }}
                        size="small"
                        InputProps={{
                            sx: {
                                borderRadius: "var(--shape-borderRadius)",
                                fontSize: '0.875rem'
                            }
                        }}
                    />
                    <Button
                        variant="contained"
                        onClick={handleCreate}
                        disabled={!tagName.trim() || isCreating}
                        sx={{
                            borderRadius: "var(--shape-borderRadius)",
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            minWidth: '80px',
                            background: 'var(--palette-text-primary)',
                            boxShadow: "none",
                            '&:hover': {
                                background: "var(--palette-grey-700)",
                                boxShadow: "var(--customShadows-z8)"
                            }
                        }}
                    >
                        {isCreating ? <CircularProgress size={24} color="inherit" /> : (t("admin.common.add") || "Thêm")}
                    </Button>
                </Box>

                {/* List Tags */}
                <Box sx={{ flex: 1, overflowY: 'auto', px: 1 }}>
                    {isLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : tags.length === 0 ? (
                        <Typography sx={{ textAlign: 'center', color: 'var(--palette-text-disabled)', py: 4, fontSize: '0.875rem' }}>
                            {t("admin.blog.tags.no_tags")}
                        </Typography>
                    ) : (
                        <List>
                            {tags.map((tag: any) => (
                                <ListItem
                                    key={tag.id || tag.tagId}
                                    secondaryAction={
                                        <Tooltip title={t("admin.common.delete")}>
                                            <IconButton
                                                edge="end"
                                                aria-label="delete"
                                                onClick={() => handleDelete(tag.id || tag.tagId)}
                                                sx={{ '&:hover': { backgroundColor: 'rgba(255, 86, 48, 0.08)' } }}
                                            >
                                                <DeleteIcon sx={{ fontSize: '1.125rem', color: 'var(--palette-error-main)' }} />
                                            </IconButton>
                                        </Tooltip>
                                    }
                                    sx={{
                                        borderRadius: "var(--shape-borderRadius)",
                                        mb: 1,
                                        '&:hover': {
                                            backgroundColor: 'var(--palette-text-disabled)14'
                                        }
                                    }}
                                >
                                    <ListItemText
                                        primary={tag.name}
                                        primaryTypographyProps={{ fontSize: '0.9375rem', fontWeight: 600 }}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    )}
                </Box>

            </DialogContent>
        </Dialog>
    );
};




