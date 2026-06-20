import React, { useState, useMemo } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Tabs,
    Tab,
    Grid,
    IconButton,
    Typography,
    InputAdornment,
    OutlinedInput,
    FormControl,
    InputLabel,
    FormHelperText
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import { Chip } from '@mui/material';

interface Station {
    id?: string;
    _id?: string;
    name: string;
    region: string;
    drawDays?: string[];
    drawTime?: string;
}

interface StationSelectorProps {
    value: string;
    onChange: (value: string) => void;
    providers: Station[];
    error?: boolean;
    helperText?: string;
}

const REGIONS = [
    { value: 'MIEN_NAM', label: 'Miền Nam' }
];

const formatDrawSchedule = (drawDays?: string[], drawTime?: string) => {
    if (!drawDays || drawDays.length === 0) return 'Chưa có lịch quay';
    const dayMap: Record<string, string> = {
        'MONDAY': 'T2',
        'TUESDAY': 'T3',
        'WEDNESDAY': 'T4',
        'THURSDAY': 'T5',
        'FRIDAY': 'T6',
        'SATURDAY': 'T7',
        'SUNDAY': 'CN'
    };
    const days = drawDays.map(d => dayMap[d] || d).join(', ');
    return `${days} (${drawTime || '--:--'})`;
};

export const StationSelector: React.FC<StationSelectorProps> = ({
    value,
    onChange,
    providers,
    error,
    helperText
}) => {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [tempSelected, setTempSelected] = useState<string>(value);

    // Get selected station object for display
    const selectedStation = providers.find(p => String(p.id || p._id) === String(value));

    const handleOpen = () => {
        setTempSelected(value);
        setSearchQuery('');
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleConfirm = () => {
        onChange(tempSelected);
        setOpen(false);
    };

    const [activeTab, setActiveTab] = useState('MIEN_NAM');

    const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
        setActiveTab(newValue);
    };

    const filteredProviders = useMemo(() => {
        return providers.filter(p => {
            const matchesRegion = p.region === activeTab;
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesRegion && matchesSearch;
        });
    }, [providers, activeTab, searchQuery]);

    return (
        <>
            <FormControl fullWidth error={error}>
                <InputLabel shrink>Nhà đài</InputLabel>
                <OutlinedInput
                    readOnly
                    notched
                    label="Nhà đài"
                    value={selectedStation ? selectedStation.name : ''}
                    onClick={handleOpen}
                    placeholder="Chọn nhà đài"
                    sx={{
                        cursor: 'pointer',
                        '& input': { cursor: 'pointer' }
                    }}
                />
                {helperText && <FormHelperText>{helperText}</FormHelperText>}
            </FormControl>

            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '12px',
                        minHeight: '500px',
                    }
                }}
            >
                <DialogTitle sx={{ textAlign: 'center', fontWeight: 700, pb: 1, position: 'relative' }}>
                    Chọn nhà đài
                    <IconButton
                        onClick={handleClose}
                        sx={{ position: 'absolute', right: 8, top: 8, color: 'text.secondary' }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ p: 3 }}>
                    <TextField
                        fullWidth
                        placeholder="Tìm kiếm nhà đài..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                            sx: { borderRadius: '8px', mb: 3 }
                        }}
                    />

                    <Tabs
                        value={activeTab}
                        onChange={handleTabChange}
                        variant="fullWidth"
                        sx={{
                            borderBottom: 1,
                            borderColor: 'divider',
                            mb: 3,
                            '& .MuiTab-root': {
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: '1rem',
                                color: 'text.secondary',
                                '&.Mui-selected': {
                                    color: 'primary.main'
                                }
                            },
                            '& .MuiTabs-indicator': {
                                backgroundColor: 'primary.main',
                                height: 3
                            }
                        }}
                    >
                        {REGIONS.map(region => (
                            <Tab key={region.value} value={region.value} label={region.label} />
                        ))}
                    </Tabs>

                    <Grid container spacing={2}>
                        {filteredProviders.length > 0 ? (
                            filteredProviders.map((provider) => {
                                const pId = String(provider.id || provider._id);
                                const isSelected = tempSelected === pId;
                                return (
                                    <Grid item xs={12} sm={6} md={4} key={pId}>
                                        <Button
                                            fullWidth
                                            variant={isSelected ? "contained" : "outlined"}
                                            onClick={() => setTempSelected(pId)}
                                            sx={{
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                flexDirection: 'column',
                                                p: 1.5,
                                                borderRadius: '8px',
                                                color: isSelected ? '#fff' : 'text.primary',
                                                borderColor: isSelected ? 'primary.main' : 'divider',
                                                bgcolor: isSelected ? 'primary.main' : 'transparent',
                                                textTransform: 'none',
                                                fontWeight: isSelected ? 600 : 400,
                                                '&:hover': {
                                                    bgcolor: isSelected ? 'primary.dark' : 'action.hover',
                                                    borderColor: isSelected ? 'primary.dark' : 'text.primary',
                                                }
                                            }}
                                        >
                                            <span style={{ display: 'block', fontSize: '1rem', marginBottom: '4px' }}>
                                                {provider.name}
                                            </span>
                                            <span style={{ 
                                                display: 'block', 
                                                fontSize: '0.75rem', 
                                                fontWeight: 400,
                                                opacity: 0.8
                                            }}>
                                                {formatDrawSchedule(provider.drawDays, provider.drawTime)}
                                            </span>
                                        </Button>
                                    </Grid>
                                );
                            })
                        ) : (
                            <Grid item xs={12}>
                                <Typography sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}>
                                    Không tìm thấy nhà đài nào
                                </Typography>
                            </Grid>
                        )}
                    </Grid>
                </DialogContent>

                <DialogActions sx={{ p: 3, pt: 0, justifyContent: 'space-between' }}>
                    <Button
                        onClick={handleClose}
                        variant="outlined"
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            borderRadius: '8px',
                            minWidth: '120px'
                        }}
                    >
                        Hủy
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        variant="contained"
                        disabled={!tempSelected}
                        sx={{
                            bgcolor: 'primary.main',
                            color: '#fff',
                            textTransform: 'none',
                            fontWeight: 600,
                            borderRadius: '8px',
                            minWidth: '120px',
                            '&:hover': {
                                bgcolor: 'primary.dark',
                            },
                            '&.Mui-disabled': {
                                bgcolor: 'action.disabledBackground',
                                color: 'text.disabled'
                            }
                        }}
                    >
                        Xác nhận
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};
