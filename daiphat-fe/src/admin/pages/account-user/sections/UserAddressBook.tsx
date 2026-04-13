import { Box, Typography, CircularProgress, IconButton, Card, Stack, Chip, Button } from "@mui/material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserAddresses, deleteUserAddress, setUserAddressDefault } from "../../../api/account-user.api";
import { Icon } from "@iconify/react";
import { useState } from "react";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { toast } from "react-toastify";
import Swal from "sweetalert2";

interface UserAddressBookProps {
    userId: string;
}

export const UserAddressBook = ({ userId }: UserAddressBookProps) => {
    const queryClient = useQueryClient();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const { data: res, isLoading } = useQuery({
        queryKey: ["user-addresses", userId],
        queryFn: () => getUserAddresses(userId),
        enabled: !!userId,
    });

    const mutationDelete = useMutation({
        mutationFn: deleteUserAddress,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["user-addresses", userId] });
            toast.success("Đã xóa địa chỉ!");
        }
    });

    const mutationSetDefault = useMutation({
        mutationFn: setUserAddressDefault,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["user-addresses", userId] });
            toast.success("Đã đặt làm mặc định!");
        }
    });

    const addresses = res?.data || [];

    const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, id: string) => {
        setAnchorEl(event.currentTarget);
        setSelectedId(id);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedId(null);
    };

    const handleDelete = async () => {
        if (!selectedId) return;
        handleCloseMenu();
        const result = await Swal.fire({
            title: 'Xác nhận xóa?',
            text: "Bạn không thể hoàn tác hành động này!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Đồng ý',
            cancelButtonText: 'Hủy'
        });

        if (result.isConfirmed) {
            mutationDelete.mutate(selectedId);
        }
    };

    const handleSetDefault = () => {
        if (!selectedId) return;
        mutationSetDefault.mutate(selectedId);
        handleCloseMenu();
    };

    if (isLoading) {
        return (
            <Box sx={{ p: 5, textAlign: 'center' }}>
                <CircularProgress size={32} />
            </Box>
        );
    }

    return (
        <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
                <Typography variant="h6">Address book</Typography>
                <Button
                    variant="contained"
                    startIcon={<Icon icon="eva:plus-fill" />}
                    size="small"
                    disabled // Chức năng thêm sẽ làm sau nếu cần
                >
                    Add address
                </Button>
            </Stack>

            <Stack spacing={2}>
                {addresses.length === 0 ? (
                    <Typography sx={{ color: 'var(--palette-text-disabled)', textAlign: 'center', py: 5 }}>
                        Chưa có địa chỉ nào được lưu.
                    </Typography>
                ) : (
                    addresses.map((item: any) => (
                        <Card key={item._id} sx={{ p: 3, position: 'relative' }}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                    {item.fullName}
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'var(--palette-text-secondary)' }}>
                                    (Home)
                                </Typography>
                                {item.isDefault && (
                                    <Chip
                                        label="Default"
                                        size="small"
                                        color="info"
                                        sx={{
                                            height: 20,
                                            fontSize: '0.625rem',
                                            fontWeight: 700,
                                            borderRadius: '6px'
                                        }}
                                    />
                                )}
                            </Stack>

                            <Typography variant="body2" sx={{ color: 'var(--palette-text-secondary)', mb: 0.5 }}>
                                {item.address}
                            </Typography>

                            <Typography variant="body2" sx={{ color: 'var(--palette-text-secondary)' }}>
                                {item.phone}
                            </Typography>

                            <IconButton
                                size="small"
                                sx={{ position: 'absolute', top: 16, right: 16 }}
                                onClick={(e) => handleOpenMenu(e, item._id)}
                            >
                                <Icon icon="eva:more-vertical-fill" />
                            </IconButton>
                        </Card>
                    ))
                )}
            </Stack>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleCloseMenu}
            >
                <MenuItem onClick={handleSetDefault} disabled={addresses.find((a: any) => a._id === selectedId)?.isDefault}>
                    <Icon icon="eva:checkmark-circle-2-fill" style={{ marginRight: 8 }} />
                    Đặt làm mặc định
                </MenuItem>
                <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
                    <Icon icon="eva:trash-2-outline" style={{ marginRight: 8 }} />
                    Xóa địa chỉ
                </MenuItem>
            </Menu>
        </Box>
    );
};
