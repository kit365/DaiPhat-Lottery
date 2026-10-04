'use client';

import { useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import {
    Badge,
    Box,
    Button,
    FormControlLabel,
    IconButton,
    InputAdornment,
    Paper,
    Popover,
    Radio,
    RadioGroup,
    Stack,
    TextField,
    Typography,
} from '@mui/material';

export type OcrTicketListFilterOption = { value: string; label: string };

type Props = {
    query: string;
    onQueryChange: (value: string) => void;
    placeholder?: string;
    filteredCount: number;
    totalCount: number;
    filterLabel: string;
    filterValue: string;
    filterOptions: OcrTicketListFilterOption[];
    onFilterChange: (value: string) => void;
};

export const OcrTicketListToolbar = ({
    query,
    onQueryChange,
    placeholder = 'Tìm kiếm dãy số, số serial…',
    filteredCount,
    totalCount,
    filterLabel,
    filterValue,
    filterOptions,
    onFilterChange,
}: Props) => {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const activeFilterCount = filterValue === 'ALL' ? 0 : 1;

    return (
        <Paper
            variant="outlined"
            sx={{ p: 2, borderRadius: '16px', bgcolor: '#fff', borderColor: '#e2e8f0' }}
        >
            <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={1.5}
                alignItems={{ xs: 'stretch', md: 'center' }}
            >
                <TextField
                    size="small"
                    value={query}
                    onChange={(event) => onQueryChange(event.target.value)}
                    placeholder={placeholder}
                    inputProps={{ 'aria-label': placeholder }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ color: '#64748b' }} />
                            </InputAdornment>
                        ),
                        endAdornment: query ? (
                            <InputAdornment position="end">
                                <IconButton size="small" onClick={() => onQueryChange('')} aria-label="Xóa tìm kiếm">
                                    <CloseIcon fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        ) : undefined,
                    }}
                    sx={{
                        width: { xs: '100%', md: 600 },
                        '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: '#fff' },
                    }}
                />
                <Badge badgeContent={activeFilterCount} color="warning">
                    <Button
                        variant="outlined"
                        startIcon={<FilterListIcon />}
                        onClick={(event) => setAnchorEl(event.currentTarget)}
                        sx={{ minHeight: 40, borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
                    >
                        Bộ lọc
                    </Button>
                </Badge>
                <Box sx={{ flex: 1 }} />
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                    Hiển thị <strong>{filteredCount.toLocaleString('vi-VN')}</strong> /{' '}
                    <strong>{totalCount.toLocaleString('vi-VN')}</strong> vé
                </Typography>
            </Stack>

            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                slotProps={{ paper: { sx: { mt: 1, p: 2, minWidth: 260, borderRadius: '12px' } } }}
            >
                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                    {filterLabel}
                </Typography>
                <RadioGroup value={filterValue} onChange={(event) => onFilterChange(event.target.value)}>
                    {filterOptions.map((option) => (
                        <FormControlLabel
                            key={option.value}
                            value={option.value}
                            control={<Radio size="small" />}
                            label={option.label}
                        />
                    ))}
                </RadioGroup>
            </Popover>
        </Paper>
    );
};
