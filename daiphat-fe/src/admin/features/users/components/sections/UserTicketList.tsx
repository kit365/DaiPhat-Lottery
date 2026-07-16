import { useState } from "react";
import {
    Box,
    Card,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Avatar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Stack,
    Autocomplete,
    createFilterOptions
} from "@mui/material";
import { Icon } from "@iconify/react";
import { useUserTickets, useCreateUserTicket, useUpdateUserTicket, useDeleteUserTicket } from "../../hooks/useUserTicket";
import { useTicketSubtypes, useCreateTicketSubtype } from "../../hooks/useTicketSubtype";
import { CircularProgress } from "@mui/material";
import { uploadImagesToCloudinary } from '../../../../api/uploadCloudinary.api';
import { toast } from "react-toastify";
import { useRef } from "react";
import { confirmDelete } from '../../../../utils/swal';

const filter = createFilterOptions<any>();

interface UserUserTicketListProps {
    userId: string;
}

export const UserUserTicketList = ({ userId }: UserUserTicketListProps) => {
    const { data: resUserTickets, isLoading } = useUserTickets({ userId });
    const userTickets = resUserTickets?.data?.recordList || [];
    const { mutate: createUserTicket } = useCreateUserTicket();
    const { mutate: updateUserTicket } = useUpdateUserTicket();
    const { mutate: deleteUserTicket } = useDeleteUserTicket();

    const [openDialog, setOpenDialog] = useState(false);
    const [selectedUserTicket, setSelectedUserTicket] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: "",
        type: "dog",
        ticketSubtype: "",
        weight: "",
        age: "",
        gender: "male",
        notes: "",
        avatar: ""
    });

    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data: resTicketSubtypes } = useTicketSubtypes({ type: formData.type });
    const ticketSubtypes = resTicketSubtypes?.data?.recordList || [];
    const { mutate: createTicketSubtypeMutate } = useCreateTicketSubtype();

    interface TicketSubtypeOption {
        inputValue?: string;
        name: string;
        _id?: string;
    }

    const handleOpenDialog = (userTicket: any = null) => {
        if (userTicket) {
            setSelectedUserTicket(userTicket);
            setFormData({
                name: userTicket.name || "",
                type: userTicket.type || "dog",
                ticketSubtype: userTicket.ticketSubtype || "",
                weight: userTicket.weight || "",
                age: userTicket.age || "",
                gender: userTicket.gender || "male",
                notes: userTicket.notes || "",
                avatar: userTicket.avatar || ""
            });
        } else {
            setSelectedUserTicket(null);
            setFormData({
                name: "",
                type: "dog",
                ticketSubtype: "",
                weight: "",
                age: "",
                gender: "male",
                notes: "",
                avatar: ""
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploading(true);
            const [url] = await uploadImagesToCloudinary([file]);
            setFormData(prev => ({ ...prev, avatar: url }));
            toast.success("Tải ảnh lên thành công");
        } catch (error) {
            toast.error("Tải ảnh lên thất bại");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = () => {
        if (!formData.name) {
            toast.error("Vui lòng nhập tên vé");
            return;
        }

        const data = {
            ...formData,
            userId,
            weight: formData.weight ? parseFloat(formData.weight) : undefined,
            age: formData.age ? parseInt(formData.age) : undefined
        };

        if (selectedUserTicket) {
            updateUserTicket({ id: selectedUserTicket._id, data }, {
                onSuccess: () => {
                    toast.success("Cập nhật vé thành công");
                    handleCloseDialog();
                }
            });
        } else {
            createUserTicket(data, {
                onSuccess: () => {
                    toast.success("Thêm vé mới thành công");
                    handleCloseDialog();
                }
            });
        }
    };

    const handleDelete = (id: string) => {
        confirmDelete("Bạn có chắc chắn muốn xóa vé này?", () => {
            deleteUserTicket(id, {
                onSuccess: () => {
                    toast.success("Xóa vé thành công");
                }
            });
        });
    };

    return (
        <Card sx={{ mt: 3, borderRadius: "var(--shape-borderRadius-lg)", border: '1px solid rgba(145, 158, 171, 0.2)', boxShadow: 'none' }}>
            <Box sx={{ p: "calc(3 * var(--spacing))", display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem', color: 'var(--palette-text-primary)' }}>
                    Danh sách vé
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<Icon icon="eva:plus-fill" />}
                    onClick={() => handleOpenDialog()}
                    sx={{
                        bgcolor: 'var(--palette-text-primary)',
                        color: "var(--palette-common-white)",
                        minHeight: "2.25rem",
                        minWidth: "4rem",
                        fontWeight: 700,
                        fontSize: "0.875rem",
                        padding: "6px 12px",
                        borderRadius: "var(--shape-borderRadius)",
                        textTransform: "none",
                        boxShadow: "none",
                        "&:hover": {
                            bgcolor: "var(--palette-grey-700)",
                            boxShadow: "var(--customShadows-z8)"
                        }
                    }}
                >
                    Thêm vé
                </Button>
            </Box>

            <TableContainer>
                <Table size="medium">
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'var(--palette-background-neutral)' }}>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--palette-text-secondary)', borderBottom: 'none' }}>Tên vé</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--palette-text-secondary)', borderBottom: 'none' }}>Loại hình</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--palette-text-secondary)', borderBottom: 'none' }}>Đài</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--palette-text-secondary)', borderBottom: 'none' }}>Số lượng</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--palette-text-secondary)', borderBottom: 'none' }}>Giá (VNĐ)</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--palette-text-secondary)', borderBottom: 'none' }}>Hành động</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {userTickets.map((userTicket: any) => (
                            <TableRow key={userTicket._id} sx={{ '&:hover': { bgcolor: '#F9FAFB' } }}>
                                <TableCell sx={{ borderBottom: '1px dashed var(--palette-text-disabled)33' }}>
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Avatar
                                            src={userTicket.avatar}
                                            alt={userTicket.name}
                                            sx={{
                                                width: '2.5rem',
                                                height: '2.5rem',
                                                borderRadius: "var(--shape-borderRadius)",
                                                bgcolor: userTicket.type === 'dog' ? 'rgba(0, 167, 111, 0.08)' : 'rgba(142, 51, 255, 0.08)'
                                            }}
                                        >
                                            <Icon
                                                icon={userTicket.type === 'dog' ? 'mdi:ticket-confirmation' : 'mdi:ticket-percent'}
                                                style={{ fontSize: '1.5rem', color: userTicket.type === 'dog' ? 'var(--palette-primary-main)' : '#8E33FF' }}
                                            />
                                        </Avatar>
                                        <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--palette-text-primary)' }}>{userTicket.name}</Typography>
                                            <Typography variant="caption" sx={{ color: 'var(--palette-text-secondary)', fontSize: '0.75rem' }}>
                                                {userTicket.gender === 'male' ? 'Thường' : 'VIP'}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </TableCell>
                                <TableCell sx={{ borderBottom: '1px dashed var(--palette-text-disabled)33', fontSize: '0.875rem' }}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Icon
                                            icon={userTicket.type === 'dog' ? 'mdi:ticket-confirmation' : 'mdi:ticket-percent'}
                                            style={{ color: 'var(--palette-text-secondary)', fontSize: '1.25rem' }}
                                        />
                                        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                            {userTicket.type === 'dog' ? 'Xổ số Vietlott' : 'Xổ số kiến thiết'}
                                        </Typography>
                                    </Stack>
                                </TableCell>
                                <TableCell sx={{ borderBottom: '1px dashed var(--palette-text-disabled)33', fontSize: '0.875rem' }}>{userTicket.ticketSubtype || '-'}</TableCell>
                                <TableCell sx={{ borderBottom: '1px dashed var(--palette-text-disabled)33', fontSize: '0.875rem' }}>{userTicket.weight ? `${userTicket.weight}` : '-'}</TableCell>
                                <TableCell sx={{ borderBottom: '1px dashed var(--palette-text-disabled)33', fontSize: '0.875rem' }}>{userTicket.age ? `${userTicket.age.toLocaleString()}đ` : '-'}</TableCell>
                                <TableCell align="right" sx={{ borderBottom: '1px dashed var(--palette-text-disabled)33' }}>
                                    <Stack direction="row" justifyContent="flex-end" spacing={1}>
                                        <IconButton onClick={() => handleOpenDialog(userTicket)} sx={{ color: 'var(--palette-text-secondary)', '&:hover': { bgcolor: 'rgba(145, 158, 171, 0.08)' } }}>
                                            <Icon icon="eva:edit-fill" width={22} />
                                        </IconButton>
                                        <IconButton onClick={() => handleDelete(userTicket._id)} sx={{ color: 'var(--palette-error-main)', '&:hover': { bgcolor: 'rgba(255, 86, 48, 0.08)' } }}>
                                            <Icon icon="eva:trash-2-fill" width={22} />
                                        </IconButton>
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                {userTickets.length === 0 && !isLoading && (
                    <Box sx={{ py: 10, textAlign: 'center' }}>
                        <Icon icon="mdi:ticket-off" style={{ width: '4rem', height: '4rem', color: 'var(--palette-text-disabled)', opacity: 0.24, marginBottom: '1rem' }} />
                        <Typography variant="body2" sx={{ color: 'var(--palette-text-disabled)', fontSize: '0.875rem', fontWeight: 500 }}>
                            Khách hàng này chưa có vé nào
                        </Typography>
                    </Box>
                )}
            </TableContainer>

            <Dialog
                open={openDialog}
                onClose={handleCloseDialog}
                fullWidth
                maxWidth="sm"
                PaperProps={{
                    sx: {
                        borderRadius: "var(--shape-borderRadius-lg)",
                        backgroundImage: 'none',
                        p: 1
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 700, fontSize: '1.125rem', p: '1.5rem 1.5rem 1rem' }}>
                    {selectedUserTicket ? 'Chỉnh sửa vé' : 'Thêm vé mới'}
                </DialogTitle>
                <DialogContent sx={{ p: '0 1.5rem 1.5rem' }}>
                    <Stack spacing={2.5} sx={{ mt: 1 }}>
                        <Box sx={{ mb: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <Box sx={{ position: 'relative' }}>
                                <Avatar
                                    src={formData.avatar}
                                    sx={{
                                        width: 100,
                                        height: 100,
                                        cursor: 'pointer',
                                        border: '2px dashed var(--palette-text-disabled)33',
                                        bgcolor: 'rgba(145, 158, 171, 0.08)',
                                        '&:hover': { opacity: 0.8 }
                                    }}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {isUploading ? (
                                        <CircularProgress size={24} sx={{ color: 'var(--palette-text-primary)' }} />
                                    ) : (
                                        <Icon icon="solar:camera-add-bold" width={32} color="var(--palette-text-secondary)" />
                                    )}
                                </Avatar>
                                <IconButton
                                    size="small"
                                    sx={{
                                        position: 'absolute',
                                        bottom: 0,
                                        right: 0,
                                        bgcolor: 'var(--palette-text-primary)',
                                        color: "var(--palette-common-white)",
                                        border: '2px solid #fff',
                                        '&:hover': { bgcolor: "var(--palette-grey-700)" }
                                    }}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Icon icon="solar:pen-bold" width={14} />
                                </IconButton>
                            </Box>
                            <input
                                type="file"
                                ref={fileInputRef}
                                hidden
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                            <Typography variant="caption" sx={{ mt: 1.5, color: 'var(--palette-text-secondary)', fontWeight: 500 }}>
                                Nhấp để tải ảnh vé
                            </Typography>
                        </Box>

                        <TextField
                            fullWidth
                            label="Tên vé"
                            placeholder="Ví dụ: Vé kiến thiết, Vé Vietlott..."
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                            sx={{ '& .MuiInputBase-input': { fontSize: '0.875rem' } }}
                        />
                        <Stack direction="row" spacing={2}>
                                <TextField
                                select
                                fullWidth
                                label="Loại hình"
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                                sx={{ '& .MuiInputBase-input': { fontSize: '0.875rem' } }}
                            >
                                <MenuItem value="dog" sx={{ fontSize: '0.875rem' }}>Xổ số Vietlott</MenuItem>
                                <MenuItem value="cat" sx={{ fontSize: '0.875rem' }}>Xổ số kiến thiết</MenuItem>
                            </TextField>
                            <TextField
                                select
                                fullWidth
                                label="Hạng vé"
                                value={formData.gender}
                                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                                sx={{ '& .MuiInputBase-input': { fontSize: '0.875rem' } }}
                            >
                                <MenuItem value="male" sx={{ fontSize: '0.875rem' }}>Thường</MenuItem>
                                <MenuItem value="female" sx={{ fontSize: '0.875rem' }}>VIP</MenuItem>
                            </TextField>
                        </Stack>

                        <Autocomplete
                            value={formData.ticketSubtype}
                            onChange={async (_, newValue) => {
                                if (typeof newValue === 'string') {
                                    setFormData({ ...formData, ticketSubtype: newValue });
                                } else if (newValue && (newValue as TicketSubtypeOption).inputValue) {
                                    const ticketSubtypeName = (newValue as TicketSubtypeOption).inputValue || "";
                                    setFormData({ ...formData, ticketSubtype: ticketSubtypeName });
                                    createTicketSubtypeMutate({ name: ticketSubtypeName, type: formData.type });
                                } else {
                                    setFormData({ ...formData, ticketSubtype: (newValue as TicketSubtypeOption)?.name || "" });
                                }
                            }}
                            filterOptions={(options, params) => {
                                const filtered = filter(options, params);
                                const { inputValue } = params;
                                const isExisting = options.some((option) => inputValue === (option as TicketSubtypeOption).name);
                                if (inputValue !== '' && !isExisting) {
                                    filtered.push({
                                        inputValue: inputValue,
                                        name: `Thêm "${inputValue}"`,
                                    });
                                }
                                return filtered;
                            }}
                            selectOnFocus
                            clearOnBlur
                            handleHomeEndKeys
                            options={ticketSubtypes as TicketSubtypeOption[]}
                            getOptionLabel={(option) => {
                                if (typeof option === 'string') {
                                    return option;
                                }
                                if ((option as TicketSubtypeOption).inputValue) {
                                    return (option as TicketSubtypeOption).inputValue || "";
                                }
                                return (option as TicketSubtypeOption).name;
                            }}
                            renderOption={(props, option) => (
                                <li {...props} key={(option as TicketSubtypeOption)._id || (option as TicketSubtypeOption).name} style={{ fontSize: '0.875rem' }}>
                                    {(option as TicketSubtypeOption).name}
                                </li>
                            )}
                            freeSolo
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Đài"
                                    placeholder="Ví dụ: Tiền Giang, TP.HCM, Hà Nội..."
                                    InputLabelProps={{ shrink: true }}
                                />
                            )}
                            sx={{ '& .MuiInputBase-root': { fontSize: '0.875rem' } }}
                        />

                        <Stack direction="row" spacing={2}>
                            <TextField
                                fullWidth
                                label="Số lượng"
                                type="number"
                                value={formData.weight}
                                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                                sx={{ '& .MuiInputBase-input': { fontSize: '0.875rem' } }}
                            />
                            <TextField
                                fullWidth
                                label="Giá vé (VNĐ)"
                                type="number"
                                placeholder="Ví dụ: 10000, 50000..."
                                value={formData.age}
                                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                                sx={{ '& .MuiInputBase-input': { fontSize: '0.875rem' } }}
                            />
                        </Stack>
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Ghi chú thêm"
                            placeholder="Nhập thông tin quan trọng cần lưu ý..."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                            sx={{ '& .MuiInputBase-input': { fontSize: '0.875rem' } }}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: '1rem 1.5rem 1.5rem', borderTop: '1px dashed rgba(145, 158, 171, 0.2)' }}>
                    <Button
                        onClick={handleCloseDialog}
                        sx={{
                            color: 'var(--palette-text-secondary)',
                            fontSize: '0.875rem',
                            fontWeight: 700,
                            textTransform: 'none',
                            '&:hover': { bgcolor: 'rgba(145, 158, 171, 0.08)' }
                        }}
                    >
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        sx={{
                            bgcolor: 'var(--palette-text-primary)',
                            color: "var(--palette-common-white)",
                            minHeight: "2.25rem",
                            px: 3,
                            borderRadius: "var(--shape-borderRadius)",
                            fontSize: '0.875rem',
                            fontWeight: 700,
                            textTransform: 'none',
                            boxShadow: 'none',
                            '&:hover': {
                                bgcolor: "var(--palette-grey-700)",
                                boxShadow: "var(--customShadows-z8)"
                            }
                        }}
                    >
                        {selectedUserTicket ? 'Cập nhật' : 'Lưu lại'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Card>
    );
};




