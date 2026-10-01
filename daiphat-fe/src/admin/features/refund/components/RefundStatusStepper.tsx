"use client";

import { Box, Chip, Stack, Typography } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import HourglassEmptyRoundedIcon from '@mui/icons-material/HourglassEmptyRounded';
import PaymentRoundedIcon from '@mui/icons-material/PaymentRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded';
import {
    RefundRequestRole,
    RefundRequestStatus,
} from '@/types/refund.type';

interface RefundStatusStepperProps {
    status: RefundRequestStatus;
    requestRole?: RefundRequestRole;
    counterPayoutMethod?: string | null;
}

export function RefundStatusStepper({
    status,
    requestRole,
    counterPayoutMethod,
}: RefundStatusStepperProps) {
    const isCompleted =
        status === RefundRequestStatus.PAID ||
        status === RefundRequestStatus.TRANSFERRED;

    const isCounterFlow =
        status === RefundRequestStatus.MANUAL_RESOLUTION ||
        Boolean(counterPayoutMethod);

    const isStaffIncidentFlow =
        status === RefundRequestStatus.WAITING_FOR_INFO ||
        ((requestRole === RefundRequestRole.STAFF ||
            requestRole === RefundRequestRole.ADMIN ||
            requestRole === RefundRequestRole.SYSTEM) &&
            (status === RefundRequestStatus.READY_TO_PAY || isCompleted));

    // Steps configuration
    const steps = isCounterFlow
        ? [
              {
                  key: 'RECEIVED',
                  label: 'Tiếp nhận yêu cầu',
                  description: 'Ghi nhận thông tin hoàn tiền',
              },
              {
                  key: RefundRequestStatus.MANUAL_RESOLUTION,
                  label: 'Xử lý tại quầy',
                  description: 'Đọc và đối chiếu CCCD',
              },
              {
                  key: RefundRequestStatus.PAID,
                  label: 'Hoàn tất chi trả',
                  description:
                      counterPayoutMethod === 'CASH'
                          ? 'Đã chi trả tiền mặt tại quầy'
                          : counterPayoutMethod === 'TRANSFER' || counterPayoutMethod === 'BANK_TRANSFER'
                            ? 'Đã chuyển khoản tại quầy'
                            : 'Đã hoàn tất chi trả',
              },
          ]
        : isStaffIncidentFlow
          ? [
                {
                    key: RefundRequestStatus.WAITING_FOR_INFO,
                    label: 'Cung cấp STK',
                    description: 'Khách hàng nhập tài khoản',
                },
                {
                    key: RefundRequestStatus.READY_TO_PAY,
                    label: 'Chờ chuyển khoản',
                    description: 'Kiểm tra thông tin nhận tiền',
                },
                {
                    key: RefundRequestStatus.PAID,
                    label: 'Đã chuyển khoản',
                    description: 'Hoàn tất chuyển tiền ngân hàng',
                },
            ]
          : [
                {
                    key: 'RECEIVED',
                    label: 'Tiếp nhận yêu cầu',
                    description: 'Khởi tạo & kiểm tra đơn hàng',
                },
                {
                    key: RefundRequestStatus.READY_TO_PAY,
                    label: 'Chờ chuyển khoản',
                    description: 'Thông tin tài khoản hợp lệ',
                },
                {
                    key: RefundRequestStatus.PAID,
                    label: 'Đã chuyển khoản',
                    description: 'Hoàn tất chuyển tiền ngân hàng',
                },
            ];

    // Determine current active step index
    const getActiveStepIndex = () => {
        if (isCompleted) return steps.length - 1;

        if (isCounterFlow) {
            if (status === RefundRequestStatus.MANUAL_RESOLUTION) return 1;
            return 0;
        }

        if (isStaffIncidentFlow) {
            if (status === RefundRequestStatus.WAITING_FOR_INFO) return 0;
            if (
                status === RefundRequestStatus.READY_TO_PAY ||
                status === RefundRequestStatus.APPROVED
            ) {
                return 1;
            }
            return 0;
        }

        if (
            status === RefundRequestStatus.READY_TO_PAY ||
            status === RefundRequestStatus.APPROVED
        ) {
            return 1;
        }
        return 0;
    };

    const activeIndex = getActiveStepIndex();

    // Mathematically aligned progress line between node centers (16.667% to 83.333%)
    const progressPercent = isCompleted
        ? 100
        : Math.round((activeIndex / Math.max(steps.length - 1, 1)) * 100);

    return (
        <Box sx={{ width: '100%' }}>
            {/* Header: Title, Description & Status Badge */}
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                spacing={1.5}
                sx={{ mb: 3.5 }}
            >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '10px',
                            bgcolor: isCompleted
                                ? '#ecfdf5'
                                : status === RefundRequestStatus.MANUAL_RESOLUTION
                                  ? '#fffbeb'
                                  : '#eff6ff',
                            color: isCompleted
                                ? '#059669'
                                : status === RefundRequestStatus.MANUAL_RESOLUTION
                                  ? '#d97706'
                                  : '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <TimelineRoundedIcon sx={{ fontSize: 24 }} />
                    </Box>
                    <Box>
                        <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }}
                        >
                            Tiến trình hoàn tiền
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {isCounterFlow
                                ? 'Quy trình xử lý hoàn tiền trực tiếp tại quầy giao dịch'
                                : 'Quy trình xử lý chuyển khoản hoàn tiền trực tuyến'}
                        </Typography>
                    </Box>
                </Stack>

                {/* Status indicator tag */}
                {isCompleted ? (
                    <Chip
                        icon={
                            <CheckCircleRoundedIcon
                                sx={{ fontSize: '16px !important', color: '#059669 !important' }}
                            />
                        }
                        label={
                            isCounterFlow
                                ? counterPayoutMethod === 'CASH'
                                    ? 'Đã chi tiền mặt tại quầy'
                                    : 'Đã hoàn tiền tại quầy'
                                : 'Đã hoàn tất (3/3 bước)'
                        }
                        size="small"
                        sx={{
                            bgcolor: '#ecfdf5',
                            color: '#065f46',
                            border: '1px solid #a7f3d0',
                            fontWeight: 700,
                            height: 28,
                            px: 0.5,
                        }}
                    />
                ) : status === RefundRequestStatus.MANUAL_RESOLUTION ? (
                    <Chip
                        icon={
                            <WarningAmberRoundedIcon
                                sx={{ fontSize: '16px !important', color: '#d97706 !important' }}
                            />
                        }
                        label="Cần xử lý tại quầy (Bước 2/3)"
                        size="small"
                        sx={{
                            bgcolor: '#fffbeb',
                            color: '#92400e',
                            border: '1px solid #fde68a',
                            fontWeight: 700,
                            height: 28,
                            px: 0.5,
                        }}
                    />
                ) : status === RefundRequestStatus.WAITING_FOR_INFO ? (
                    <Chip
                        icon={
                            <HourglassEmptyRoundedIcon
                                sx={{ fontSize: '16px !important', color: '#d97706 !important' }}
                            />
                        }
                        label="Chờ thông tin STK (Bước 1/3)"
                        size="small"
                        sx={{
                            bgcolor: '#fef3c7',
                            color: '#92400e',
                            border: '1px solid #fde68a',
                            fontWeight: 700,
                            height: 28,
                            px: 0.5,
                        }}
                    />
                ) : (
                    <Chip
                        icon={
                            <PaymentRoundedIcon
                                sx={{ fontSize: '16px !important', color: '#2563eb !important' }}
                            />
                        }
                        label="Chờ chuyển khoản (Bước 2/3)"
                        size="small"
                        sx={{
                            bgcolor: '#eff6ff',
                            color: '#1e40af',
                            border: '1px solid #bfdbfe',
                            fontWeight: 700,
                            height: 28,
                            px: 0.5,
                        }}
                    />
                )}
            </Stack>

            {/* Stepper Timeline Visual */}
            <Box sx={{ position: 'relative', px: { xs: 0.5, sm: 2 }, py: 1, mb: 3 }}>
                {/* Background Connecting Track Line */}
                <Box
                    aria-hidden
                    sx={{
                        position: 'absolute',
                        top: 28, // Center of 40px circle (20px) + py 1 (8px)
                        left: '16.666%',
                        right: '16.666%',
                        height: 3,
                        bgcolor: '#e2e8f0',
                        borderRadius: '3px',
                        zIndex: 0,
                    }}
                />

                {/* Progress Active Line (Emerald Green) */}
                <Box
                    aria-hidden
                    sx={{
                        position: 'absolute',
                        top: 28,
                        left: '16.666%',
                        width: `calc(66.668% * ${progressPercent / 100})`,
                        height: 3,
                        bgcolor: '#10b981',
                        borderRadius: '3px',
                        zIndex: 0,
                        transition: 'width 0.4s ease',
                    }}
                />

                {/* Step Nodes */}
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        position: 'relative',
                        zIndex: 1,
                    }}
                >
                    {steps.map((step, index) => {
                        const isStepDone = isCompleted ? true : index < activeIndex;
                        const isStepActive = !isCompleted && index === activeIndex;
                        const isStepUpcoming = !isCompleted && index > activeIndex;

                        return (
                            <Box
                                key={step.key}
                                sx={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    textAlign: 'center',
                                    px: 0.5,
                                }}
                            >
                                {/* Circle Node Icon */}
                                <Box
                                    sx={{
                                        width: { xs: 36, sm: 40 },
                                        height: { xs: 36, sm: 40 },
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        transition: 'all 0.25s ease',
                                        ...(isStepDone && {
                                            bgcolor: '#10b981',
                                            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)',
                                            border: 'none',
                                        }),
                                        ...(isStepActive && {
                                            bgcolor:
                                                status === RefundRequestStatus.MANUAL_RESOLUTION
                                                    ? '#f59e0b'
                                                    : status === RefundRequestStatus.WAITING_FOR_INFO
                                                      ? '#3b82f6'
                                                      : '#2563eb',
                                            boxShadow:
                                                status === RefundRequestStatus.MANUAL_RESOLUTION
                                                    ? '0 0 0 5px rgba(245, 158, 11, 0.2)'
                                                    : '0 0 0 5px rgba(37, 99, 235, 0.2)',
                                            border: 'none',
                                        }),
                                        ...(isStepUpcoming && {
                                            bgcolor: '#f8fafc',
                                            border: '2px solid #cbd5e1',
                                            boxShadow: 'none',
                                        }),
                                    }}
                                >
                                    {isStepDone ? (
                                        <CheckRoundedIcon sx={{ fontSize: 22, color: '#ffffff' }} />
                                    ) : isStepActive ? (
                                        status === RefundRequestStatus.MANUAL_RESOLUTION ? (
                                            <StorefrontRoundedIcon
                                                sx={{ fontSize: 20, color: '#ffffff' }}
                                            />
                                        ) : status === RefundRequestStatus.WAITING_FOR_INFO ? (
                                            <HourglassEmptyRoundedIcon
                                                sx={{ fontSize: 20, color: '#ffffff' }}
                                            />
                                        ) : (
                                            <PaymentRoundedIcon
                                                sx={{ fontSize: 20, color: '#ffffff' }}
                                            />
                                        )
                                    ) : (
                                        <Typography
                                            sx={{
                                                fontSize: '0.875rem',
                                                fontWeight: 700,
                                                color: '#94a3b8',
                                            }}
                                        >
                                            {index + 1}
                                        </Typography>
                                    )}
                                </Box>

                                {/* Step Label */}
                                <Typography
                                    variant="subtitle2"
                                    sx={{
                                        fontWeight: isStepActive ? 700 : isStepDone ? 600 : 500,
                                        color: isStepActive
                                            ? status === RefundRequestStatus.MANUAL_RESOLUTION
                                                ? '#b45309'
                                                : '#1d4ed8'
                                            : isStepDone
                                              ? 'text.primary'
                                              : 'text.secondary',
                                        fontSize: { xs: '0.78125rem', sm: '0.875rem' },
                                        lineHeight: 1.35,
                                        mt: 1.25,
                                    }}
                                >
                                    {step.label}
                                </Typography>

                                {/* Step Subtitle */}
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: isStepUpcoming ? 'text.disabled' : 'text.secondary',
                                        fontSize: { xs: '0.6875rem', sm: '0.75rem' },
                                        lineHeight: 1.3,
                                        mt: 0.35,
                                        maxWidth: { xs: 110, sm: 160 },
                                        display: { xs: 'none', sm: 'block' },
                                    }}
                                >
                                    {step.description}
                                </Typography>
                            </Box>
                        );
                    })}
                </Box>
            </Box>

            {/* Operational Guidance & Status Banner */}
            {isCompleted && isCounterFlow && (
                <Box
                    sx={{
                        p: { xs: 2, sm: 2.5 },
                        borderRadius: '12px',
                        bgcolor: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderLeft: '4px solid #10b981',
                    }}
                >
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={2}
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                    >
                        <Box
                            sx={{
                                width: 44,
                                height: 44,
                                borderRadius: '12px',
                                bgcolor: '#dcfce7',
                                color: '#16a34a',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <CheckCircleRoundedIcon sx={{ fontSize: 26 }} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Stack
                                direction="row"
                                alignItems="center"
                                spacing={1}
                                flexWrap="wrap"
                                sx={{ mb: 0.5 }}
                            >
                                <Typography
                                    variant="subtitle2"
                                    sx={{
                                        fontWeight: 700,
                                        color: '#14532d',
                                        fontSize: '0.9375rem',
                                    }}
                                >
                                    Đã hoàn tất hoàn tiền tại quầy giao dịch
                                </Typography>
                                <Chip
                                    label={
                                        counterPayoutMethod === 'CASH'
                                            ? 'Tiền mặt tại quầy'
                                            : 'Chuyển khoản tại quầy'
                                    }
                                    size="small"
                                    sx={{
                                        height: 22,
                                        fontSize: '0.71875rem',
                                        fontWeight: 700,
                                        bgcolor: '#dcfce7',
                                        color: '#15803d',
                                        border: '1px solid #86efac',
                                    }}
                                />
                            </Stack>
                            <Typography variant="body2" sx={{ color: '#166534', lineHeight: 1.6 }}>
                                Yêu cầu hoàn tiền đã được nhân viên đọc thông tin CCCD, đối chiếu với khách hàng và hoàn tất chi trả thành công{' '}
                                {counterPayoutMethod === 'CASH'
                                    ? 'bằng hình thức tiền mặt tại quầy giao dịch.'
                                    : 'bằng hình thức chuyển khoản trực tiếp tại quầy giao dịch.'}{' '}
                                Giao dịch đã được lưu hồ sơ và kết thúc chu trình xử lý.
                            </Typography>
                        </Box>
                    </Stack>
                </Box>
            )}

            {isCompleted && !isCounterFlow && (
                <Box
                    sx={{
                        p: { xs: 2, sm: 2.5 },
                        borderRadius: '12px',
                        bgcolor: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderLeft: '4px solid #10b981',
                    }}
                >
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={2}
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                    >
                        <Box
                            sx={{
                                width: 44,
                                height: 44,
                                borderRadius: '12px',
                                bgcolor: '#dcfce7',
                                color: '#16a34a',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <CheckCircleRoundedIcon sx={{ fontSize: 26 }} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Stack
                                direction="row"
                                alignItems="center"
                                spacing={1}
                                flexWrap="wrap"
                                sx={{ mb: 0.5 }}
                            >
                                <Typography
                                    variant="subtitle2"
                                    sx={{
                                        fontWeight: 700,
                                        color: '#14532d',
                                        fontSize: '0.9375rem',
                                    }}
                                >
                                    Đã chuyển khoản hoàn tiền thành công
                                </Typography>
                                <Chip
                                    label="Chuyển khoản trực tuyến"
                                    size="small"
                                    sx={{
                                        height: 22,
                                        fontSize: '0.71875rem',
                                        fontWeight: 700,
                                        bgcolor: '#dcfce7',
                                        color: '#15803d',
                                        border: '1px solid #86efac',
                                    }}
                                />
                            </Stack>
                            <Typography variant="body2" sx={{ color: '#166534', lineHeight: 1.6 }}>
                                Khoản tiền hoàn đã được thực hiện chuyển khoản thành công tới tài khoản ngân hàng của khách hàng kèm chứng từ ủy nhiệm chi.
                            </Typography>
                        </Box>
                    </Stack>
                </Box>
            )}

            {status === RefundRequestStatus.MANUAL_RESOLUTION && (
                <Box
                    sx={{
                        p: { xs: 2, sm: 2.5 },
                        borderRadius: '12px',
                        bgcolor: '#fffbeb',
                        border: '1px solid #fde68a',
                        borderLeft: '4px solid #f59e0b',
                    }}
                >
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={2}
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                    >
                        <Box
                            sx={{
                                width: 44,
                                height: 44,
                                borderRadius: '12px',
                                bgcolor: '#fef3c7',
                                color: '#d97706',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <StorefrontRoundedIcon sx={{ fontSize: 26 }} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Stack
                                direction="row"
                                alignItems="center"
                                spacing={1}
                                flexWrap="wrap"
                                sx={{ mb: 0.5 }}
                            >
                                <Typography
                                    variant="subtitle2"
                                    sx={{
                                        fontWeight: 700,
                                        color: '#92400e',
                                        fontSize: '0.9375rem',
                                    }}
                                >
                                    Yêu cầu cần xử lý hoàn tiền trực tiếp tại quầy
                                </Typography>
                                <Chip
                                    label="Thao tác tại quầy"
                                    size="small"
                                    sx={{
                                        height: 22,
                                        fontSize: '0.71875rem',
                                        fontWeight: 700,
                                        bgcolor: '#fef3c7',
                                        color: '#b45309',
                                        border: '1px solid #fde68a',
                                    }}
                                />
                            </Stack>
                            <Typography variant="body2" sx={{ color: '#a16207', lineHeight: 1.6 }}>
                                Yêu cầu hoàn tiền đã chuyển sang diện xử lý thủ công tại quầy (khách hàng không cập nhật STK hoặc yêu cầu hỗ trợ trực tiếp). Nhân viên vui lòng kiểm tra đối chiếu CCCD bản gốc của khách hàng, sau đó bấm nút{' '}
                                <strong>&ldquo;Xử lý hoàn tiền tại quầy&rdquo;</strong> ở góc trên bên phải để chụp/tải ảnh CCCD, đọc thông tin và hoàn tất chi trả bằng tiền mặt hoặc chuyển khoản.
                            </Typography>
                        </Box>
                    </Stack>
                </Box>
            )}

            {status === RefundRequestStatus.WAITING_FOR_INFO && (
                <Box
                    sx={{
                        p: { xs: 2, sm: 2.5 },
                        borderRadius: '12px',
                        bgcolor: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        borderLeft: '4px solid #3b82f6',
                    }}
                >
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={2}
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                    >
                        <Box
                            sx={{
                                width: 44,
                                height: 44,
                                borderRadius: '12px',
                                bgcolor: '#dbeafe',
                                color: '#2563eb',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <HourglassEmptyRoundedIcon sx={{ fontSize: 26 }} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography
                                variant="subtitle2"
                                sx={{
                                    fontWeight: 700,
                                    color: '#1e40af',
                                    fontSize: '0.9375rem',
                                    mb: 0.5,
                                }}
                            >
                                Đang chờ khách hàng cung cấp số tài khoản ngân hàng
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#1d4ed8', lineHeight: 1.6 }}>
                                Hệ thống đang chờ khách hàng cung cấp hoặc cập nhật lại thông tin tài khoản ngân hàng nhận tiền hoàn. Nhân viên có thể theo dõi tiến độ hoặc liên hệ hỗ trợ khách hàng nếu cần.
                            </Typography>
                        </Box>
                    </Stack>
                </Box>
            )}

            {(status === RefundRequestStatus.READY_TO_PAY ||
                status === RefundRequestStatus.APPROVED) && (
                <Box
                    sx={{
                        p: { xs: 2, sm: 2.5 },
                        borderRadius: '12px',
                        bgcolor: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        borderLeft: '4px solid #2563eb',
                    }}
                >
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={2}
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                    >
                        <Box
                            sx={{
                                width: 44,
                                height: 44,
                                borderRadius: '12px',
                                bgcolor: '#dbeafe',
                                color: '#2563eb',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <PaymentRoundedIcon sx={{ fontSize: 26 }} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography
                                variant="subtitle2"
                                sx={{
                                    fontWeight: 700,
                                    color: '#1e40af',
                                    fontSize: '0.9375rem',
                                    mb: 0.5,
                                }}
                            >
                                Sẵn sàng thực hiện chuyển khoản hoàn tiền
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#1d4ed8', lineHeight: 1.6 }}>
                                Thông tin tài khoản ngân hàng của khách hàng đã sẵn sàng. Nhân viên vui lòng kiểm tra thông tin và bấm nút{' '}
                                <strong>&ldquo;Xác nhận chuyển khoản&rdquo;</strong> ở góc trên bên phải để quét mã VietQR và tải ảnh chứng từ ủy nhiệm chi.
                            </Typography>
                        </Box>
                    </Stack>
                </Box>
            )}
        </Box>
    );
}
