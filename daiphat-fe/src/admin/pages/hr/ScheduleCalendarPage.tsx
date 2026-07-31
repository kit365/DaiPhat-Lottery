import { useState, useRef, useEffect, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import {
    Box,
    Card,
    Typography,
    Button,
    ToggleButtonGroup,
    ToggleButton,
    Tooltip,
    IconButton,
    Tabs,
    Tab,
    alpha,
} from '@mui/material';
import { Icon } from '@iconify/react';
import AddIcon from '@mui/icons-material/Add';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { Title } from "../../components/ui/Title";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { prefixAdmin } from "../../constants/routes";
import { confirmDelete } from "../../utils/swal";
import { useCalendarData, useCreateSchedule, useUpdateSchedule, useBulkCreateSchedules, useDeleteSchedule, useBulkDeleteSchedules } from './hooks/useSchedules';
import { ScheduleEventDialog } from './sections/ScheduleEventDialog';
import { BulkScheduleDialog } from './sections/BulkScheduleDialog';
import { BulkDeleteDialog } from './sections/BulkDeleteDialog';
import {
    CalendarViewAgendaIcon,
    CalendarViewDayIcon,
    CalendarViewMonthIcon,
    CalendarViewWeekIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
} from '../../assets/icons';
import { primaryButtonStyles } from './configs/styles.config';


import { useDepartments } from './hooks/useDepartments';

export const ScheduleCalendarPage = () => {
    const calendarRef = useRef<FullCalendar>(null);
    const [view, setView] = useState('dayGridMonth');
    const [date, setDate] = useState(dayjs());
    const [currentTab, setCurrentTab] = useState('');
    const [openDialog, setOpenDialog] = useState(false);
    const [openBulkDialog, setOpenBulkDialog] = useState(false);
    const [openBulkDeleteDialog, setOpenBulkDeleteDialog] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<any>(null);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

    const departmentsRes = useDepartments();
    const departments = useMemo(() => {
        if (!departmentsRes.data) return [];
        const data: any = departmentsRes.data;
        if (Array.isArray(data.recordList)) return data.recordList;
        if (Array.isArray(data.data?.recordList)) return data.data.recordList;
        if (Array.isArray(data.data)) return data.data;
        return Array.isArray(data) ? data : [];
    }, [departmentsRes.data]);

    // Set default tab when departments load
    useEffect(() => {
        if (departments.length > 0 && !currentTab) {
            setCurrentTab(departments[0]._id);
        }
    }, [departments, currentTab]);


    const month = date.month() + 1;
    const year = date.year();

    const { data: calendarRes } = useCalendarData(month, year, currentTab);
    const allEvents = calendarRes?.data || [];

    const events = allEvents.filter((event: any) => {
        // Filter by division (Tab) which is now the departmentId
        if (currentTab) {
            return event.extendedProps.departmentId === currentTab;
        }

        return true;
    });

    const { mutate: createSchedule, isPending: isCreating } = useCreateSchedule();
    const { mutate: updateSchedule, isPending: isUpdating } = useUpdateSchedule();
    const { mutate: bulkCreateSchedules, isPending: isBulkCreating } = useBulkCreateSchedules();
    const { mutate: deleteSchedule, isPending: isDeleting } = useDeleteSchedule();
    const { mutate: bulkDeleteSchedules, isPending: isBulkDeleting } = useBulkDeleteSchedules();


    const handleOpenDialog = (event?: any, selectDate?: Date) => {
        setSelectedEvent(event);
        setSelectedDate(selectDate);
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedEvent(null);
        setSelectedDate(undefined);
    };

    const handleSaveEvent = (data: any) => {
        if (data.id) {
            updateSchedule({ id: data.id, data }, {
                onSuccess: () => {
                    toast.success('Cập nhật lịch thành công');
                    handleCloseDialog();
                },
                onError: (err: any) => {
                    toast.error(err.response?.data?.message || 'Lỗi cập nhật lịch');
                }
            });
        } else {
            createSchedule(data, {
                onSuccess: () => {
                    toast.success('Thêm lịch thành công');
                    handleCloseDialog();
                },
                onError: (err: any) => {
                    toast.error(err.response?.data?.message || 'Lỗi thêm lịch');
                }
            });
        }
    };

    const handleDeleteEvent = (id: string) => {
        confirmDelete('Bạn có chắc chắn muốn xóa ca làm việc này?', () => {
            deleteSchedule(id, {
                onSuccess: () => {
                    toast.success('Xóa lịch thành công');
                    handleCloseDialog();
                },
                onError: (err: any) => {
                    toast.error(err.response?.data?.message || 'Lỗi xóa lịch');
                }
            });
        });
    };

    const handleSaveBulk = (data: any) => {
        bulkCreateSchedules(data, {
            onSuccess: (res: any) => {
                if (res.data.created === 0 && res.data.updated === 0) {
                    toast.error('Phân ca thất bại, nhân viên đã có lịch');
                } else {
                    toast.success(res.message || 'Phân ca hàng loạt thành công');
                }
                setOpenBulkDialog(false);
            },
            onError: (err: any) => {
                toast.error(err.response?.data?.message || 'Lỗi phân ca hàng loạt');
            }
        });
    };

    const handleDeleteBulk = (data: any) => {
        bulkDeleteSchedules(data, {
            onSuccess: (res: any) => {
                toast.success(res.message || 'Xóa ca hàng loạt thành công');
                setOpenBulkDeleteDialog(false);
            },
            onError: (err: any) => {
                toast.error(err.response?.data?.message || 'Lỗi khi xóa ca hàng loạt');
            }
        });
    };

    const handleViewChange = (_event: any, newView: string | null) => {
        if (newView !== null) {
            setView(newView);
            calendarRef.current?.getApi().changeView(newView);
        }
    };

    const handlePrev = () => {
        const calendarApi = calendarRef.current?.getApi();
        if (calendarApi) {
            calendarApi.prev();
            setDate(dayjs(calendarApi.getDate()));
        }
    };

    const handleNext = () => {
        const calendarApi = calendarRef.current?.getApi();
        if (calendarApi) {
            calendarApi.next();
            setDate(dayjs(calendarApi.getDate()));
        }
    };

    const handleToday = () => {
        const calendarApi = calendarRef.current?.getApi();
        if (calendarApi) {
            calendarApi.today();
            setDate(dayjs(calendarApi.getDate()));
        }
    };

    const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
        setCurrentTab(newValue);
    };

    const handleEventClick = (arg: any) => {
        handleOpenDialog(arg.event);
    };

    const handleDateClick = (arg: any) => {
        handleOpenDialog(undefined, arg.date);
    };

    return (
        <Box sx={{ p: "calc(3 * var(--spacing))" }}>
            <Box sx={{ mb: '40px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box sx={{ flexGrow: 1 }}>
                    <Title title="Lịch làm việc nhân viên" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: `/${prefixAdmin}` },
                            { label: "Lịch làm việc" }
                        ]}
                    />
                </Box>
                <Box sx={{ display: 'flex', gap: '12px' }}>
                    <Button
                        variant="outlined"
                        startIcon={<Icon icon="solar:calendar-add-bold-duotone" width={22} />}
                        onClick={() => setOpenBulkDialog(true)}
                        sx={{
                            ...primaryButtonStyles,
                            bgcolor: 'transparent',
                            color: 'var(--palette-text-primary)',
                            borderColor: 'var(--palette-background-neutral)',
                            '&:hover': {
                                bgcolor: 'var(--palette-action-hover)',
                                borderColor: 'var(--palette-text-primary)',
                            }
                        }}
                    >
                        Phân ca hàng loạt
                    </Button>
                    <Button
                        variant="outlined"
                        color="error"
                        startIcon={<Icon icon="solar:trash-bin-trash-bold-duotone" width={22} />}
                        onClick={() => setOpenBulkDeleteDialog(true)}
                        sx={{
                            ...primaryButtonStyles,
                            bgcolor: 'transparent',
                            color: 'var(--palette-error-main)',
                            borderColor: alpha('#FF5630', 0.24),
                            '&:hover': {
                                bgcolor: alpha('#FF5630', 0.08),
                                borderColor: 'var(--palette-error-main)',
                            }
                        }}
                    >
                        Xóa nhiều ca
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog()}
                        sx={primaryButtonStyles}
                    >
                        Phân ca mới
                    </Button>
                </Box>
            </Box>

            <Card
                elevation={0}
                sx={{
                    bgcolor: 'var(--palette-background-paper)',
                    backgroundImage: 'none',
                    borderRadius: 'var(--shape-borderRadius-lg)',
                    boxShadow: 'var(--customShadows-card)',
                    color: "var(--palette-text-primary)",
                    '& .fc': {
                        '--fc-border-color': 'var(--palette-background-neutral)',
                        '--fc-today-bg-color': 'var(--palette-warning-lighter)',
                        '--fc-event-border-color': 'transparent',
                    },
                    '& .fc-scrollgrid': {
                        borderLeft: '1px solid var(--palette-background-neutral) !important',
                        borderRadius: '0 0 var(--shape-borderRadius-lg) var(--shape-borderRadius-lg)',
                    },
                    '& .fc-theme-standard td, & .fc-theme-standard th': {
                        borderRight: '1px solid var(--palette-background-neutral) !important',
                        borderBottom: '1px solid var(--palette-background-neutral) !important',
                    },
                    '& .fc-col-header-cell-cushion': {
                        color: 'var(--palette-text-secondary)',
                        fontWeight: 700,
                        textDecoration: 'none',
                        textTransform: 'capitalize',
                        fontSize: '0.9375rem',
                        padding: '12px 0',
                    },
                    '& .fc-daygrid-day-number': {
                        color: 'var(--palette-text-secondary)',
                        fontWeight: 400,
                        textDecoration: 'none',
                        fontSize: '0.875rem',
                        padding: '8px',
                    },
                    '& .fc-event': {
                        cursor: 'pointer',
                        borderRadius: "var(--shape-borderRadius-sm)",
                        padding: '2px 4px',
                        fontSize: '0.8125rem',
                        border: 'none',
                    },
                    '& .fc-theme-standard .fc-scrollgrid': {
                        border: 'none',
                        borderTop: '1px solid var(--palette-background-neutral)',
                    },
                }}
            >
                <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
                    <Tabs
                        value={currentTab || false}
                        onChange={handleTabChange}
                        sx={{
                            '& .MuiTab-root': {
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: '0.875rem',
                                color: 'var(--palette-text-secondary)',
                                minHeight: '48px',
                                '&.Mui-selected': {
                                    color: 'var(--palette-text-primary)',
                                }
                            },
                            '& .MuiTabs-indicator': {
                                bgcolor: 'var(--palette-text-primary)',
                            }
                        }}
                    >
                        {departments.map((dept: any) => (
                            <Tab key={dept._id} value={dept._id} label={dept.name} />
                        ))}
                    </Tabs>
                </Box>

                <Box sx={{ p: "20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <ToggleButtonGroup
                            value={view}
                            exclusive
                            onChange={handleViewChange}
                            sx={{
                                gap: '4px',
                                p: 0.5,
                                border: '1px solid rgba(145, 158, 171, 0.16)',
                                borderRadius: "10px",
                                '& .MuiToggleButton-root': {
                                    border: 'none !important',
                                    borderRadius: 'var(--shape-borderRadius-sm) !important',
                                    p: '4px !important',
                                    '&.Mui-selected': {
                                        bgcolor: 'var(--palette-action-selected)',
                                        color: 'var(--palette-text-primary)',
                                    }
                                }
                            }}
                        >
                            <Tooltip title="Tháng" placement="bottom">
                                <ToggleButton value="dayGridMonth">
                                    <CalendarViewMonthIcon sx={{ fontSize: 20 }} />
                                </ToggleButton>
                            </Tooltip>
                            <Tooltip title="Tuần" placement="bottom">
                                <ToggleButton value="timeGridWeek">
                                    <CalendarViewWeekIcon sx={{ fontSize: 20 }} />
                                </ToggleButton>
                            </Tooltip>
                            <Tooltip title="Ngày" placement="bottom">
                                <ToggleButton value="timeGridDay">
                                    <CalendarViewDayIcon sx={{ fontSize: 20 }} />
                                </ToggleButton>
                            </Tooltip>
                            <Tooltip title="Danh sách" placement="bottom">
                                <ToggleButton value="listWeek">
                                    <CalendarViewAgendaIcon sx={{ fontSize: 20 }} />
                                </ToggleButton>
                            </Tooltip>
                        </ToggleButtonGroup>

                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', flexGrow: 1, justifyContent: 'center' }}>
                        <IconButton size="medium" onClick={handlePrev}>
                            <ChevronLeftIcon sx={{ fontSize: 20, color: 'var(--palette-text-secondary)' }} />
                        </IconButton>

                        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.0625rem', minWidth: '160px', textAlign: 'center', color: "var(--palette-text-primary)" }}>
                            {`Tháng ${date.format('MM/YYYY')}`}
                        </Typography>

                        <IconButton size="medium" onClick={handleNext}>
                            <ChevronRightIcon sx={{ fontSize: 20, color: 'var(--palette-text-secondary)' }} />
                        </IconButton>
                    </Box>

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
                            '&:hover': { bgcolor: 'var(--palette-error-dark)' }
                        }}
                    >
                        Hôm nay
                    </Button>
                </Box>

                <Box sx={{ px: 2, pb: 2 }}>
                    <FullCalendar
                        ref={calendarRef}
                        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                        initialView={view}
                        locale="vi"
                        firstDay={1}
                        events={events}
                        headerToolbar={false}
                        height="auto"
                        dayMaxEventRows={3}
                        eventClick={handleEventClick}
                        dateClick={handleDateClick}
                        allDaySlot={false}
                        slotMinTime="08:00:00"
                        slotMaxTime="20:00:00"
                        eventTimeFormat={{
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                            meridiem: false
                        }}
                        eventContent={(eventInfo) => {
                            const { extendedProps } = eventInfo.event;
                            const start = eventInfo.event.start ? dayjs(eventInfo.event.start).format('HH:mm') : extendedProps.startTime;
                            const end = eventInfo.event.end ? dayjs(eventInfo.event.end).format('HH:mm') : extendedProps.endTime;
                            const timeText = `${start || '--:--'} - ${end || '--:--'}`;

                            return (
                                <Tooltip
                                    title={
                                        <Box sx={{ p: 0.5 }}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{extendedProps.staffName}</Typography>
                                            <Typography variant="caption" sx={{ display: 'block', opacity: 0.8 }}>Vai trò: {extendedProps.staffRole}</Typography>
                                            <Typography variant="caption" sx={{ display: 'block', opacity: 0.8 }}>Ca: {extendedProps.shiftName} ({timeText})</Typography>
                                            {extendedProps.notes && (
                                                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
                                                    Ghi chú: {extendedProps.notes}
                                                </Typography>
                                            )}
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
                                            {eventInfo.event.title}
                                        </Typography>
                                    </Box>
                                </Tooltip>
                            );
                        }}
                    />
                </Box>
            </Card>

            <ScheduleEventDialog
                open={openDialog}
                onClose={handleCloseDialog}
                onSave={handleSaveEvent}
                onDelete={handleDeleteEvent}
                selectedEvent={selectedEvent}
                selectedDate={selectedDate}
                departmentId={currentTab}
                loading={isCreating || isUpdating || isDeleting}
            />

            <BulkScheduleDialog
                open={openBulkDialog}
                onClose={() => setOpenBulkDialog(false)}
                onSave={handleSaveBulk}
                departmentId={currentTab}
                loading={isBulkCreating}
            />

            <BulkDeleteDialog
                open={openBulkDeleteDialog}
                onClose={() => setOpenBulkDeleteDialog(false)}
                onDelete={handleDeleteBulk}
                departmentId={currentTab}
                loading={isBulkDeleting}
            />
        </Box>
    );
};




