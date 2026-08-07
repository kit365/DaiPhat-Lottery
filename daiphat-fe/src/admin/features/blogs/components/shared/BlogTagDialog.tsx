"use client";

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
import { useState } from "react";
import { Delete as DeleteIcon, Close as CloseIcon } from "@mui/icons-material";
import { useBlogTags, useCreateBlogTag, useDeleteBlogTag } from "../../hooks/useBlogTag";
import { AppToast as toast } from "../../../../../utils/toast.util";
import { confirmDelete } from "../../../../utils/swal";

interface BlogTagDialogProps {
    open: boolean;
    onClose: () => void;
}

export const BlogTagDialog = ({ open, onClose }: BlogTagDialogProps) => {
    const [tagName, setTagName] = useState("");

    const { data: tags = [], isLoading } = useBlogTags();
    const { mutate: createTag, isPending: isCreating } = useCreateBlogTag();
    const { mutate: deleteTag } = useDeleteBlogTag();

    const handleCreate = () => {
        if (!tagName.trim()) return;

        createTag({ name: tagName }, {
            onSuccess: (res) => {
                if (res.success) {
                    toast.success("Tạo thẻ tag thành công");
                    setTagName("");
                } else {
                    toast.error(res.message || "Tạo tag thất bại");
                }
            },
            onError: () => {
                toast.error("Có lỗi xảy ra");
            }
        });
    };

    const handleDelete = (id: number | string) => {
        confirmDelete("Bạn có chắc chắn muốn xóa tag này?", () => {
            deleteTag(id, {
                onSuccess: (res) => {
                    if (res.success) {
                        toast.success("Xóa tag thành công");
                    } else {
                        toast.error(res.message || "Xóa tag thất bại");
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
                Quản lý tags bài viết
                <Tooltip title="Đóng">
                    <IconButton onClick={onClose} size="small" sx={{ '&:hover': { backgroundColor: 'var(--palette-background-neutral)' } }}>
                        <CloseIcon />
                    </IconButton>
                </Tooltip>
            </DialogTitle>

            <DialogContent sx={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '500px', p: 0 }}>
                <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
                    <TextField
                        fullWidth
                        placeholder="Nhập tên tag..."
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
                        className="btn-primary-admin"
                    >
                        {isCreating ? <CircularProgress size={24} color="inherit" /> : "Thêm"}
                    </Button>
                </Box>

                <Box sx={{ flex: 1, overflowY: 'auto', px: 1 }}>
                    {isLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : tags.length === 0 ? (
                        <Typography sx={{ textAlign: 'center', color: 'var(--palette-text-disabled)', py: 4, fontSize: '0.875rem' }}>
                            Chưa có thẻ tag nào
                        </Typography>
                    ) : (
                        <List>
                            {tags.map((tag: any) => (
                                <ListItem
                                    key={tag.id || tag.tagId}
                                    secondaryAction={
                                        <Tooltip title="Xóa">
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
