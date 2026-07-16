import { useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Stack,
    MenuItem,
    Typography,
    Box,
    IconButton,
    Divider
} from "@mui/material";
import { Icon } from "@iconify/react";
import { useCreateUser } from "../../../features/users/hooks/useUsers";
import { useCreateUserTicket } from "../../../features/users/hooks/useUserTicket";
import { toast } from "react-toastify";
import { COLORS } from "../../role/configs/constants";
import { useAuthStore } from "../../../../stores/useAuthStore";

interface QuickCustomerDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: (userId: string, ticketIds: string[]) => void;
}

export const QuickCustomerDialog = ({ open, onClose, onSuccess }: QuickCustomerDialogProps) => {
    const { user } = useAuthStore();
    const { mutate: createUser, isPending: isCreatingUser } = useCreateUser();
    const { mutate: createTicket, isPending: isCreatingTicket } = useCreateUserTicket();

    const [customerData, setCustomerData] = useState({
        fullName: "",
        phone: "",
        email: "",
        password: "password123"
    });

    const [tickets, setTickets] = useState([{
        name: "",
        type: "XSMN" as "XSMN" | "XSMB" | "XSMT",
        ticketSubtype: "",
        quantity: "1",
    }]);

    const handleAddTicket = () => {
        setTickets([...tickets, {
            name: "",
            type: "XSMN",
            ticketSubtype: "",
            quantity: "1",
        }]);
    };

    const handleRemoveTicket = (index: number) => {
        setTickets(tickets.filter((_, i) => i !== index));
    };

    const handleTicketChange = (index: number, field: string, value: any) => {
        const newTickets = [...tickets];
        newTickets[index] = { ...newTickets[index], [field]: value };
        setTickets(newTickets);
    };

    const handleSubmit = async () => {
        if (!customerData.fullName || !customerData.phone) {
            toast.error("Vui lòng nhập họ tên và số điện thoại");
            return;
        }

        if (tickets.some(p => !p.name || !p.type)) {
            toast.error("Vui lòng nhập tên và chọn vùng miền cho tất cả vé số");
            return;
        }

        // Tách fullName thành firstName và lastName để phù hợp với backend mới
        const nameParts = customerData.fullName.trim().split(/\s+/);
        const lastName = nameParts[0] || "";
        const firstName = nameParts.slice(1).join(" ") || "";

        // Create user first
        createUser({ 
            ...customerData, 
            firstName, 
            lastName,
            createdBy: user?.id 
        }, {
            onSuccess: (userRes: any) => {
                const userId = userRes.data.id || userRes.data._id;
                const createdTicketIds: string[] = [];
                let ticketsCreated = 0;

                // Create all tickets
                tickets.forEach((ticket) => {
                    createTicket({
                        ...ticket,
                        quantity: parseInt(ticket.quantity || "1"),
                        userId
                    }, {
                        onSuccess: (ticketRes: any) => {
                            createdTicketIds.push(ticketRes.data._id);
                            ticketsCreated++;

                            if (ticketsCreated === tickets.length) {
                                toast.success("Tạo khách hàng và vé số thành công!");
                                onSuccess(userId, createdTicketIds);
                                handleClose();
                            }
                        },
                        onError: () => {
                            toast.error(`Lỗi khi tạo vé số ${ticket.name}`);
                        }
                    });
                });
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.message || "Lỗi khi tạo khách hàng");
            }
        });
    };

    const handleClose = () => {
        setCustomerData({
            fullName: "",
            phone: "",
            email: "",
            password: "password123"
        });
        setTickets([{
            name: "",
            type: "XSMN",
            ticketSubtype: "",
            quantity: "1",
        }]);
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: "var(--shape-borderRadius-lg)",
                    boxShadow: "var(--customShadows-card)"
                }
            }}
        >
            <DialogTitle sx={{
                pb: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px dashed rgba(145, 158, 171, 0.2)'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Icon icon="solar:user-plus-bold-duotone" width={28} color={COLORS.primary} />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Tạo khách hàng mới
                    </Typography>
                </Box>
                <IconButton onClick={handleClose} size="small">
                    <Icon icon="eva:close-fill" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 3 }}>
                <Stack spacing={3}>
                    {/* Customer Info */}
                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: COLORS.primary }}>
                            Thông tin khách hàng
                        </Typography>
                        <Stack spacing={2}>
                            <TextField
                                label="Họ và tên *"
                                fullWidth
                                value={customerData.fullName}
                                onChange={(e) => setCustomerData({ ...customerData, fullName: e.target.value })}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: "var(--shape-borderRadius)" } }}
                            />
                            <Stack direction="row" spacing={2}>
                                <TextField
                                    label="Số điện thoại *"
                                    fullWidth
                                    value={customerData.phone}
                                    onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: "var(--shape-borderRadius)" } }}
                                />
                                <TextField
                                    label="Email (tùy chọn)"
                                    fullWidth
                                    value={customerData.email}
                                    onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: "var(--shape-borderRadius)" } }}
                                />
                            </Stack>
                        </Stack>
                    </Box>

                    <Divider sx={{ borderStyle: 'dashed' }} />

                    {/* Tickets Info */}
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: COLORS.primary }}>
                                Vé số
                            </Typography>
                            <Button
                                size="small"
                                startIcon={<Icon icon="eva:plus-fill" />}
                                onClick={handleAddTicket}
                                sx={{
                                    textTransform: 'none',
                                    borderRadius: "var(--shape-borderRadius)",
                                    fontWeight: 600
                                }}
                            >
                                Thêm vé số
                            </Button>
                        </Box>

                        <Stack spacing={2}>
                            {tickets.map((ticket, index) => (
                                <Box
                                    key={index}
                                    sx={{
                                        p: 2,
                                        bgcolor: 'rgba(145, 158, 171, 0.04)',
                                        borderRadius: "var(--shape-borderRadius-md)",
                                        border: '1px solid rgba(145, 158, 171, 0.12)'
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--palette-text-secondary)' }}>
                                            Vé số #{index + 1}
                                        </Typography>
                                        {tickets.length > 1 && (
                                            <IconButton
                                                size="small"
                                                onClick={() => handleRemoveTicket(index)}
                                                sx={{ color: 'error.main' }}
                                            >
                                                <Icon icon="eva:trash-2-fill" width={18} />
                                            </IconButton>
                                        )}
                                    </Box>
                                    <Stack spacing={2}>
                                        <Stack direction="row" spacing={2}>
                                            <TextField
                                                label="Tên *"
                                                fullWidth
                                                value={ticket.name}
                                                onChange={(e) => handleTicketChange(index, 'name', e.target.value)}
                                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: "var(--shape-borderRadius)", bgcolor: "var(--palette-background-paper)" } }}
                                            />
                                            <TextField
                                                label="Loại"
                                                select
                                                fullWidth
                                                value={ticket.type}
                                                onChange={(e) => handleTicketChange(index, 'type', e.target.value)}
                                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: "var(--shape-borderRadius)", bgcolor: "var(--palette-background-paper)" } }}
                                            >
                                                <MenuItem value="XSMN">Miền Nam</MenuItem>
                                                <MenuItem value="XSMB">Miền Bắc</MenuItem>
                                                <MenuItem value="XSMT">Miền Trung</MenuItem>
                                            </TextField>
                                        </Stack>
                                        <Stack direction="row" spacing={2}>
                                            <TextField
                                                label="Đài/Tỉnh"
                                                fullWidth
                                                value={ticket.ticketSubtype}
                                                onChange={(e) => handleTicketChange(index, 'ticketSubtype', e.target.value)}
                                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: "var(--shape-borderRadius)", bgcolor: "var(--palette-background-paper)" } }}
                                            />
                                            <TextField
                                                label="Số lượng *"
                                                fullWidth
                                                type="number"
                                                value={ticket.quantity}
                                                onChange={(e) => handleTicketChange(index, 'quantity', e.target.value)}
                                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: "var(--shape-borderRadius)", bgcolor: "var(--palette-background-paper)" } }}
                                            />
                                        </Stack>
                                    </Stack>
                                </Box>
                            ))}
                        </Stack>
                    </Box>
                </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 3, pt: 2, borderTop: '1px dashed rgba(145, 158, 171, 0.2)' }}>
                <Button
                    onClick={handleClose}
                    sx={{
                        borderRadius: "var(--shape-borderRadius)",
                        textTransform: 'none',
                        fontWeight: 600,
                        color: 'var(--palette-text-secondary)'
                    }}
                >
                    Hủy
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={isCreatingUser || isCreatingTicket}
                    sx={{
                        bgcolor: COLORS.primary,
                        borderRadius: "var(--shape-borderRadius)",
                        textTransform: 'none',
                        fontWeight: 700,
                        px: 3,
                        '&:hover': { bgcolor: "var(--palette-grey-700)" }
                    }}
                >
                    {isCreatingUser || isCreatingTicket ? "Đang tạo..." : "Tạo khách hàng"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};




