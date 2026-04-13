import React, { useState, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import Button from "@mui/material/Button";
import AddIcon from '@mui/icons-material/Add';
import {
    CalendarViewAgendaIcon,
    CalendarViewDayIcon,
    CalendarViewMonthIcon,
    CalendarViewWeekIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    CalendarFilterIcon,
    DeleteIcon,
    CloseIcon
} from '../../assets/icons';
import { CalendarFiltersDrawer } from './sections/CalendarFiltersDrawer';
import { CalendarEventDialog } from './sections/CalendarEventDialog';
import { useCreateTicketServiceOrder, useTicketServiceOrders } from './hooks/useTicketServiceOrder';
import { useSettingGeneral } from '../settings/hooks/useSettings';
import { toast } from 'react-toastify';

import { Title } from "../../components/ui/Title";
import {
    Badge,
    Box,
    Card,
    IconButton,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
    alpha
} from "@mui/material";
import dayjs from 'dayjs';
import 'dayjs/locale/vi';

dayjs.locale('vi');

const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
};

export const CalendarPage = () => {
    const calendarRef = useRef<FullCalendar>(null);
    const [view, setView] = useState('dayGridMonth');
    const [date, setDate] = useState(new Date('2026-02-04'));
    const [openFilters, setOpenFilters] = useState(false);
    const [openEventDialog, setOpenEventDialog] = useState(false);
    const [events, setEvents] = useState<any[]>([]);

    // Fetch ticketServiceOrders and settings
    const ticketServiceOrdersRes = useTicketServiceOrders({ noLimit: true });
    const { data: settingsData } = useSettingGeneral();
    const { mutate: createTicketServiceOrder } = useCreateTicketServiceOrder();

    const ticketServiceOrders = React.useMemo(() => {
        const data = (ticketServiceOrdersRes.data as any);
        if (!data) return [];
        return Array.isArray(data.recordList)
            ? data.recordList
            : (Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []));
    }, [ticketServiceOrdersRes.data]);

    // Convert ticketServiceOrders to calendar events
    useEffect(() => {
        if (ticketServiceOrders && settingsData) {
            const ticketServiceColorsMap: Record<string, string> = {};
            settingsData.ticketServiceColors?.forEach((sc: any) => {
                ticketServiceColorsMap[sc.ticketServiceId] = sc.color;
            });

            const statusColors: Record<string, string> = {
                pending: '#FFAB00',   // Orange
                confirmed: '#00B8D9', // Blue
                'in-progress': '#006C9C', // Dark Blue
                completed: 'var(--palette-primary-main)', // Green
                cancelled: 'var(--palette-error-main)', // Red
            };

            const calendarEvents = ticketServiceOrders.map((ticketServiceOrder: any) => {
                const ticketServiceColor = ticketServiceColorsMap[ticketServiceOrder.ticketServiceId?._id || ticketServiceOrder.ticketServiceId] || 'var(--palette-primary-main)';
                const statusColor = statusColors[ticketServiceOrder.ticketServiceOrderStatus] || 'var(--palette-text-disabled)';

                // Use start/end dates from ticketServiceOrder
                const start = ticketServiceOrder.start;
                const end = ticketServiceOrder.end;

                const staffName = ticketServiceOrder.staffId?.fullName ? ` (${ticketServiceOrder.staffId.fullName})` : '';

                return {
                    id: ticketServiceOrder._id,
                    title: `${ticketServiceOrder.ticketServiceId?.name || 'Dịch vụ'} - ${ticketServiceOrder.userId?.fullName || 'Khách lẻ'}${staffName}`,
                    start: start,
                    end: end,
                    color: statusColor,
                    textcolor: "var(--palette-common-white)",
                    extendedProps: {
                        ticketServiceOrderId: ticketServiceOrder._id,
                        status: ticketServiceOrder.ticketServiceOrderStatus,
                        ticketServiceName: ticketServiceOrder.ticketServiceId?.name,
                        ticketServiceColor: ticketServiceColor,
                        customerName: ticketServiceOrder.userId?.fullName,
                        staffName: ticketServiceOrder.staffId?.fullName,
                        notes: ticketServiceOrder.notes,
                    }
                };
            });
            setEvents(calendarEvents);
        }
    }, [ticketServiceOrders, settingsData]);

    const handleOpenFilters = () => setOpenFilters(true);
    const handleCloseFilters = () => setOpenFilters(false);

    const handleOpenEventDialog = () => setOpenEventDialog(true);
    const handleCloseEventDialog = () => setOpenEventDialog(false);

    const handleSaveEvent = (newEvent: any) => {
        createTicketServiceOrder(newEvent, {
            onSuccess: () => {
                toast.success('Tạo lịch đặt thành công!');
                setOpenEventDialog(false);
            },
            onError: () => {
                toast.error('Có lỗi xảy ra khi tạo lịch đặt!');
            }
        });
    };

    const handleViewChange = (
        _event: React.MouseEvent<HTMLElement>,
        newView: string | null,
    ) => {
        if (newView !== null) {
            setView(newView);
            const calendarApi = calendarRef.current?.getApi();
            if (calendarApi) {
                calendarApi.changeView(newView);
            }
        }
    };

    const handleToday = () => {
        const calendarApi = calendarRef.current?.getApi();
        if (calendarApi) {
            calendarApi.today();
            setDate(calendarApi.getDate());
        }
    };

    const handlePrev = () => {
        const calendarApi = calendarRef.current?.getApi();
        if (calendarApi) {
            calendarApi.prev();
            setDate(calendarApi.getDate());
        }
    };

    const handleNext = () => {
        const calendarApi = calendarRef.current?.getApi();
        if (calendarApi) {
            calendarApi.next();
            setDate(calendarApi.getDate());
        }
    };

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Lịch" />
                </div>
                <Button
                    onClick={handleOpenEventDialog}
                    sx={{
                        background: 'var(--palette-text-primary)',
                        minHeight: "2.25rem",
                        minWidth: "4rem",
                        fontWeight: 700,
                        fontSize: "0.875rem",
                        padding: "6px 12px",
                        borderRadius: "var(--shape-borderRadius)",
                        textTransform: "none",
                        boxShadow: "none",
                        "&:hover": {
                            background: "var(--palette-grey-700)",
                            boxShadow: "var(--customShadows-z8)"
                        }
                    }}
                    variant="contained"
                    startIcon={<AddIcon />}
                >
                    Thêm sự kiện
                </Button>
            </div>

            <Typography variant="body2" sx={{ fontWeight: 400, fontSize: '0.875rem', display: "block", mb: "10px" }}>
                <Box component="span" sx={{ color: 'var(--palette-text-primary)', fontWeight: 600 }}>{events.length}</Box>{' '}
                <Box component="span" sx={{ color: 'var(--palette-text-secondary)', fontWeight: 400 }}>kết quả tìm thấy</Box>
            </Typography>
            <Box sx={{ mb: 3, display: "flex", flexWrap: 'wrap', gap: 1.5 }}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        p: '8px',
                        borderRadius: "var(--shape-borderRadius)",
                        border: '1px solid var(--palette-text-disabled)33',
                    }}
                >
                    <Typography variant="subtitle2" sx={{ fontSize: '0.875rem', color: 'var(--palette-text-primary)', fontWeight: 600 }}>
                        Ngày:
                    </Typography>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            px: '8px',
                            py: 0,
                            borderRadius: "var(--shape-borderRadius-sm)",
                            bgcolor: 'rgba(145, 158, 171, 0.16)',
                        }}
                    >
                        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500 }}>03 - 26 Tháng 2 2026</Typography>
                        <IconButton
                            size="small"
                            sx={{
                                p: 0.25,
                                ml: "5px",
                                opacity: 0.48,
                                bgcolor: "var(--palette-text-primary)",
                                color: "var(--palette-common-white)",
                                mr: "-3px",
                                '&:hover': {
                                    opacity: 1,
                                    bgcolor: 'var(--palette-text-primary)'
                                }
                            }}
                        >
                            <CloseIcon sx={{ fontSize: 8 }} />
                        </IconButton>
                    </Box>
                </Box>

                <Button
                    startIcon={<DeleteIcon style={{ marginRight: 0 }} sx={{ fontSize: 18 }} />}
                    sx={{
                        color: 'var(--palette-error-main)',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        textTransform: 'none',
                        '&:hover': { bgcolor: 'rgba(255, 86, 48, 0.08)' }
                    }}
                >
                    Xoá
                </Button>
            </Box>

            <Card
                elevation={0}
                sx={{
                    bgcolor: "var(--palette-background-paper)",
                    backgroundImage: 'none',
                    borderRadius: "var(--shape-borderRadius-lg)",
                    boxShadow: "var(--customShadows-card)",
                    color: "var(--palette-text-primary)",
                    mx: '-10px',
                    '& .fc': {
                        flex: '1 1 auto',
                        marginLeft: '-1px',
                        marginBottom: '-1px',
                        width: 'calc(100% + 2px)',
                        fontSize: '1rem',
                        '--fc-border-color': 'rgba(145, 158, 171, 0.2)',
                        '--fc-page-bg-color': '#fff',
                        '--fc-neutral-bg-color': 'var(--palette-background-neutral)',
                        '--fc-neutral-text-color': 'var(--palette-text-secondary)',
                        '--fc-button-text-color': '#fff',
                        '--fc-button-bg-color': 'var(--palette-primary-main)',
                        '--fc-button-border-color': 'var(--palette-primary-main)',
                        '--fc-button-hover-bg-color': '#007B55',
                        '--fc-button-hover-border-color': '#007B55',
                        '--fc-button-active-bg-color': '#005249',
                        '--fc-button-active-border-color': '#005249',
                        '--fc-event-bg-color': 'var(--palette-primary-main)',
                        '--fc-event-border-color': 'var(--palette-primary-main)',
                        '--fc-event-text-color': '#fff',
                        '--fc-event-selected-overlay-color': 'rgba(0, 0, 0, 0.25)',
                        '--fc-more-link-bg-color': 'rgba(145, 158, 171, 0.12)',
                        '--fc-more-link-text-color': 'var(--palette-text-primary)',
                        '--fc-non-business-color': 'rgba(145, 158, 171, 0.08)',
                        '--fc-highlight-color': 'rgba(0, 167, 111, 0.08)',
                        '--fc-today-bg-color': 'rgba(255, 171, 0, 0.08)',
                        '--fc-now-indicator-color': 'var(--palette-error-main)',
                        '--fc-daygrid-event-dot-width': '8px',
                        '--fc-list-event-dot-width': '10px',
                        '--fc-list-event-hover-bg-color': 'rgba(145, 158, 171, 0.08)',
                    },
                    '& .fc-theme-standard .fc-scrollgrid': {
                        border: 'none',
                    },
                    '& .fc table': {
                        width: '100% !important',
                    },
                    '& .fc-view-harness': {
                        height: '381px',
                        overflowY: 'auto',
                    },
                    '& .fc .fc-scrollgrid': {
                        border: 'none',
                    },
                    '& .fc .fc-daygrid-body': {
                        height: 'auto !important',
                    },
                    '& .fc .fc-scrollgrid-sync-table': {
                        height: 'auto !important',
                    },
                    '& .fc .fc-col-header': {
                        borderTop: '1px solid var(--fc-border-color)',
                        position: 'sticky',
                        top: 0,
                        zIndex: 3,
                        backgroundColor: "var(--palette-background-paper)",
                    },
                    '& .fc .fc-col-header-cell': {
                        height: '47.8px',
                        padding: '0',
                        borderLeft: 'none',
                        borderRight: 'none',
                        verticalAlign: 'middle',
                        '& .fc-col-header-cell-cushion': {
                            fontWeight: 700,
                            fontSize: '0.9375rem',
                            color: 'var(--palette-text-primary)',
                            textTransform: 'capitalize',
                            textDecoration: 'none !important',
                            padding: '0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                        }
                    },
                    '& .fc .fc-timegrid-axis': {
                        verticalAlign: 'middle !important',
                    },
                    '& .fc .fc-timegrid-axis-cushion': {
                        color: 'var(--palette-text-secondary)',
                        fontSize: '0.875rem',
                        fontWeight: 400,
                        textDecoration: 'none !important',
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    },
                    '& .fc .fc-timegrid-slot-label-cushion': {
                        color: 'var(--palette-text-secondary)',
                        fontSize: '0.875rem',
                        fontWeight: 400,
                        textAlign: 'right',
                        paddingRight: '8px',
                    },
                    '& .fc .fc-daygrid-day': {
                        '&.fc-day-today': {
                            '& .fc-daygrid-day-number': {
                                bgcolor: 'var(--palette-error-main)',
                                color: "var(--palette-common-white)",
                                borderRadius: '50%',
                                width: '26px',
                                height: '26px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '4px',
                            }
                        }
                    },
                    '& .fc .fc-daygrid-day-number': {
                        fontSize: '0.875rem',
                        fontWeight: 400,
                        padding: '4px 8px',
                        color: 'var(--palette-text-secondary)', // Default color for days without events
                        textDecoration: 'none !important',
                    },
                    '& .fc .fc-day-has-event .fc-daygrid-day-number': {
                        color: 'var(--palette-text-primary)', // Bold color for days with events
                    },
                    '& .fc .fc-daygrid-event': {
                        borderRadius: "var(--shape-borderRadius-sm)",
                        padding: 0,
                        border: 'none !important',
                        marginLeft: '4px',
                        marginRight: '4px',
                        marginBottom: '4px',
                        marginTop: 0,
                        overflow: 'hidden',
                        minWidth: 0,
                    },
                    '& .fc .fc-daygrid-event-dot': {
                        display: 'none',
                    },
                    '& .fc .fc-event-main': {
                        padding: '2px 6px',
                        fontSize: '0.8125rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        minWidth: 0,
                        maxWidth: '100%',
                    },
                    '& .fc .fc-event-time': {
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                    },
                    '& .fc .fc-event-title': {
                        fontSize: '0.8125rem',
                        fontWeight: 400,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        minWidth: 0,
                    },
                    '& .fc .fc-event-title *': {
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    },
                    '& .fc .fc-list': {
                        border: 'none',
                    },
                    '& .fc .fc-list-event': {
                        '&:hover td': {
                            bgcolor: 'rgba(145, 158, 171, 0.08)',
                        }
                    },
                    '& .fc .fc-list-event-time': {
                        fontSize: '0.875rem',
                        color: 'var(--palette-text-secondary)',
                        fontWeight: 400,
                    },
                    '& .fc .fc-list-event-title': {
                        fontSize: '0.875rem',
                        fontWeight: 400,
                    },
                    '& .fc .fc-list-day-cushion': {
                        fontSize: '0.875rem',
                        fontWeight: 600,
                    },
                }}
            >
                <Box sx={{ p: "20px", pr: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <ToggleButtonGroup
                        value={view}
                        exclusive
                        onChange={handleViewChange}
                        aria-label="calendar view"
                        sx={{
                            gap: '4px',
                            p: 0.5,
                            border: '1px solid var(--palette-text-disabled)29',
                            borderRadius: "10px",
                            '& .MuiToggleButton-root': {
                                border: 'none !important',
                                borderRadius: '8px !important',
                                p: '4px !important',
                                '&.Mui-selected': {
                                    bgcolor: 'rgba(28, 37, 46, 0.08)',
                                    color: 'var(--palette-text-primary)',
                                    '&:hover': {
                                        bgcolor: 'rgba(28, 37, 46, 0.16)',
                                    }
                                }
                            }
                        }}
                    >
                        <Tooltip title="Tháng" placement="bottom">
                            <ToggleButton value="dayGridMonth" aria-label="Month view">
                                <CalendarViewMonthIcon sx={{ fontSize: 20 }} />
                            </ToggleButton>
                        </Tooltip>
                        <Tooltip title="Tuần" placement="bottom">
                            <ToggleButton value="timeGridWeek" aria-label="Week view">
                                <CalendarViewWeekIcon sx={{ fontSize: 20 }} />
                            </ToggleButton>
                        </Tooltip>
                        <Tooltip title="Ngày" placement="bottom">
                            <ToggleButton value="timeGridDay" aria-label="Day view">
                                <CalendarViewDayIcon sx={{ fontSize: 20 }} />
                            </ToggleButton>
                        </Tooltip>
                        <Tooltip title="Chương trình" placement="bottom">
                            <ToggleButton value="listWeek" aria-label="Agenda view">
                                <CalendarViewAgendaIcon sx={{ fontSize: 20 }} />
                            </ToggleButton>
                        </Tooltip>
                    </ToggleButtonGroup>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <IconButton size="medium" onClick={handlePrev}>
                            <ChevronLeftIcon sx={{ fontSize: 20, color: 'var(--palette-text-secondary)' }} />
                        </IconButton>

                        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.0625rem', minWidth: '160px', textAlign: 'center', color: "var(--palette-text-primary)" }}>
                            {capitalizeFirstLetter(dayjs(date).format('MMMM YYYY'))}
                        </Typography>

                        <IconButton size="medium" onClick={handleNext}>
                            <ChevronRightIcon sx={{ fontSize: 20, color: 'var(--palette-text-secondary)' }} />
                        </IconButton>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Button
                            variant="contained"
                            size="small"
                            onClick={handleToday}
                            sx={{
                                bgcolor: 'var(--palette-error-main)',
                                borderRadius: "var(--shape-borderRadius)",
                                minHeight: "30px",
                                minWidth: "64px",
                                fontSize: "0.75rem",
                                textTransform: 'none',
                                fontWeight: 700,
                                padding: "4px 8px",
                                '&:hover': {
                                    bgcolor: '#B71D18'
                                }
                            }}
                        >
                            Today
                        </Button>
                        <IconButton size="medium" onClick={handleOpenFilters}>
                            <Badge variant="dot" sx={{ '& .MuiBadge-badge': { bgcolor: 'var(--palette-error-main)' } }} invisible={false}>
                                <CalendarFilterIcon sx={{ color: 'var(--palette-text-secondary)' }} />
                            </Badge>
                        </IconButton>
                    </Box>
                </Box>

                <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                    initialView={view}
                    locale="vi"
                    firstDay={1}
                    initialDate="2026-02-04"
                    events={events}
                    headerToolbar={false}
                    height="auto"
                    dayMaxEventRows={3}
                    eventDisplay="block"
                    allDayText="Cả ngày"
                    slotLabelFormat={{
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    }}
                    dayCellClassNames={(arg) => {
                        const cellDateStr = dayjs(arg.date).format('YYYY-MM-DD');
                        const hasEvent = events.some(event => {
                            return dayjs(event.start).format('YYYY-MM-DD') === cellDateStr;
                        });
                        return hasEvent ? ['fc-day-has-event'] : [];
                    }}
                    displayEventEnd={true}
                    eventTimeFormat={{
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                        meridiem: false
                    }}
                    allDaySlot={false}
                    eventContent={(eventInfo) => {
                        const { extendedProps } = eventInfo.event;
                        const start = dayjs(eventInfo.event.start).format('HH:mm');
                        const end = dayjs(eventInfo.event.end).format('HH:mm');
                        const timeText = `${start} - ${end}`;

                        return (
                            <Tooltip
                                title={
                                    <Box sx={{ p: 0.5 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{extendedProps.ticketServiceName}</Typography>
                                        <Typography variant="caption" sx={{ display: 'block', opacity: 0.8 }}>Khách: {extendedProps.customerName || 'Khách lẻ'}</Typography>
                                        <Typography variant="caption" sx={{ display: 'block', opacity: 0.8 }}>NV: {extendedProps.staffName || 'Chưa gán'}</Typography>
                                        <Typography variant="caption" sx={{ display: 'block', opacity: 0.8 }}>Giờ: {timeText}</Typography>
                                        <Typography variant="caption" sx={{
                                            display: 'inline-block',
                                            mt: 0.5,
                                            px: 1,
                                            borderRadius: '4px',
                                            bgcolor: alpha('#fff', 0.2),
                                            fontWeight: 700
                                        }}>
                                            {extendedProps.status?.toUpperCase()}
                                        </Typography>
                                    </Box>
                                }
                                arrow
                                placement="top"
                            >
                                <Box sx={{
                                    width: '100%',
                                    overflow: 'hidden',
                                    px: 0.5,
                                    py: 0.25,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 0.1
                                }}>
                                    <Typography variant="caption" sx={{
                                        fontWeight: 700,
                                        fontSize: '0.65rem',
                                        lineHeight: 1.1,
                                        color: 'inherit',
                                        opacity: 0.9
                                    }}>
                                        {timeText}
                                    </Typography>
                                    <Typography variant="caption" sx={{
                                        fontWeight: 600,
                                        fontSize: '0.75rem',
                                        lineHeight: 1.2,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        color: 'inherit'
                                    }}>
                                        {extendedProps.ticketServiceName}
                                    </Typography>
                                </Box>
                            </Tooltip>
                        );
                    }}
                />
            </Card>

            <CalendarFiltersDrawer
                open={openFilters}
                onClose={handleCloseFilters}
                events={events}
            />

            <CalendarEventDialog
                open={openEventDialog}
                onClose={handleCloseEventDialog}
                onSave={handleSaveEvent}
            />
        </>
    );
};






