import {
    Box,
    Typography,
    Avatar,
    Stack,
    Divider,
    IconButton,
    Chip,
    Button,
} from '@mui/material';
import { Icon } from '@iconify/react';
import { Participant } from '../types/chat';

interface ChatDetailsProps {
    participant?: Participant;
}

export const ChatDetails = ({ participant }: ChatDetailsProps) => {
    if (!participant) return null;

    return (
        <Box
            sx={{
                width: 280,
                borderLeft: '1px solid var(--palette-divider)',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: 'var(--palette-background-paper)',
                flexShrink: 0,
            }}
        >
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Avatar
                    src={participant.avatar}
                    sx={{ width: 96, height: 96, mx: 'auto', mb: 2, fontSize: '2rem', fontWeight: 800 }}
                >
                    {participant.fullName?.[0]}
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {participant.fullName}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Customer since 2024
                </Typography>
                <Stack direction="row" spacing={1} justifyContent="center">
                    <IconButton size="small" sx={{ bgcolor: 'var(--palette-background-neutral)' }}>
                        <Icon icon="solar:phone-bold" width={20} />
                    </IconButton>
                    <IconButton size="small" sx={{ bgcolor: 'var(--palette-background-neutral)' }}>
                        <Icon icon="solar:letter-bold" width={20} />
                    </IconButton>
                    <IconButton size="small" sx={{ bgcolor: 'var(--palette-background-neutral)' }}>
                        <Icon icon="solar:videocamera-record-bold" width={20} />
                    </IconButton>
                </Stack>
            </Box>

            <Divider />

            <Box sx={{ p: 3 }}>
                <Typography variant="overline" sx={{ color: 'text.disabled', mb: 2, display: 'block' }}>
                    Personal Information
                </Typography>
                <Stack spacing={2}>
                    <Stack direction="row" spacing={1.5}>
                        <Icon icon="solar:smartphone-bold" width={20} color="var(--palette-text-disabled)" />
                        <Typography variant="body2">{participant.phone || 'N/A'}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1.5}>
                        <Icon icon="solar:letter-bold" width={20} color="var(--palette-text-disabled)" />
                        <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{participant.email || 'N/A'}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1.5}>
                        <Icon icon="solar:map-point-bold" width={20} color="var(--palette-text-disabled)" />
                        <Typography variant="body2">Ho Chi Minh City, VN</Typography>
                    </Stack>
                </Stack>
            </Box>

            <Divider />

            <Box sx={{ p: 3, flexGrow: 1, overflowY: 'auto' }}>
                <Typography variant="overline" sx={{ color: 'text.disabled', mb: 2, display: 'block' }}>
                    Recent Activity (Lottery)
                </Typography>
                <Stack spacing={2}>
                    <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'var(--palette-background-neutral)' }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                            Ticket #XSMB-9982
                        </Typography>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="caption" color="text.secondary">2 hours ago</Typography>
                            <Chip label="Processing" size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
                        </Stack>
                    </Box>
                    <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'var(--palette-background-neutral)' }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                            Service: VIP Consulting
                        </Typography>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="caption" color="text.secondary">Yesterday</Typography>
                            <Chip label="Completed" color="success" size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
                        </Stack>
                    </Box>
                </Stack>
            </Box>

            <Box sx={{ p: 2 }}>
                <Button fullWidth variant="outlined" color="error" startIcon={<Icon icon="solar:forbidden-circle-bold" />}>
                    Block Customer
                </Button>
            </Box>
        </Box>
    );
};
