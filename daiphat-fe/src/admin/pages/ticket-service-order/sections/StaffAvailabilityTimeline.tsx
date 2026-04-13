import React, { useMemo } from 'react';
import { Box, Typography, Stack, Tooltip, Avatar, alpha, Skeleton } from '@mui/material';
import dayjs, { Dayjs } from 'dayjs';
import { useSchedules } from '../../hr/hooks/useSchedules';
import { useTicketServiceOrders } from '../hooks/useTicketServiceOrderManagement';
import { Icon } from '@iconify/react';
import { useStaffByTicketService } from '../../account-admin/hooks/useAccountAdmin';

interface StaffAvailabilityTimelineProps {
    date: Dayjs;
    ticketServiceId?: string;
    staffList?: any[];
    selectionStart?: Dayjs;
    selectionEnd?: Dayjs;
    selectedStaffIds?: string[];
    onlyShowSelected?: boolean;
    currentTicketServiceOrderId?: string;
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 8); // 8:00 to 23:00

export const StaffAvailabilityTimeline: React.FC<StaffAvailabilityTimelineProps> = ({
    date,
    ticketServiceId,
    staffList: propStaffList,
    selectionStart,
    selectionEnd,
    selectedStaffIds = [],
    onlyShowSelected = false,
    currentTicketServiceOrderId
}) => {
    const isToday = date.isSame(dayjs(), 'day');
    const currentTimePos = useMemo(() => {
        if (!isToday) return null;
        const now = dayjs();
        const start = 8;
        const end = 23;
        const currentHour = now.hour() + now.minute() / 60;
        if (currentHour < start || currentHour > end) return null;
        return ((currentHour - start) / (end - start)) * 100;
    }, [isToday]);

    // Fetch all schedules for this date
    const { data: schedulesResBody, isLoading: isLoadingSchedules } = useSchedules({
        date: date.format('YYYY-MM-DD')
    });
    const schedules = React.useMemo(() => {
        if (!schedulesResBody) return [];
        const data = schedulesResBody;
        if (Array.isArray(data.data?.recordList)) return data.data.recordList;
        if (Array.isArray(data.recordList)) return data.recordList;
        if (Array.isArray(data.data)) return data.data;
        if (Array.isArray(data)) return data;
        return [];
    }, [schedulesResBody]);

    // Fetch all ticketServiceOrders for this date
    const { data: ticketServiceOrdersResBody, isLoading: isLoadingTicketServiceOrders } = useTicketServiceOrders({
        date: date.format('YYYY-MM-DD')
    });
    const ticketServiceOrders = React.useMemo(() => {
        if (!ticketServiceOrdersResBody) return [];
        const data = ticketServiceOrdersResBody;
        if (Array.isArray(data.data?.recordList)) return data.data.recordList;
        if (Array.isArray(data.recordList)) return data.recordList;
        if (Array.isArray(data.data)) return data.data;
        if (Array.isArray(data)) return data;
        return [];
    }, [ticketServiceOrdersResBody]);

    // Fetch staff for this ticketService (only used if propStaffList is not provided)
    const { data: fetchedStaffBody, isLoading: isLoadingStaff } = useStaffByTicketService(propStaffList ? undefined : ticketServiceId);
    const capableStaff = React.useMemo(() => {
        if (propStaffList) return propStaffList;
        if (!fetchedStaffBody) return [];
        const data = fetchedStaffBody;
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.data?.recordList)) return data.data.recordList;
        if (Array.isArray(data.recordList)) return data.recordList;
        if (Array.isArray(data.data)) return data.data;
        return [];
    }, [propStaffList, fetchedStaffBody]);

    const staffData = useMemo(() => {
        const map = new Map();

        // 1. If we have a list of capable staff, start with them
        if (capableStaff.length > 0) {
            capableStaff.forEach((staff: any) => {
                map.set(staff._id, {
                    info: staff,
                    schedules: [],
                    ticketServiceOrders: []
                });
            });
        }

        // 2. Add schedules
        schedules.forEach((s: any) => {
            const staffId = s.staffId?._id;
            if (!staffId) return;

            // If we have a restricted list (ticketServiceId was provided) and this staff isn't in it, skip
            if (ticketServiceId && !map.has(staffId)) return;

            if (!map.has(staffId)) {
                map.set(staffId, {
                    info: s.staffId,
                    schedules: [],
                    ticketServiceOrders: []
                });
            }
            map.get(staffId).schedules.push(s);
        });

        // 3. Add ticketServiceOrders
        ticketServiceOrders.forEach((b: any) => {
            if (currentTicketServiceOrderId && b._id === currentTicketServiceOrderId) return;

            const assignedStaffIds = (b.staffIds && b.staffIds.length > 0)
                ? b.staffIds
                : (b.staffId?._id ? [b.staffId._id] : []);

            assignedStaffIds.forEach((sId: any) => {
                const staffId = typeof sId === 'object' ? sId?._id : sId;
                if (!staffId) return;

                // If we have a restricted list and this staff isn't in it, skip
                if (ticketServiceId && !map.has(staffId)) return;

                if (!map.has(staffId)) {
                    map.set(staffId, {
                        info: typeof sId === 'object' ? sId : b.staffId,
                        schedules: [],
                        ticketServiceOrders: []
                    });
                }
                map.get(staffId).ticketServiceOrders.push(b);
            });
        });

        const allStaff = Array.from(map.values())
            .filter(s => s.info && s.info.fullName)
            .sort((a, b) => (a.info.fullName || '').localeCompare(b.info.fullName || ''));

        if (onlyShowSelected && selectedStaffIds.length > 0) {
            return allStaff.filter(s => selectedStaffIds.includes(s.info._id));
        }

        return allStaff;
    }, [schedules, ticketServiceOrders, capableStaff, selectedStaffIds, onlyShowSelected, currentTicketServiceOrderId]);

    if (isLoadingSchedules || isLoadingTicketServiceOrders || isLoadingStaff) {
        return (
            <Stack spacing={2} sx={{ mt: 2 }}>
                {[1, 2, 3].map(i => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Skeleton variant="circular" width={32} height={32} />
                        <Skeleton variant="rounded" width="100%" height={32} sx={{ borderRadius: "var(--shape-borderRadius)" }} />
                    </Box>
                ))}
            </Stack>
        );
    }

    if (staffData.length === 0) {
        return (
            <Box sx={{
                p: 4,
                mt: 2,
                textAlign: 'center',
                bgcolor: 'rgba(145, 158, 171, 0.04)',
                borderRadius: "var(--shape-borderRadius-lg)",
                border: '1px dashed',
                borderColor: 'rgba(145, 158, 171, 0.20)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1.5
            }}>
                <Icon icon="solar:calendar-slash-bold-duotone" width={48} color={'rgba(145, 158, 171, 0.50)'} />
                <Typography variant="body2" sx={{ color: 'var(--palette-text-secondary)', fontWeight: 500 }}>
                    Kh�ng c� nh�n vi�n th?c hi?n nhi?m v? trong ng�y n�y
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{
            mt: 2,
            p: 2,
            bgcolor: "var(--palette-background-paper)",
            borderRadius: "var(--shape-borderRadius-lg)",
            border: '1px solid',
            borderColor: 'rgba(145, 158, 171, 0.12)',
            boxShadow: '0 4px 12px 0 rgba(145, 158, 171, 0.08)',
            overflow: 'hidden'
        }}>
            <Box sx={{ overflowX: 'auto' }}>
                <Box sx={{ minWidth: 800, position: 'relative' }}>
                    {/* Header: Hours */}
                    <Box sx={{
                        display: 'flex',
                        borderBottom: '1px solid',
                        borderColor: 'rgba(145, 158, 171, 0.10)',
                        pb: 1.5,
                        mb: 2
                    }}>
                        <Box sx={{ width: 180, flexShrink: 0 }}>
                            <Typography variant="overline" sx={{ color: 'var(--palette-text-disabled)', fontWeight: 700 }}>Nh�n vi�n</Typography>
                        </Box>
                        {HOURS.map(hour => (
                            <Box key={hour} sx={{ flex: 1, textAlign: 'center' }}>
                                <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--palette-text-secondary)' }}>
                                    {hour}:00
                                </Typography>
                            </Box>
                        ))}
                    </Box>

                    {/* Timeline Data Container */}
                    <Stack spacing={2.5}>
                        {staffData.map((staff: any) => (
                            <Box key={staff.info._id} sx={{ display: 'flex', alignItems: 'center' }}>
                                {/* Staff Info Column */}
                                <Box sx={{ width: 180, pr: 2, flexShrink: 0 }}>
                                    <Stack direction="row" spacing={1.5} alignItems="center">
                                        <Box sx={{ position: 'relative' }}>
                                            <Avatar src={staff.info.avatar} sx={{ width: 32, height: 32, border: '2px solid #fff', boxShadow: '0 0 0 1px var(--palette-text-disabled)33' }} />
                                            {staff.schedules.length > 0 && (
                                                <Box sx={{
                                                    position: 'absolute', bottom: -2, right: -2,
                                                    width: 10, height: 10, bgcolor: 'var(--palette-primary-main)',
                                                    borderRadius: '50%', border: '2px solid #fff'
                                                }} />
                                            )}
                                        </Box>
                                        <Typography noWrap sx={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--palette-text-primary)' }}>
                                            {staff.info.fullName}
                                        </Typography>
                                    </Stack>
                                </Box>

                                {/* Timeline Track */}
                                <Box sx={{
                                    flex: (HOURS.length - 1),
                                    position: 'relative',
                                    height: 36,
                                    bgcolor: 'rgba(145, 158, 171, 0.04)',
                                    borderRadius: '10px',
                                    transition: 'all 0.2s',
                                    '&:hover': { bgcolor: 'rgba(145, 158, 171, 0.08)' }
                                }}>
                                    {/* Hour vertical dividers */}
                                    {HOURS.map((_, idx) => (
                                        <Box
                                            key={idx}
                                            sx={{
                                                position: 'absolute',
                                                left: `${(idx / (HOURS.length - 1)) * 100}%`,
                                                height: '100%',
                                                width: '1px',
                                                bgcolor: 'rgba(145, 158, 171, 0.08)'
                                            }}
                                        />
                                    ))}

                                    {/* Current Time Indicator */}
                                    {currentTimePos !== null && (
                                        <Box sx={{
                                            position: 'absolute', left: `${currentTimePos}%`,
                                            top: -4, bottom: -4, width: '2px',
                                            bgcolor: 'var(--palette-error-main)', zIndex: 20,
                                            '&::before': {
                                                content: '""', position: 'absolute', top: -2, left: -3,
                                                width: 8, height: 8, bgcolor: 'var(--palette-error-main)', borderRadius: '50%'
                                            }
                                        }} />
                                    )}

                                    {/* Work Schedules (Shifts) */}
                                    {staff.schedules.map((s: any) => {
                                        if (!s.shiftId) return null;
                                        const [startH, startM] = s.shiftId.startTime.split(':').map(Number);
                                        const [endH, endM] = s.shiftId.endTime.split(':').map(Number);

                                        const left = Math.max(0, ((startH + startM / 60 - 8) / (HOURS.length - 1)) * 100);
                                        const right = Math.min(100, ((endH + endM / 60 - 8) / (HOURS.length - 1)) * 100);
                                        const width = right - left;

                                        if (width <= 0) return null;

                                        return (
                                            <Tooltip key={s._id} title={`Ca l�m vi?c: ${s.shiftId.name} (${s.shiftId.startTime} - ${s.shiftId.endTime})`}>
                                                <Box
                                                    sx={{
                                                        position: 'absolute',
                                                        top: 0, bottom: 0,
                                                        left: `${left}%`, width: `${width}%`,
                                                        bgcolor: 'rgba(0, 167, 111, 0.08)',
                                                        border: '1px solid',
                                                        borderColor: 'rgba(0, 167, 111, 0.20)',
                                                        borderRadius: "var(--shape-borderRadius)",
                                                        zIndex: 1
                                                    }}
                                                />
                                            </Tooltip>
                                        );
                                    })}

                                    {/* Existing TicketServiceOrders */}
                                    {staff.ticketServiceOrders.map((b: any) => {
                                        const start = dayjs(b.actualStart || b.start);
                                        const end = dayjs(b.completedAt || b.expectedFinish || b.end);
                                        const startH = start.hour() + start.minute() / 60;
                                        const endH = end.hour() + end.minute() / 60;

                                        const left = Math.max(0, ((startH - 8) / (HOURS.length - 1)) * 100);
                                        const right = Math.min(100, ((endH - 8) / (HOURS.length - 1)) * 100);
                                        const width = right - left;

                                        if (width <= 0) return null;

                                        return (
                                            <Tooltip key={b._id} arrow title={
                                                <Box sx={{ p: 0.5 }}>
                                                    <Typography variant="caption" sx={{ display: 'block', fontWeight: 700 }}>
                                                        {b.ticketServiceId?.name || 'Dịch vụ'} {b.isOverrun && "(QUÁ GIỜ)"}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ display: 'block', opacity: 0.8 }}>{start.format('HH:mm')} - {end.format('HH:mm')}</Typography>
                                                </Box>
                                            }>
                                                <Box
                                                    sx={{
                                                        position: 'absolute',
                                                        top: 6, bottom: 6,
                                                        left: `${left}%`, width: `${width}%`,
                                                        background: b.isOverrun
                                                            ? 'linear-gradient(135deg, var(--palette-error-main) 0%, #B71D18 100%)'
                                                            : 'linear-gradient(135deg, var(--palette-primary-main) 0%, #008559 100%)',
                                                        borderRadius: "var(--shape-borderRadius-sm)",
                                                        boxShadow: b.isOverrun
                                                            ? '0 4px 8px rgba(255, 86, 48, 0.24)'
                                                            : '0 4px 8px rgba(0, 167, 111, 0.24)',
                                                        zIndex: b.isOverrun ? 10 : 5,
                                                        cursor: 'pointer',
                                                        transition: 'transform 0.1s',
                                                        '&:hover': { transform: 'scaleY(1.1)', zIndex: 12 },
                                                        animation: b.isOverrun ? 'pulse-red 2s infinite' : 'none',
                                                        '@keyframes pulse-red': {
                                                            '0%': { opacity: 0.9 },
                                                            '50%': { opacity: 1 },
                                                            '100%': { opacity: 0.9 }
                                                        }
                                                    }}
                                                />
                                            </Tooltip>
                                        );
                                    })}

                                    {/* New TicketServiceOrder Preview (Selection) */}
                                    {selectionStart && selectionEnd && (
                                        (() => {
                                            const startH = selectionStart.hour() + selectionStart.minute() / 60;
                                            const endH = selectionEnd.hour() + selectionEnd.minute() / 60;

                                            const left = Math.max(0, ((startH - 8) / (HOURS.length - 1)) * 100);
                                            const right = Math.min(100, ((endH - 8) / (HOURS.length - 1)) * 100);
                                            const width = right - left;

                                            if (width <= 0) return null;

                                            const isSelectedStaff = selectedStaffIds.includes(staff.info._id);

                                            return (
                                                <Box
                                                    sx={{
                                                        position: 'absolute',
                                                        top: isSelectedStaff ? -2 : 4,
                                                        bottom: isSelectedStaff ? -2 : 4,
                                                        left: `${left}%`, width: `${width}%`,
                                                        border: isSelectedStaff ? '2px solid #FFAB00' : '2px dashed var(--palette-text-disabled)',
                                                        bgcolor: isSelectedStaff ? alpha('#FFAB00', 0.15) : 'transparent',
                                                        borderRadius: "var(--shape-borderRadius)",
                                                        zIndex: 15,
                                                        pointerEvents: 'none',
                                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        animation: isSelectedStaff ? 'pulse 2s infinite' : 'none',
                                                        '@keyframes pulse': {
                                                            '0%': { boxShadow: '0 0 0 0 rgba(255, 171, 0, 0.4)' },
                                                            '70%': { boxShadow: '0 0 0 8px rgba(255, 171, 0, 0)' },
                                                            '100%': { boxShadow: '0 0 0 0 rgba(255, 171, 0, 0)' },
                                                        },
                                                        '&::after': isSelectedStaff ? {
                                                            content: '"Đang chọn"',
                                                            position: 'absolute',
                                                            top: -20, left: '50%', transform: 'translateX(-50%)',
                                                            fontSize: '0.625rem', fontWeight: 800, color: '#FFAB00',
                                                            whiteSpace: 'nowrap', textTransform: 'uppercase'
                                                        } : {}
                                                    }}
                                                />
                                            );
                                        })()
                                    )}
                                </Box>
                            </Box>
                        ))}
                    </Stack>
                </Box>
            </Box>

            {/* Premium Legend */}
            <Box sx={{
                mt: 3,
                pt: 2.5,
                borderTop: '1px solid',
                borderColor: 'rgba(145, 158, 171, 0.10)',
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2
            }}>
                <Box sx={{
                    display: 'flex', alignItems: 'center', gap: 1,
                    px: 1.5, py: 0.75, bgcolor: 'rgba(0, 167, 111, 0.08)',
                    borderRadius: "var(--shape-borderRadius)", border: '1px solid', borderColor: 'rgba(0, 167, 111, 0.10)'
                }}>
                    <Box sx={{ width: 10, height: 10, bgcolor: 'rgba(0, 167, 111, 0.20)', border: '1px solid', borderColor: 'var(--palette-primary-main)', borderRadius: '3px' }} />
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--palette-primary-main)' }}>Ca trực dự kiến</Typography>
                </Box>

                <Box sx={{
                    display: 'flex', alignItems: 'center', gap: 1,
                    px: 1.5, py: 0.75, bgcolor: 'rgba(0, 167, 111, 0.15)',
                    borderRadius: "var(--shape-borderRadius)", border: '1px solid', borderColor: 'rgba(0, 167, 111, 0.10)',
                    background: 'linear-gradient(135deg, rgba(0, 167, 111, 0.1) 0%, rgba(0, 133, 89, 0.1) 100%)'
                }}>
                    <Box sx={{ width: 10, height: 10, background: 'linear-gradient(135deg, var(--palette-primary-main) 0%, #008559 100%)', borderRadius: '3px' }} />
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#008559' }}>Lịch đã chiếm chỗ</Typography>
                </Box>

                <Box sx={{
                    display: 'flex', alignItems: 'center', gap: 1,
                    px: 1.5, py: 0.75, bgcolor: 'rgba(255, 86, 48, 0.08)',
                    borderRadius: "var(--shape-borderRadius)", border: '1px solid', borderColor: 'rgba(255, 86, 48, 0.10)'
                }}>
                    <Box sx={{ width: 10, height: 10, background: 'linear-gradient(135deg, var(--palette-error-main) 0%, #B71D18 100%)', borderRadius: '3px' }} />
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--palette-error-main)' }}>Dịch vụ đang quá giờ</Typography>
                </Box>

                <Box sx={{
                    display: 'flex', alignItems: 'center', gap: 1,
                    px: 1.5, py: 0.75, bgcolor: 'rgba(145, 158, 171, 0.08)',
                    borderRadius: "var(--shape-borderRadius)", border: '1px dashed', borderColor: 'rgba(145, 158, 171, 0.30)'
                }}>
                    <Box sx={{ width: 10, height: 10, border: '2px dashed var(--palette-text-disabled)', borderRadius: '3px' }} />
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--palette-text-secondary)' }}>Giờ bạn đang chọn</Typography>
                </Box>

                {isToday && (
                    <Box sx={{
                        display: 'flex', alignItems: 'center', gap: 1,
                        px: 1.5, py: 0.75, bgcolor: 'rgba(255, 86, 48, 0.08)',
                        borderRadius: "var(--shape-borderRadius)", border: '1px solid', borderColor: 'rgba(255, 86, 48, 0.10)'
                    }}>
                        <Box sx={{ width: 10, height: 2, bgcolor: 'var(--palette-error-main)', borderRadius: '1px' }} />
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--palette-error-main)' }}>Hiện tại</Typography>
                    </Box>
                )}
            </Box>
        </Box>
    );
};




