import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Menu, MenuItem, Box } from '@mui/material';
import { ArrowIcon } from '../../assets/icons';

interface SortButtonProps {
    value?: string;
    onChange?: (value: string) => void;
}

export const SortButton = ({ value = 'latest', onChange }: SortButtonProps) => {
    const { t } = useTranslation();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const SORT_OPTIONS = useMemo(() => [
        { value: 'latest', label: t("admin.common.sort_options.latest") },
        { value: 'oldest', label: t("admin.common.sort_options.oldest") },
        { value: 'popular', label: t("admin.common.sort_options.popular") },
    ], [t]);

    const open = Boolean(anchorEl);

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = (optionValue?: string) => {
        setAnchorEl(null);
        if (optionValue && onChange) onChange(optionValue);
    };

    return (
        <>
            <Button
                disableElevation
                color="inherit"
                onClick={handleClick}
                endIcon={
                    <span className="mt-[-5px]">
                        <ArrowIcon />
                    </span>
                }
                sx={{
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    color: '#1C252E',
                    borderRadius: "8px",
                    height: "36px",
                    '&:hover': {
                        bgcolor: 'rgba(145, 158, 171, 0.08)',
                    }
                }}
            >
                {t("admin.common.sort_by")}
                <Box component="span" sx={{ fontWeight: 700, ml: "4px" }}>
                    {SORT_OPTIONS.find(opt => opt.value === value)?.label}
                </Box>
            </Button>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={() => handleClose()}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                    paper: {
                        className: 'background-popup',
                        sx: {
                            minWidth: 140,
                            borderRadius: '10px',
                            boxShadow: '0 0 2px 0 rgba(145 158 171 / 24%), -20px 20px 40px -4px rgba(145 158 171 / 24%)',
                        }
                    }
                }}
            >
                {SORT_OPTIONS.map((option) => (
                    <MenuItem
                        key={option.value}
                        selected={option.value === value}
                        onClick={() => handleClose(option.value)}
                        sx={{
                            fontSize: '0.875rem',
                            borderRadius: '6px',
                            '&.Mui-selected': {
                                fontWeight: 700,
                                bgcolor: 'rgba(145, 158, 171, 0.16)',
                                '&:hover': {
                                    bgcolor: 'rgba(145, 158, 171, 0.24)',
                                },
                            },
                        }}
                    >
                        {option.label}
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
};
