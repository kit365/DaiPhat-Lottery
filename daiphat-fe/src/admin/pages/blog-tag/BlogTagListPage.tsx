import React, { useState } from 'react';
import { 
    Box, 
    Button, 
    Card, 
    CircularProgress, 
    Dialog, 
    DialogActions, 
    DialogContent, 
    DialogTitle, 
    IconButton, 
    Stack, 
    TextField, 
    Typography,
    ButtonBase,
    Popover,
    MenuItem,
    ListItemIcon,
    ListItemText
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from "react-i18next";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { Title } from "../../components/ui/Title";
import { Search } from "../../components/ui/Search";
import { prefixAdmin } from "../../constants/routes";
import { useBlogTagsPaged, useCreateBlogTag, useUpdateBlogTag, useDeleteBlogTag } from "../blog/hooks/useBlog";
import { DATA_GRID_LOCALE_VN } from '../blog-category/configs/localeText.config';
import { dataGridCardStyles, dataGridContainerStyles, dataGridStyles } from '../blog-category/configs/styles.config';
import { DeleteIcon, EditIcon, ThreeDotsIcon, SortAscendingIcon, SortDescendingIcon, UnsortedIcon } from "../../assets/icons";
import { confirmDelete } from "../../utils/swal";
import { toast } from "react-toastify";
import dayjs from "dayjs";

export const BlogTagListPage = () => {
    const { t } = useTranslation();
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [search, setSearch] = useState('');
    
    // Dialog state
    const [openDialog, setOpenDialog] = useState(false);
    const [editingTag, setEditingTag] = useState<{ id: string | number; name: string; slug: string } | null>(null);
    const [formValues, setFormValues] = useState({ name: '', slug: '' });

    // Popover menu state
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedTag, setSelectedTag] = useState<{ id: string | number; name: string; slug: string } | null>(null);

    // Queries & Mutations
    const params = {
        page: page + 1,
        limit: pageSize,
        search: search || undefined
    };
    const { data: res, isLoading } = useBlogTagsPaged(params);
    const tags = res?.recordList || [];
    const pagination = res?.pagination || { totalRecords: 0 };

    const { mutate: createTag, isPending: isCreating } = useCreateBlogTag();
    const { mutate: updateTag, isPending: isUpdating } = useUpdateBlogTag();
    const { mutate: deleteTag } = useDeleteBlogTag();

    const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, tag: any) => {
        setAnchorEl(event.currentTarget);
        setSelectedTag(tag);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedTag(null);
    };

    const handleOpenCreate = () => {
        setEditingTag(null);
        setFormValues({ name: '', slug: '' });
        setOpenDialog(true);
    };

    const handleOpenEdit = () => {
        if (selectedTag) {
            setEditingTag(selectedTag);
            setFormValues({ name: selectedTag.name, slug: selectedTag.slug });
            setOpenDialog(true);
            handleCloseMenu();
        }
    };

    const handleDelete = () => {
        if (selectedTag) {
            confirmDelete("Bạn có chắc chắn muốn xóa thẻ bài viết này?", () => {
                deleteTag(selectedTag.id, {
                    onSuccess: (response: any) => {
                        if (response.success) {
                            toast.success("Xóa thẻ bài viết thành công!");
                        } else {
                            toast.error(response.message || "Xóa thất bại");
                        }
                    },
                    onError: (err: any) => {
                        toast.error(err.response?.data?.message || "Xóa thất bại");
                    }
                });
            });
            handleCloseMenu();
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formValues.name.trim()) {
            toast.error("Vui lòng nhập tên thẻ");
            return;
        }

        const data = {
            name: formValues.name,
            slug: formValues.slug || undefined
        };

        if (editingTag) {
            updateTag({ id: editingTag.id, data }, {
                onSuccess: (response: any) => {
                    if (response.success) {
                        toast.success("Cập nhật thẻ bài viết thành công!");
                        setOpenDialog(false);
                    } else {
                        toast.error(response.message || "Cập nhật thất bại");
                    }
                },
                onError: (err: any) => {
                    toast.error(err.response?.data?.message || "Cập nhật thất bại");
                }
            });
        } else {
            createTag(data, {
                onSuccess: (response: any) => {
                    if (response.success) {
                        toast.success("Tạo thẻ bài viết thành công!");
                        setOpenDialog(false);
                    } else {
                        toast.error(response.message || "Tạo thất bại");
                    }
                },
                onError: (err: any) => {
                    toast.error(err.response?.data?.message || "Tạo thất bại");
                }
            });
        }
    };

    const columns: GridColDef[] = [
        {
            field: "name",
            headerName: "Tên thẻ",
            flex: 1,
            minWidth: 200,
        },
        {
            field: "slug",
            headerName: "Slug",
            flex: 1,
            minWidth: 200,
        },
        {
            field: "createdAt",
            headerName: "Thời gian tạo",
            width: 200,
            valueGetter: (value) => value ? new Date(value) : null,
            renderCell: (params) => {
                if (!params.value) return null;
                const dateObj = dayjs(params.value);
                if (!dateObj.isValid()) return null;
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: "4px" }}>
                        <span style={{ fontSize: "0.875rem", color: "var(--palette-text-primary)", textTransform: 'capitalize' }}>
                            {dateObj.format('DD MMM, YYYY')}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "var(--palette-text-secondary)", textTransform: 'lowercase' }}>
                            {dateObj.format('hh:mm A')}
                        </span>
                    </Box>
                );
            }
        },
        {
            field: 'actions',
            headerName: '',
            width: 80,
            sortable: false,
            filterable: false,
            align: 'right',
            renderCell: (params) => (
                <ButtonBase
                    onClick={(e) => handleOpenMenu(e, params.row)}
                    sx={{
                        color: "var(--palette-text-secondary)",
                        p: "8px",
                        borderRadius: "50%",
                        rotate: "90deg",
                        transition: "background-color 150ms",
                        "&:hover": {
                            backgroundColor: "var(--palette-text-secondary)14",
                        },
                    }}
                >
                    <ThreeDotsIcon />
                </ButtonBase>
            )
        }
    ];

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Thẻ bài viết" />
                    <Breadcrumb
                        items={[
                            { label: t("admin.dashboard.title"), to: "/" },
                            { label: t("admin.blog.title.list"), to: `/${prefixAdmin}/blog/list` },
                            { label: "Thẻ bài viết" }
                        ]}
                    />
                </div>
                <div>
                    <Button
                        onClick={handleOpenCreate}
                        sx={{
                            background: 'var(--palette-text-primary)',
                            minHeight: "2.25rem",
                            fontWeight: 700,
                            fontSize: "0.875rem",
                            padding: "6px 12px",
                            borderRadius: "var(--shape-borderRadius)",
                            textTransform: "none",
                            boxShadow: "none",
                            "&:hover": {
                                background: "var(--palette-grey-700)",
                                boxShadow: "var(--customShadows-z8)"
                            }
                        }}
                        variant="contained"
                        startIcon={<AddIcon />}
                    >
                        Tạo thẻ mới
                    </Button>
                </div>
            </div>

            <Card elevation={0} sx={{
                borderRadius: 'var(--shape-borderRadius-lg)',
                bgcolor: 'var(--palette-background-paper)',
                boxShadow: 'var(--customShadows-card)',
                overflow: 'visible',
                mb: "24px",
                p: "calc(2 * var(--spacing))"
            }}>
                <Search
                    placeholder="Tìm kiếm thẻ..."
                    value={search}
                    onChange={(val) => { setSearch(val); setPage(0); }}
                    maxWidth="100%"
                />
            </Card>

            <Card elevation={0} sx={dataGridCardStyles}>
                <div style={dataGridContainerStyles}>
                    <DataGrid
                        rows={tags}
                        getRowId={(row) => row.id}
                        loading={isLoading}
                        columns={columns}
                        density="comfortable"
                        slots={{
                            columnSortedAscendingIcon: SortAscendingIcon,
                            columnSortedDescendingIcon: SortDescendingIcon,
                            columnUnsortedIcon: UnsortedIcon,
                            noRowsOverlay: () => (
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                    {isLoading ? <CircularProgress size={32} /> : <span className='text-[1.125rem]'>{t("admin.common.no_data")}</span>}
                                </Box>
                            )
                        }}
                        localeText={DATA_GRID_LOCALE_VN}
                        pagination
                        paginationMode="server"
                        rowCount={pagination.totalRecords || 0}
                        paginationModel={{
                            page,
                            pageSize,
                        }}
                        onPaginationModelChange={(model) => {
                            setPage(model.page);
                            setPageSize(model.pageSize);
                        }}
                        pageSizeOptions={[5, 10, 20]}
                        sx={dataGridStyles}
                        getRowHeight={() => 'auto'}
                        checkboxSelection
                        disableRowSelectionOnClick
                    />
                </div>
            </Card>

            {/* Create/Edit Tag Dialog */}
            <Dialog 
                open={openDialog} 
                onClose={() => setOpenDialog(false)} 
                maxWidth="xs" 
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '16px',
                        boxShadow: 'var(--customShadows-dialog)',
                        p: 1
                    }
                }}
            >
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography component="span" sx={{ fontWeight: 700, fontSize: '1.125rem' }}>
                        {editingTag ? "Chỉnh sửa thẻ" : "Tạo thẻ mới"}
                    </Typography>
                    <IconButton onClick={() => setOpenDialog(false)} sx={{ color: 'text.secondary' }}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ border: 'none', px: 3, py: 1 }}>
                    <Stack spacing={2.5} sx={{ mt: 1 }}>
                        <TextField
                            label="Tên thẻ"
                            fullWidth
                            required
                            value={formValues.name}
                            onChange={(e) => setFormValues(prev => ({ ...prev, name: e.target.value }))}
                        />
                        <TextField
                            label="Slug (Tùy chọn)"
                            fullWidth
                            value={formValues.slug}
                            placeholder="Tự động tạo nếu để trống"
                            onChange={(e) => setFormValues(prev => ({ ...prev, slug: e.target.value }))}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 3, justifyContent: 'flex-end', gap: 1.5 }}>
                    <Button 
                        onClick={() => setOpenDialog(false)} 
                        variant="outlined"
                        sx={{
                            borderRadius: '8px',
                            textTransform: 'none',
                            px: 3,
                            py: 1,
                            borderColor: 'var(--palette-text-disabled)33',
                            color: 'var(--palette-text-primary)',
                            '&:hover': {
                                borderColor: 'var(--palette-text-primary)',
                                bgcolor: 'rgba(0, 0, 0, 0.04)'
                            }
                        }}
                    >
                        Hủy
                    </Button>
                    <Button 
                        onClick={handleFormSubmit} 
                        variant="contained"
                        disabled={isCreating || isUpdating}
                        sx={{
                            borderRadius: '8px',
                            textTransform: 'none',
                            px: 3,
                            py: 1,
                            bgcolor: 'var(--palette-text-primary, #1C252E)',
                            color: 'var(--palette-common-white, #FFFFFF)',
                            '&:hover': {
                                bgcolor: 'rgba(28, 37, 46, 0.8)'
                            }
                        }}
                    >
                        {isCreating || isUpdating ? <CircularProgress size={20} color="inherit" /> : "Lưu"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Action Popover Menu */}
            <Popover
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleCloseMenu}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                PaperProps={{
                    sx: {
                        marginTop: "-8px",
                        width: 140,
                        boxShadow: '0 0 2px 0 rgba(145, 158, 171, 0.24), 0 20px 40px -4px rgba(145, 158, 171, 0.24)',
                        padding: '4px',
                        borderRadius: '10px',
                        overflow: 'visible',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            bottom: -7,
                            right: 20,
                            width: 12,
                            height: 12,
                            backgroundColor: 'background.paper',
                            transform: 'rotate(45deg)',
                            borderRight: '1px solid rgba(145, 158, 171, 0.12)',
                            borderBottom: '1px solid rgba(145, 158, 171, 0.12)',
                            zIndex: 1,
                        }
                    },
                }}
            >
                <MenuItem onClick={handleOpenEdit} sx={{ borderRadius: "var(--shape-borderRadius-sm)", py: 1 }}>
                    <ListItemIcon sx={{ minWidth: '24px !important', mr: 1 }}>
                        <EditIcon sx={{ width: 20, height: 20 }} />
                    </ListItemIcon>
                    <ListItemText primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}>Chỉnh sửa</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleDelete} sx={{ borderRadius: "var(--shape-borderRadius-sm)", py: 1, color: 'error.main' }}>
                    <ListItemIcon sx={{ minWidth: '24px !important', mr: 1, color: 'error.main' }}>
                        <DeleteIcon sx={{ width: 20, height: 20 }} />
                    </ListItemIcon>
                    <ListItemText primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}>Xóa</ListItemText>
                </MenuItem>
            </Popover>
        </>
    );
};
