"use client";

import React, { useState } from 'react';
import { PERMISSIONS } from "../../../../constants/permission.constants";

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
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { Breadcrumb } from "../../../../components/ui/Breadcrumb";
import { Title } from "../../../../components/ui/Title";
import { Search } from "../../../../components/ui/Search";
import { prefixAdmin } from "../../../../constants/routes";
import { useBlogTagsPaged, useCreateBlogTag, useUpdateBlogTag, useDeleteBlogTag } from "../../hooks/useBlogTag";
import { DATA_GRID_LOCALE_VN } from "../../../../../shared/components/DataTable/localeText.config";
import { dataGridStyles } from "../../../../shared/data-grid";
import { SortAscendingIcon, SortDescendingIcon, UnsortedIcon } from "../../../../assets/icons";
import { confirmDelete } from "../../../../utils/swal";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import { usePermissions } from "../../../../hooks/usePermission";
import { CanAccess } from "../../../../components/auth/CanAccess";
import { AdminRowActionsMenu } from "../../../../components/ui/AdminRowActionsMenu";

export const BlogTagListPage = () => {
    const { can, canAny } = usePermissions();
    const canEdit = can(PERMISSIONS.ARTICLE.EDIT);
    const canDelete = can(PERMISSIONS.ARTICLE.DELETE);
    const showRowActions = canAny([PERMISSIONS.ARTICLE.EDIT, PERMISSIONS.ARTICLE.DELETE]);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [search, setSearch] = useState('');

    // Dialog state
    const [openDialog, setOpenDialog] = useState(false);
    const [editingTag, setEditingTag] = useState<{ id: string | number; name: string; slug: string } | null>(null);
    const [formValues, setFormValues] = useState({ name: '' });
    const [openDetailDialog, setOpenDetailDialog] = useState(false);
    const [detailTag, setDetailTag] = useState<any>(null);

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

    const openTagDetail = (tag: any) => {
        setDetailTag(tag);
        setOpenDetailDialog(true);
    };

    const openTagEdit = (tag: any) => {
        setEditingTag(tag);
        setFormValues({ name: tag.name });
        setOpenDialog(true);
    };

    const handleDeleteTag = (tag: any) => {
        confirmDelete("Bạn có chắc chắn muốn xóa thẻ bài viết này?", () => {
            deleteTag(tag.id, {
                onSuccess: (response: any) => {
                    if (response.success) {
                        toast.success("Xóa thẻ bài viết thành công!");
                    } else {
                        toast.error(response.message || "Xóa thất bại");
                    }
                },
                onError: (err: any) => {
                    toast.error(err.response?.data?.message || err.message || "Xóa thất bại");
                }
            });
        });
    };

    const handleOpenCreate = () => {
        setEditingTag(null);
        setFormValues({ name: '' });
        setOpenDialog(true);
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formValues.name.trim()) {
            toast.error("Vui lòng nhập tên thẻ");
            return;
        }

        const data = {
            name: formValues.name,
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
        ...(showRowActions ? [{
            field: 'actions',
            headerName: '',
            width: 80,
            sortable: false,
            filterable: false,
            align: 'right' as const,
            renderCell: (params: any) => (
                <AdminRowActionsMenu
                    items={[
                        {
                            id: 'detail',
                            label: 'Chi tiết',
                            icon: 'detail',
                            onClick: () => openTagDetail(params.row),
                        },
                        {
                            id: 'edit',
                            label: 'Chỉnh sửa',
                            icon: 'edit',
                            onClick: () => openTagEdit(params.row),
                            hidden: !canEdit,
                        },
                        {
                            id: 'delete',
                            label: 'Xóa',
                            icon: 'delete',
                            onClick: () => handleDeleteTag(params.row),
                            hidden: !canDelete,
                            danger: true,
                        },
                    ]}
                />
            )
        }] : []),
    ];

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Thẻ bài viết" />
                    <Breadcrumb
                        items={[
                            { label: "Bảng điều khiển", to: "/" },
                            { label: "Danh sách bài viết", to: `/${prefixAdmin}/blog/list` },
                            { label: "Thẻ bài viết" }
                        ]}
                    />
                </div>
                <div>
                    <CanAccess permission={PERMISSIONS.ARTICLE.CREATE}>
                        <Button
                            onClick={handleOpenCreate}
                            className="btn-primary-admin"
                            variant="contained"
                            startIcon={<AddIcon />}
                        >
                            Tạo thẻ mới
                        </Button>
                    </CanAccess>
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

            <Card elevation={0} className="admin-datagrid-card">
                <div style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <DataGrid
                        rows={tags}
                        getRowId={(row) => row.id}
                        loading={isLoading}
                        columns={columns}
                        density="comfortable"
                        disableColumnMenu
                        disableColumnSorting
                        className="admin-datagrid"
                        sx={dataGridStyles}
                        slots={{
                            noRowsOverlay: () => (
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                    {isLoading ? <CircularProgress size={32} /> : <span className="admin-datagrid-empty">Chưa có dữ liệu</span>}
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
                        getRowHeight={() => 'auto'}
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

            {/* Detail Tag Dialog */}
            <Dialog
                open={openDetailDialog}
                onClose={() => setOpenDetailDialog(false)}
                maxWidth="sm"
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
                        Chi tiết thẻ bài viết
                    </Typography>
                    <IconButton onClick={() => setOpenDetailDialog(false)} sx={{ color: 'text.secondary' }}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ border: 'none', px: 3, py: 2 }}>
                    <Stack spacing={2}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', alignItems: 'center' }}>
                            <Typography sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.875rem' }}>ID:</Typography>
                            <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{detailTag?.id || '--'}</Typography>
                        </Box>

                        <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', alignItems: 'center' }}>
                            <Typography sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.875rem' }}>Tên thẻ:</Typography>
                            <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{detailTag?.name || '--'}</Typography>
                        </Box>

                        <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', alignItems: 'center' }}>
                            <Typography sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.875rem' }}>Slug:</Typography>
                            <Typography sx={{ fontWeight: 500, fontSize: '0.875rem', fontFamily: 'monospace', bgcolor: 'rgba(0, 0, 0, 0.04)', px: 1, py: 0.5, borderRadius: '4px', width: 'fit-content' }}>
                                {detailTag?.slug || '--'}
                            </Typography>
                        </Box>

                        <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', alignItems: 'center' }}>
                            <Typography sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.875rem' }}>Người tạo:</Typography>
                            <Typography sx={{ fontWeight: 500, fontSize: '0.875rem' }}>{detailTag?.createdBy || '--'}</Typography>
                        </Box>

                        <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', alignItems: 'center' }}>
                            <Typography sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.875rem' }}>Thời gian tạo:</Typography>
                            <Typography sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
                                {detailTag?.createdAt ? dayjs(detailTag.createdAt).format('DD/MM/YYYY HH:mm:ss') : '--'}
                            </Typography>
                        </Box>

                        <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', alignItems: 'center' }}>
                            <Typography sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.875rem' }}>Người sửa cuối:</Typography>
                            <Typography sx={{ fontWeight: 500, fontSize: '0.875rem' }}>{detailTag?.lastModifiedBy || '--'}</Typography>
                        </Box>

                        <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', alignItems: 'center' }}>
                            <Typography sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.875rem' }}>Thời gian sửa:</Typography>
                            <Typography sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
                                {detailTag?.updatedAt ? dayjs(detailTag.updatedAt).format('DD/MM/YYYY HH:mm:ss') : '--'}
                            </Typography>
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 3, justifyContent: 'flex-end' }}>
                    <Button
                        onClick={() => setOpenDetailDialog(false)}
                        variant="contained"
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
                        Đóng
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};
