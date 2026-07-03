import React, { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { toast } from 'react-toastify';
import { Button, Typography, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { prefixAdmin } from '../constants/routes';
import { OverrunAlertSocketEvent } from '../../types/websocket.type';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { useQueryClient } from '@tanstack/react-query';
import { WS_USER_OVERRUN_ALERTS_QUEUE } from '../../services/websocket/websocket.constants';

export const OverrunAlerter = () => {
    const socket = useSocket();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        socket.subscribe<OverrunAlertSocketEvent>(WS_USER_OVERRUN_ALERTS_QUEUE, (data) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_NOTIFICATIONS] });

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
                    position: 'top-right',
                    autoClose: false,
                    closeOnClick: false,
                    draggable: false,
                }
            );
        }).then((subscription) => {
            unsubscribe = () => subscription.unsubscribe();
        }).catch(() => undefined);

        return () => {
            unsubscribe?.();
        };
    }, [navigate, queryClient, socket]);

    return null;
};
