"use client";

import type { ReactNode } from 'react';
import { Box, Grid, Stack, Typography } from '@mui/material';
import { Icon } from '@/admin/components/ui/AdminIcon';

export interface CccdOcrFields {
    name?: ReactNode;
    idNumber?: ReactNode;
    dob?: ReactNode;
    gender?: ReactNode;
    nationality?: ReactNode;
    issueDate?: ReactNode;
    expiryDate?: ReactNode;
    placeOfBirth?: ReactNode;
    placeOfResidence?: ReactNode;
}

export function OcrFieldTile({
    label,
    value,
    icon,
    mono,
}: {
    label: string;
    value?: ReactNode;
    icon?: string;
    mono?: boolean;
}) {
    return (
        <Box
            sx={{
                p: 1.5,
                borderRadius: '10px',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.neutral',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
            }}
        >
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.5 }}>
                {icon && (
                    <Box sx={{ color: 'text.disabled', display: 'flex', fontSize: '0.95rem' }}>
                        <Icon icon={icon} />
                    </Box>
                )}
                <Typography
                    variant="caption"
                    sx={{
                        color: 'text.secondary',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        fontSize: '0.7rem',
                        letterSpacing: '0.04em',
                    }}
                >
                    {label}
                </Typography>
            </Stack>
            <Typography
                variant="subtitle2"
                sx={{
                    fontWeight: 700,
                    color: value ? 'text.primary' : 'text.disabled',
                    fontFamily: mono ? 'monospace' : undefined,
                    wordBreak: 'break-word',
                    fontSize: '0.875rem',
                }}
            >
                {value || '—'}
            </Typography>
        </Box>
    );
}

/** The nine CCCD fields returned by OCR, laid out as on the prize payout detail page. */
export function CccdOcrFieldsGrid({
    fields,
    nameLabel = 'Họ và tên',
    sx,
}: {
    fields: CccdOcrFields;
    nameLabel?: string;
    sx?: object;
}) {
    return (
        <Grid container spacing={1.5} sx={sx}>
            <Grid size={{ xs: 12, sm: 6 }}>
                <OcrFieldTile label={nameLabel} value={fields.name} icon="solar:user-bold-duotone" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
                <OcrFieldTile label="Số CCCD / CMND" value={fields.idNumber} icon="solar:card-2-bold-duotone" mono />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
                <OcrFieldTile label="Ngày sinh" value={fields.dob} icon="solar:calendar-bold-duotone" />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
                <OcrFieldTile
                    label="Giới tính"
                    value={fields.gender}
                    icon="solar:users-group-two-rounded-bold-duotone"
                />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
                <OcrFieldTile label="Quốc tịch" value={fields.nationality} icon="solar:flag-bold-duotone" />
            </Grid>
            <Grid size={{ xs: 6, sm: 6 }}>
                <OcrFieldTile label="Ngày cấp" value={fields.issueDate} icon="solar:calendar-date-bold-duotone" />
            </Grid>
            <Grid size={{ xs: 6, sm: 6 }}>
                <OcrFieldTile label="Ngày hết hạn" value={fields.expiryDate} icon="solar:clock-circle-bold-duotone" />
            </Grid>
            <Grid size={{ xs: 12 }}>
                <OcrFieldTile
                    label="Quê quán / Nơi đăng ký khai sinh"
                    value={fields.placeOfBirth}
                    icon="solar:map-point-bold-duotone"
                />
            </Grid>
            <Grid size={{ xs: 12 }}>
                <OcrFieldTile label="Nơi thường trú" value={fields.placeOfResidence} icon="solar:home-bold-duotone" />
            </Grid>
        </Grid>
    );
}
