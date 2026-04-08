import React, { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { toast } from 'react-toastify';
import { Button, Typography, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { prefixAdmin } from '../constants/routes';

export const OverrunAlerter = () => {
    const socket = useSocket();
    const navigate = useNavigate();

    useEffect(() => {
        if (!socket) return;

        socket.on('overrun-alert', (data) => {
            console.log('Received overrun alert:', data);

            toast.error(
                ({ closeToast }) => (
                    <Stack spacing={1}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {data.message}
                        </Typography>
                        <Typography variant="caption">
                            Ca: {data.ticketServiceOrderCode} | Vui lòng xử lý ngay!
                        </Typography>
                        <Stack direction="row" spacing={1}>
                            <Button
                                size="small"
                                variant="contained"
                                color="error"
                                onClick={() => {
                                    navigate(`/${prefixAdmin}/ticketServiceOrder/edit/${data.ticketServiceOrderId}`);
                                    closeToast?.();
                                }}
                            >
                                Xử lý ngay
                            </Button>
                        </Stack>
                    </Stack>
                ),
                {
                    position: "top-right",
                    autoClose: false, // Để admin phải chú ý
                    closeOnClick: false,
                    draggable: false,
                }
            );
        });

        return () => {
            socket.off('overrun-alert');
        };
    }, [socket, navigate]);

    return null; // Component tàng hình
};
