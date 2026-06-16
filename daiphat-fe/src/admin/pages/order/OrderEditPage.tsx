import { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    Card,
    Stack,
    TextField,
    Typography,
    Divider,
    alpha,
    Avatar,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Autocomplete,
    CircularProgress,
    Grid,
    Box,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from "@mui/material";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { Title } from "../../components/ui/Title";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { prefixAdmin } from "../../constants/routes";
import { useTickets } from "../ticket/hooks/useTickets";
import { useUsers } from "../account-user/hooks/useAccountUser";
import { useOrderDetail, useUpdateOrder } from "./hooks/useOrderManagement";
import { LoadingButton } from "../../components/ui/LoadingButton";

export const OrderEditPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    const { data: orderRes, isLoading: isLoadingOrder } = useOrderDetail(id || "");
    const order = orderRes?.data;

    const { tickets, isLoading: isLoadingTickets } = useTickets();
    const { data: usersRes, isLoading: isLoadingUsers } = useUsers({ limit: 1000 });
    const users = (usersRes as any)?.recordList || [];

    const { mutate: updateOrder, isPending } = useUpdateOrder();

    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [shippingFee, setShippingFee] = useState(0);
    const [discount, setDiscount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState("money");
    const [notes, setNotes] = useState("");
    const [orderStatus, setOrderStatus] = useState("pending");
    const [paymentStatus, setPaymentStatus] = useState("unpaid");

    useEffect(() => {
        if (order) {
            setSelectedUser(order.userId || { fullName: order.fullName, phone: order.phone, _id: order.userId?._id });
            setItems(order.items?.map((item: any) => ({
                ticketId: item.ticketId?._id || item.ticketId,
                name: item.name,
                image: item.image,
                price: item.price,
                quantity: item.quantity,
                variant: item.variant || []
            })) || []);
            setShippingFee(order.shipping?.fee || 0);
            setDiscount(order.discount || 0);
            setPaymentMethod(order.paymentMethod || "money");
            setNotes(order.note || "");
            setOrderStatus(order.orderStatus || "pending");
            setPaymentStatus(order.paymentStatus || "unpaid");
        }
    }, [order]);

    const subTotal = useMemo(() => {
        return items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    }, [items]);

    const total = useMemo(() => {
        return subTotal + shippingFee - discount;
    }, [subTotal, shippingFee, discount]);

    const handleAddItem = (ticket: any) => {
        if (!ticket) return;
        const existingItem = items.find(item => item.ticketId === ticket.id);
        if (existingItem) {
            setItems(items.map(item =>
                item.ticketId === ticket.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ));
        } else {
            setItems([...items, {
                ticketId: ticket.id,
                name: ticket.ticket,
                image: ticket.image,
                price: ticket.price,
                quantity: 1,
                variant: []
            }]);
        }
    };

    const handleRemoveItem = (ticketId: string) => {
        setItems(items.filter(item => item.ticketId !== ticketId));
    };

    const handleUpdateQuantity = (ticketId: string, quantity: number) => {
        if (quantity < 1) return;
        setItems(items.map(item =>
            item.ticketId === ticketId ? { ...item, quantity } : item
        ));
    };

    const handleSubmit = () => {
        if (!selectedUser) {
            toast.error("Vui lòng chọn khách hàng");
            return;
        }
        if (items.length === 0) {
            toast.error("Vui lòng thêm sản phẩm vào đơn hàng");
            return;
        }

        const data = {
            userId: selectedUser._id,
            fullName: selectedUser.fullName,
            phone: selectedUser.phone,
            items: items.map(item => ({
                ticketId: item.ticketId,
                quantity: item.quantity,
                price: item.price,
                name: item.name,
                image: item.image,
                variant: item.variant
            })),
            subTotal,
            shippingFee,
            discount,
            total,
            paymentMethod,
            note: notes,
            orderStatus,
            paymentStatus
        };

        updateOrder({ id: id!, data }, {
            onSuccess: (res) => {
                if (res.code === 200) {
                    toast.success("Cập nhật đơn hàng thành công");
                    navigate(`/${prefixAdmin}/order/detail/${id}`);
                } else {
                    toast.error(res.message || "Có lỗi xảy ra");
                }
            },
            onError: (err: any) => {
                toast.error(err?.response?.data?.message || "Không thể cập nhật đơn hàng");
            }
        });
    };

    if (isLoadingOrder) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 20 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: '1200px', mx: 'auto', p: 'calc(3 * var(--spacing))' }}>
            <Box sx={{ mb: 4 }}>
                <Title title={`Chỉnh sửa đơn hàng #${order?.code || id?.slice(-6).toUpperCase()}`} />
                <Breadcrumb
                    items={[
                        { label: t("admin.dashboard.title"), to: `/${prefixAdmin}` },
                        { label: "Đơn hàng", to: `/${prefixAdmin}/order/list` },
                        { label: "Chỉnh sửa" }
                    ]}
                />
            </Box>

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 8 }}>
                    <Stack spacing={3}>
                        {/* Customer Section */}
                        <Card sx={{ p: 3, borderRadius: 'var(--shape-borderRadius-lg)', boxShadow: 'var(--customShadows-card)' }}>
                            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>Khách hàng</Typography>
                            <Autocomplete
                                options={users}
                                getOptionLabel={(option) => `${option.fullName} - ${option.phone}`}
                                loading={isLoadingUsers}
                                value={users.find((u: any) => u._id === selectedUser?._id) || selectedUser}
                                onChange={(_e, val) => setSelectedUser(val)}
                                disabled
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Chọn khách hàng"
                                        placeholder="Tìm theo tên hoặc số điện thoại..."
                                        InputProps={{
                                            ...params.InputProps,
                                            endAdornment: (
                                                <>
                                                    {isLoadingUsers ? <CircularProgress color="inherit" size={20} /> : null}
                                                    {params.InputProps.endAdornment}
                                                </>
                                            ),
                                        }}
                                    />
                                )}
                            />
                            {selectedUser && (
                                <Box sx={{ mt: 2, p: 2, bgcolor: 'var(--palette-background-neutral)', borderRadius: 1 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{selectedUser.fullName}</Typography>
                                    <Typography variant="body2" color="text.secondary">{selectedUser.phone}</Typography>
                                </Box>
                            )}
                        </Card>

                        {/* Ticket Section */}
                        <Card sx={{ p: 3, borderRadius: 'var(--shape-borderRadius-lg)', boxShadow: 'var(--customShadows-card)' }}>
                            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>Sản phẩm</Typography>
                            <Autocomplete
                                options={tickets as any[]}
                                getOptionLabel={(option) => option?.ticket || ""}
                                loading={isLoadingTickets}
                                onChange={(_e, val) => handleAddItem(val)}
                                value={null}
                                disabled
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Thêm sản phẩm"
                                        placeholder="Tìm sản phẩm..."
                                        InputProps={{
                                            ...params.InputProps,
                                            endAdornment: (
                                                <>
                                                    {isLoadingTickets ? <CircularProgress color="inherit" size={20} /> : null}
                                                    {params.InputProps.endAdornment}
                                                </>
                                            ),
                                        }}
                                    />
                                )}
                                renderOption={(props, option) => {
                                    if (!option) return null;
                                    return (
                                        <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Avatar src={option.image} variant="rounded" sx={{ width: 40, height: 40 }} />
                                            <Box>
                                                <Typography variant="subtitle2">{option.ticket}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(option.price)}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    );
                                }}
                            />

                            <TableContainer sx={{ mt: 3 }}>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Sản phẩm</TableCell>
                                            <TableCell align="right">Giá</TableCell>
                                            <TableCell align="center">Số lượng</TableCell>
                                            <TableCell align="right">Thành tiền</TableCell>
                                            <TableCell align="right"></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {items.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                                    Chưa có sản phẩm nào được chọn
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            items.map((item) => (
                                                <TableRow key={item.ticketId} sx={{ '&:last-child td': { border: 0 } }}>
                                                    <TableCell>
                                                        <Stack direction="row" spacing={2} alignItems="center">
                                                            <Avatar src={item.image} variant="rounded" sx={{ width: 48, height: 48 }} />
                                                            <Typography variant="subtitle2">{item.name}</Typography>
                                                        </Stack>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price)}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleUpdateQuantity(item.ticketId, item.quantity - 1)}
                                                                disabled
                                                            >
                                                                <Icon icon="eva:minus-fill" />
                                                            </IconButton>
                                                            <Typography variant="body2" sx={{ minWidth: 20, textAlign: 'center' }}>
                                                                {item.quantity}
                                                            </Typography>
                                                            <IconButton
                                                                size="small"
                                                                disabled
                                                                onClick={() => handleUpdateQuantity(item.ticketId, item.quantity + 1)}
                                                            >
                                                                <Icon icon="eva:plus-fill" />
                                                            </IconButton>
                                                        </Stack>
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price * item.quantity)}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <IconButton color="error" size="small" onClick={() => handleRemoveItem(item.ticketId)} disabled>
                                                            <Icon icon="eva:trash-2-outline" />
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Card>

                        <Card sx={{ p: 3, borderRadius: 'var(--shape-borderRadius-lg)', boxShadow: 'var(--customShadows-card)' }}>
                            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>Ghi chú</Typography>
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                placeholder="Nhập ghi chú đơn hàng..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </Card>
                    </Stack>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                    <Stack spacing={3}>
                        <Card sx={{ p: 3, borderRadius: 'var(--shape-borderRadius-lg)', boxShadow: 'var(--customShadows-card)' }}>
                            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>Tổng kết đơn hàng</Typography>
                            <Stack spacing={2}>
                                <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="body2" color="text.secondary">Tạm tính</Typography>
                                    <Typography variant="subtitle2">
                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(subTotal)}
                                    </Typography>
                                </Stack>
                                <Stack spacing={1}>
                                    <Typography variant="body2" color="text.secondary">Phí vận chuyển</Typography>
                                    <TextField
                                        size="small"
                                        type="number"
                                        value={shippingFee}
                                        onChange={(e) => setShippingFee(Number(e.target.value))}
                                        fullWidth
                                        disabled
                                    />
                                </Stack>
                                <Stack spacing={1}>
                                    <Typography variant="body2" color="text.secondary">Giảm giá</Typography>
                                    <TextField
                                        size="small"
                                        type="number"
                                        value={discount}
                                        onChange={(e) => setDiscount(Number(e.target.value))}
                                        fullWidth
                                        disabled
                                    />
                                </Stack>
                                <Divider sx={{ borderStyle: 'dashed', my: 1 }} />
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Tổng tiền</Typography>
                                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(total)}
                                    </Typography>
                                </Stack>
                            </Stack>
                        </Card>

                        <Card sx={{ p: 3, borderRadius: 'var(--shape-borderRadius-lg)', boxShadow: 'var(--customShadows-card)' }}>
                            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>Thanh toán</Typography>
                            <Stack spacing={2}>
                                {[
                                    { value: 'money', label: 'Tiền mặt', icon: 'solar:hand-money-bold' },
                                    { value: 'vnpay', label: 'VNPay', icon: 'logos:vnpay' },
                                    { value: 'zalopay', label: 'ZaloPay', icon: 'logos:zalopay' }
                                ].map((method) => (
                                    <Box
                                        key={method.value}
                                        onClick={() => setPaymentMethod(method.value)}
                                        sx={{
                                            p: 2,
                                            border: '1px solid',
                                            borderColor: paymentMethod === method.value ? 'primary.main' : 'var(--palette-background-neutral)',
                                            borderRadius: 1,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            bgcolor: paymentMethod === method.value ? alpha('#00A76F', 0.08) : 'transparent',
                                            transition: 'all 0.2s',
                                            '&:hover': { bgcolor: alpha('#00A76F', 0.04) }
                                        }}
                                    >
                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                            <Icon
                                                icon={method.icon}
                                                width={method.value === 'money' ? 24 : 32}
                                            />
                                            <Typography variant="subtitle2">{method.label}</Typography>
                                        </Stack>
                                        {paymentMethod === method.value && <Icon icon="eva:checkmark-circle-2-fill" color="#00A76F" width={20} />}
                                    </Box>
                                ))}
                            </Stack>
                        </Card>

                        <Card sx={{ p: 3, borderRadius: 'var(--shape-borderRadius-lg)', boxShadow: 'var(--customShadows-card)' }}>
                            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>Cập nhật trạng thái</Typography>
                            <Stack spacing={3}>
                                <FormControl fullWidth>
                                    <InputLabel>Trạng thái đơn hàng</InputLabel>
                                    <Select
                                        value={orderStatus}
                                        label="Trạng thái đơn hàng"
                                        onChange={(e) => setOrderStatus(e.target.value)}
                                        disabled={["completed", "cancelled"].includes(order?.orderStatus)}
                                    >
                                        <MenuItem value="pending">Chờ xác nhận</MenuItem>
                                        <MenuItem value="confirmed">Đã xác nhận</MenuItem>
                                        <MenuItem value="shipping">Đang giao</MenuItem>
                                        <MenuItem value="shipped">Đã giao hàng</MenuItem>
                                        <MenuItem value="completed">Giao thành công</MenuItem>
                                        <MenuItem value="cancelled">Hủy</MenuItem>
                                        <MenuItem value="returned">Trả hàng</MenuItem>
                                    </Select>
                                </FormControl>

                                <FormControl fullWidth>
                                    <InputLabel>Trạng thái thanh toán</InputLabel>
                                    <Select
                                        value={paymentStatus}
                                        label="Trạng thái thanh toán"
                                        onChange={(e) => setPaymentStatus(e.target.value)}
                                        disabled={order?.paymentStatus === "refunded"}
                                    >
                                        <MenuItem value="unpaid">Chưa thanh toán</MenuItem>
                                        <MenuItem value="paid">Đã thanh toán</MenuItem>
                                        {paymentMethod !== 'money' && <MenuItem value="refunded">Đã hoàn lại tiền</MenuItem>}
                                    </Select>
                                </FormControl>
                            </Stack>
                        </Card>

                        <LoadingButton
                            fullWidth
                            size="large"
                            variant="contained"
                            loading={isPending}
                            label="Cập nhật đơn hàng"
                            onClick={handleSubmit}
                            sx={{
                                py: 1.5,
                                fontWeight: 700,
                                fontSize: '1rem',
                            }}
                        />
                    </Stack>
                </Grid>
            </Grid>
        </Box>
    );
};
