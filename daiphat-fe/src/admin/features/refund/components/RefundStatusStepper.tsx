"use client";

import { Alert, Box, Typography } from '@mui/material';
import {
    RefundRequestRole,
    RefundRequestStatus,
} from '@/types/refund.type';

const CURRENT_DOT = '#FF3030';
const PAST_DOT = '#919EAB';
const LINE_COLOR = '#DFE3E8';

interface RefundStatusStepperProps {
    status: RefundRequestStatus;
    requestRole?: RefundRequestRole;
}

export function RefundStatusStepper({ status, requestRole }: RefundStatusStepperProps) {
    if (status === RefundRequestStatus.MANUAL_RESOLUTION) {
        return (
            <Alert severity="error" sx={{ borderRadius: '12px' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                    Cần xử lý thủ công
                </Typography>
                <Typography variant="body2">
                    Vui lòng mang CCCD đến quầy hỗ trợ hoặc liên hệ CSKH.
                </Typography>
            </Alert>
        );
    }

    const isStaffIncidentFlow =
        status === RefundRequestStatus.WAITING_FOR_INFO ||
        ((requestRole === RefundRequestRole.STAFF || requestRole === RefundRequestRole.ADMIN) &&
            (status === RefundRequestStatus.READY_TO_PAY ||
                status === RefundRequestStatus.PAID ||
                status === RefundRequestStatus.TRANSFERRED));

    const steps = isStaffIncidentFlow
        ? [
              { key: RefundRequestStatus.WAITING_FOR_INFO, label: 'Chờ thông tin STK' },
              { key: RefundRequestStatus.READY_TO_PAY, label: 'Chờ chuyển khoản' },
              { key: RefundRequestStatus.PAID, label: 'Đã chuyển khoản' },
          ]
        : [
              { key: RefundRequestStatus.READY_TO_PAY, label: 'Chờ chuyển khoản' },
              { key: RefundRequestStatus.PAID, label: 'Đã chuyển khoản' },
          ];

    const getStepIndex = (currentStatus: RefundRequestStatus) => {
        if (isStaffIncidentFlow) {
            if (currentStatus === RefundRequestStatus.WAITING_FOR_INFO) return 0;
            if (
                currentStatus === RefundRequestStatus.READY_TO_PAY ||
                currentStatus === RefundRequestStatus.APPROVED
            ) {
                return 1;
            }
            if (
                currentStatus === RefundRequestStatus.PAID ||
                currentStatus === RefundRequestStatus.TRANSFERRED
            ) {
                return 2;
            }
            return 0;
        }
        if (
            currentStatus === RefundRequestStatus.READY_TO_PAY ||
            currentStatus === RefundRequestStatus.APPROVED
        ) {
            return 0;
        }
        if (
            currentStatus === RefundRequestStatus.PAID ||
            currentStatus === RefundRequestStatus.TRANSFERRED
        ) {
            return 1;
        }
        return 0;
    };

    const currentIndex = getStepIndex(status);

    return (
        <Box sx={{ position: 'relative', maxWidth: 720, mx: 'auto', px: { xs: 0, sm: 2 } }}>
            <Box
                aria-hidden
                sx={{
                    position: 'absolute',
                    top: 5,
                    left: { xs: '12%', sm: '10%' },
                    right: { xs: '12%', sm: '10%' },
                    height: '2px',
                    bgcolor: LINE_COLOR,
                    zIndex: 0,
                }}
            />
            <Box
                aria-hidden
                sx={{
                    position: 'absolute',
                    top: 5,
                    left: { xs: '12%', sm: '10%' },
                    width: `calc((100% - 24%) * ${currentIndex / Math.max(steps.length - 1, 1)})`,
                    height: '2px',
                    bgcolor: CURRENT_DOT,
                    zIndex: 0,
                    transition: 'width 0.4s ease',
                    display: steps.length > 1 ? 'block' : 'none',
                }}
            />

            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    position: 'relative',
                    zIndex: 1,
                    gap: 1,
                }}
            >
                {steps.map((step, index) => {
                    const isCurrent = index === currentIndex;
                    const isPast = index < currentIndex;

                    return (
                        <Box
                            key={step.key}
                            sx={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 1.25,
                                minWidth: 0,
                                px: 0.5,
                            }}
                        >
                            <Box
                                sx={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: '50%',
                                    bgcolor: isCurrent ? CURRENT_DOT : isPast ? PAST_DOT : 'transparent',
                                    border: isCurrent || isPast ? 'none' : `2px solid ${PAST_DOT}`,
                                    boxShadow: isCurrent ? '0 0 0 4px rgba(255,48,48,0.16)' : 'none',
                                    flexShrink: 0,
                                }}
                            />
                            <Typography
                                variant="body2"
                                sx={{
                                    fontWeight: isCurrent ? 700 : 500,
                                    color: isCurrent || isPast ? 'text.primary' : 'text.secondary',
                                    textAlign: 'center',
                                    fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                                    lineHeight: 1.35,
                                }}
                            >
                                {step.label}
                            </Typography>
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
}
