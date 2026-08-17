import { Avatar, Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface ChatThreadBubbleProps {
    align: 'left' | 'right';
    name?: string;
    time?: string;
    avatarLetter?: string;
    children?: ReactNode;
    below?: ReactNode;
}

export const ChatThreadBubble = ({
    align,
    name,
    time,
    avatarLetter,
    children,
    below,
}: ChatThreadBubbleProps) => {
    const isMine = align === 'right';
    const meta = [name, time].filter(Boolean).join(', ');
    const hasText =
        typeof children === 'string' ? children.trim().length > 0 : Boolean(children);

    return (
        <Box
            sx={{
                display: 'flex',
                width: '100%',
                justifyContent: isMine ? 'flex-end' : 'flex-start',
                alignItems: 'flex-start',
                gap: 1.25,
            }}
        >
            {!isMine && (
                <Avatar
                    sx={{
                        width: 32,
                        height: 32,
                        mt: '22px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        bgcolor: '#E9ECEE',
                        color: '#637381',
                        flexShrink: 0,
                    }}
                >
                    {avatarLetter || '?'}
                </Avatar>
            )}
            <Box
                sx={{
                    maxWidth: '78%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMine ? 'flex-end' : 'flex-start',
                    minWidth: 0,
                }}
            >
                {meta ? (
                    <Typography
                        component="span"
                        sx={{
                            fontSize: '0.75rem',
                            color: '#919EAB',
                            mb: 0.75,
                            px: 0.25,
                            lineHeight: 1.4,
                        }}
                    >
                        {meta}
                    </Typography>
                ) : null}
                {hasText ? (
                    <Box
                        sx={{
                            px: 2,
                            py: 1.25,
                            borderRadius: '12px',
                            bgcolor: isMine ? '#FFE9D5' : '#F4F6F8',
                            color: '#1C252E',
                            width: 'fit-content',
                            maxWidth: '100%',
                        }}
                    >
                        {typeof children === 'string' ? (
                            <Typography
                                component="p"
                                sx={{
                                    m: 0,
                                    fontSize: '0.875rem',
                                    lineHeight: 1.6,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                }}
                            >
                                {children}
                            </Typography>
                        ) : (
                            children
                        )}
                    </Box>
                ) : null}
                {below ? (
                    <Box sx={{ mt: hasText ? 1 : 0, width: 'fit-content', maxWidth: '100%' }}>{below}</Box>
                ) : null}
            </Box>
        </Box>
    );
};
