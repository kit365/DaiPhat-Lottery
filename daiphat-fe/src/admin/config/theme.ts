import { Button } from '@/admin/components/ui/Button';
import { createTheme } from '@mui/material/styles';
import { createElement } from 'react';
import SvgIcon from '@mui/material/SvgIcon';
import type { } from '@mui/x-data-grid/themeAugmentation';

const CheckboxUncheckedIcon = () =>
    createElement(SvgIcon, { viewBox: "0 0 24 24" },
        createElement("path", {
            d: "M17.9 2.318A5 5 0 0 1 22.895 7.1l.005.217v10a5 5 0 0 1-4.783 4.995l-.217.005h-10a5 5 0 0 1-4.995-4.783l-.005-.217v-10a5 5 0 0 1 4.783-4.996l.217-.004h10Zm-.5 1.5h-9a4 4 0 0 0-4 4v9a4 4 0 0 0 4 4h9a4 4 0 0 0 4-4v-9a4 4 0 0 0-4-4Z",
            fill: "currentColor"
        })
    );

const CheckboxCheckedIcon = () =>
    createElement(SvgIcon, { viewBox: "0 0 24 24" },
        createElement("path", {
            fill: "currentColor",
            d: "M17 2a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Z"
        }),
        createElement("path", {
            fill: "#fff",
            d: "M15.375 9.255l-4.13 4.13-1.75-1.75a.881.881 0 0 0-1.24 0c-.34.34-.34.89 0 1.24l2.38 2.37c.17.17.39.25.61.25.23 0 .45-.08.62-.25l4.75-4.75c.34-.34.34-.89 0-1.24a.881.881 0 0 0-1.24 0Z"
        })
    );

const CheckboxIndeterminateIcon = () =>
    createElement(SvgIcon, { viewBox: "0 0 24 24" },
        createElement("path", {
            fill: "currentColor",
            d: "M17,2 C19.7614,2 22,4.23858 22,7 L22,7 L22,17 C22,19.7614 19.7614,22 17,22 L17,22 L7,22 C4.23858,22 2,19.7614 2,17 L2,17 L2,7 C2,4.23858 4.23858,2 7,2 L7,2 Z M15,11 L9,11 C8.44772,11 8,11.4477 8,12 C8,12.5523 8.44772,13 9,13 L15,13 C15.5523,13 16,12.5523 16,12 C16,11.4477 15.5523,11 15,11 Z"
        })
    );

const backgroundPopup = {
    backgroundImage: "url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiBmaWxsPSJ1cmwoI3BhaW50MF9yYWRpYWxfNDQ2NF81NTMzOCkiIGZpbGwtb3BhY2l0eT0iMC4xIi8+CjxkZWZzPgo8cmFkaWFsR3JhZGllbnQgaWQ9InBhaW50MF9yYWRpYWxfNDQ2NF81NTMzOCIgY3g9IjAiIGN5PSIwIiByPSIxIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgZ3JhZGllbnRUcmFuc2Zvcm09InRyYW5zbGF0ZSgxMjAgMS44MTgxMmUtMDUpIHJvdGF0ZSgtNDUpIHNjYWxlKDEyMy4yNSkiPgo8c3RvcCBzdG9wLWNvbG9yPSIjMDBCOEQ5Ii8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzAwQjhEOSIgc3RvcC1vcGFjaXR5PSIwIi8+CjwvcmFkaWFsR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+Cg==), url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiBmaWxsPSJ1cmwoI3BhaW50MF9yYWRpYWxfNDQ2NF81NTMzNykiIGZpbGwtb3BhY2l0eT0iMC4xIi8+CjxkZWZzPgo8cmFkaWFsR3JhZGllbnQgaWQ9InBhaW50MF9yYWRpYWxfNDQ2NF81NTMzNyIgY3g9IjAiIGN5PSIwIiByPSIxIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgZ3JhZGllbnRUcmFuc2Zvcm09InRyYW5zbGF0ZSgwIDEyMCkgcm90YXRlKDEzNSkgc2NhbGUoMTIzLjI1KSI+CjxzdG9wIHN0b3AtY29sb3I9IiNGRjU2MzAiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjRkY1NjMwIiBzdG9wLW9wYWNpdHk9IjAiLz4KPC9yYWRpYWxHcmFkaWVudD4KPC9kZWZzPgo8L3N2Zz4K)",
    backdropFilter: "blur(20px)",
    backgroundColor: "#ffffffe6",
    backgroundRepeat: "no-repeat",
    backgroundSize: "50%, 50%",
    backgroundPosition: "right top, left bottom",
    boxShadow: "0 0 2px 0 rgba(145 158 171 / 24%), -20px 20px 40px -4px rgba(145 158 171 / 24%)",
    borderRadius: "10px",
};

export const adminTheme = createTheme({
    palette: {
        primary: {
            lighter: '#FFE3D5',
            light: '#FFC1AC',
            main: '#FF3030',
            dark: '#B71833',
            darker: '#7A0930',
            contrastText: '#FFFFFF',
        },
        secondary: {
            lighter: '#EFD6FF',
            light: '#C684FF',
            main: '#8E33FF',
            dark: '#5119B7',
            darker: '#27097A',
            contrastText: '#FFFFFF',
        },
        success: {
            lighter: '#D3FCD2',
            light: '#77ED8B',
            main: '#22C55E',
            dark: '#118D57',
            darker: '#065E49',
            contrastText: '#ffffff',
        },
        info: {
            lighter: '#CAFDF5',
            light: '#61F3F3',
            main: '#00B8D9',
            dark: '#006C9C',
            darker: '#003768',
            contrastText: '#FFFFFF',
        },
        warning: {
            lighter: '#FFF5CC',
            light: '#FFD666',
            main: '#FFAB00',
            dark: '#B76E00',
            darker: '#7A4100',
            contrastText: '#1C252E',
        },
        error: {
            lighter: '#FFE9D5',
            light: '#FFAC82',
            main: '#FF5630',
            dark: '#B71D18',
            darker: '#7A0916',
            contrastText: '#FFFFFF',
        },
    },
    typography: {
        fontFamily: '"Public Sans", "Barlow", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        h1: { fontWeight: 800, fontSize: "2.5rem", lineHeight: 1.25, fontFamily: '"Barlow", sans-serif' },
        h2: { fontWeight: 800, fontSize: "2rem", lineHeight: 1.3333333333333333, fontFamily: '"Barlow", sans-serif' },
        h3: { fontWeight: 700, fontSize: "1.5rem", lineHeight: 1.5, fontFamily: '"Barlow", sans-serif' },
        h4: { fontWeight: 700, fontSize: "1.25rem", lineHeight: 1.5 },
        h5: { fontWeight: 700, fontSize: "1.125rem", lineHeight: 1.5 },
        h6: { fontWeight: 600, fontSize: "1.0625rem", lineHeight: 1.5555555555555556 },
        subtitle1: { fontWeight: 600, fontSize: "1rem", lineHeight: 1.5 },
        subtitle2: { fontWeight: 600, fontSize: "0.875rem", lineHeight: 1.5714285714285714 },
        body1: { fontWeight: 400, fontSize: "1rem", lineHeight: 1.5 },
        body2: { fontWeight: 400, fontSize: "0.875rem", lineHeight: 1.5714285714285714 },
        caption: { fontWeight: 400, fontSize: "0.75rem", lineHeight: 1.5 },
        overline: { fontWeight: 700, fontSize: "0.75rem", lineHeight: 1.5, textTransform: 'uppercase' },
        button: { fontWeight: 700, fontSize: "0.875rem", lineHeight: 1.7142857142857142, textTransform: 'unset' },
    },
    components: {
        MuiMenuItem: {
            styleOverrides: {
                root: {
                    fontSize: '0.875rem',
                    color: '#1C252E',
                    marginBottom: '4px',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    '&:hover, &.Mui-selected, &.Mui-selected:hover': {
                        backgroundColor: 'rgba(145, 158, 171, 0.08)',
                    },
                },
            },
        },
        MuiFormLabel: {
            styleOverrides: {
                root: {
                    color: "#919EAB",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    '&.MuiInputLabel-shrink': {
                        fontWeight: "600",
                    },
                    '&.Mui-focused': {
                        color: "#1C252E",
                        fontWeight: "600",
                        fontSize: "0.875rem"
                    },
                    '&.Mui-error': {
                        color: '#FF5630 !important'
                    }
                }
            },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    color: "#1C252E",
                    backgroundColor: "white !important",
                    borderRadius: "8px",
                    fontSize: "1rem",
                    '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: "#919eab33",
                        transition: 'border-color 0.2s',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: "#1C252E",
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: "#1C252E",
                        borderWidth: "2px",
                    },
                    '& fieldset': { borderWidth: '1px', borderColor: 'rgba(145, 158, 171, 0.2)' },
                    '&:hover fieldset': { borderColor: '#1C252E' },
                    '&.Mui-focused fieldset': { borderColor: '#1C252E !important', borderWidth: '2px' },
                    '&.Mui-error fieldset': { borderColor: '#FF5630 !important' },
                    '&.Mui-error:hover fieldset': { borderColor: '#FF5630 !important' },
                },
                input: {
                    padding: "16px 14px",
                    fontSize: "1rem",
                    backgroundColor: "white !important",
                    borderRadius: "8px",
                    "&:-webkit-autofill": {
                        "WebkitBoxShadow": "0 0 0 100px white inset !important",
                        "WebkitTextFillColor": "#1C252E !important",
                    },
                },
                inputMultiline: {
                    padding: 0,
                }
            }
        },
        MuiInputLabel: {
            styleOverrides: {
                root: { '&.Mui-error': { color: '#FF5630 !important' } },
            },
        },
        MuiInputBase: {
            styleOverrides: {
                root: {
                    backgroundColor: "white !important",
                    '&.Mui-error': { color: '#FF5630' },
                    "& input:-webkit-autofill": {
                        "WebkitBoxShadow": "0 0 0 100px white inset !important",
                        "WebkitTextFillColor": "#1C252E !important",
                    },
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    boxShadow: 'none',
                    minHeight: '36px',
                    padding: '6px 16px',
                    '&:hover': {
                        boxShadow: 'none',
                    },
                },
                contained: {
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: 'none',
                    },
                },
                containedPrimary: {
                    backgroundColor: 'var(--palette-text-primary)',
                    color: 'var(--palette-common-white)',
                    '&:hover': {
                        backgroundColor: 'var(--palette-grey-700)',
                        boxShadow: 'var(--customShadows-z8)',
                    },
                    '&.Mui-disabled': {
                        backgroundColor: 'rgba(145, 158, 171, 0.24)',
                        color: 'rgba(145, 158, 171, 0.8)',
                    },
                },
                outlinedPrimary: {
                    borderColor: 'rgba(28, 37, 46, 0.32)',
                    color: 'var(--palette-text-primary)',
                    backgroundColor: 'transparent',
                    '&:hover': {
                        backgroundColor: 'rgba(28, 37, 46, 0.06)',
                        borderColor: 'var(--palette-text-primary)',
                    },
                },
                outlinedInherit: {
                    borderColor: 'rgba(145, 158, 171, 0.32)',
                    color: 'var(--palette-text-secondary)',
                    '&:hover': {
                        backgroundColor: 'rgba(145, 158, 171, 0.08)',
                        borderColor: 'rgba(145, 158, 171, 0.48)',
                    },
                },
                outlined: {
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: 'none',
                    },
                },
                sizeLarge: {
                    minHeight: '48px',
                    padding: '8px 22px',
                    fontSize: '0.9375rem',
                },
                sizeSmall: {
                    minHeight: '30px',
                    padding: '4px 10px',
                    fontSize: '0.8125rem',
                },
            },
            variants: [
                {
                    props: { variant: 'contained', color: 'primary' },
                    style: {
                        backgroundColor: 'var(--palette-text-primary)',
                        color: 'var(--palette-common-white)',
                        '&:hover': {
                            backgroundColor: 'var(--palette-grey-700)',
                            boxShadow: 'var(--customShadows-z8)',
                        },
                        '&.Mui-disabled': {
                            backgroundColor: 'rgba(145, 158, 171, 0.24)',
                            color: 'rgba(145, 158, 171, 0.8)',
                        },
                    },
                },
            ],
        },
        MuiCheckbox: {
            defaultProps: {
                size: 'small',
                icon: createElement(CheckboxUncheckedIcon),
                checkedIcon: createElement(CheckboxCheckedIcon),
                indeterminateIcon: createElement(CheckboxIndeterminateIcon),
            },
            styleOverrides: {
                root: {
                    padding: '4px',
                    color: '#637381',
                    '&.Mui-checked, &.Mui-checkbox-indeterminate': { color: 'var(--palette-primary-main)' },
                    '& .MuiSvgIcon-root': { fontSize: '1.25rem' },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    padding: "4px",
                    '& .MuiList-root': { padding: 0 },
                    '&.background-popup': {
                        ...backgroundPopup,
                    }
                },
            }
        },
        MuiMenu: {
            defaultProps: {
                PaperProps: {
                    className: 'background-popup'
                }
            }
        },
        MuiPopover: {
            defaultProps: {
                PaperProps: {
                    className: 'background-popup'
                }
            }
        },
        MuiSelect: {
            defaultProps: {
                MenuProps: {
                    PaperProps: {
                        className: 'background-popup'
                    }
                }
            },
            styleOverrides: {
                root: {
                    backgroundColor: "white !important",
                    borderRadius: "8px",
                    '&.Mui-error .MuiSelect-icon': { color: '#FF5630 !important' }
                },
                icon: {
                    width: 18, height: 18, color: "#637381", backgroundColor: "currentColor",
                    mask: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 16a1 1 0 0 1-.64-.23l-6-5a1 1 0 1 1 1.28-1.54L12 13.71l5.36-4.32a1 1 0 0 1 1.41.15a1 1 0 0 1-.14 1.46l-6 4.83A1 1 0 0 1 12 16'/%3E%3C/svg%3E\") center / contain no-repeat",
                    WebkitMask: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 16a1 1 0 0 1-.64-.23l-6-5a1 1 0 1 1 1.28-1.54L12 13.71l5.36-4.32a1 1 0 0 1 1.41.15a1 1 0 0 1-.14 1.46l-6 4.83A1 1 0 0 1 12 16'/%3E%3C/svg%3E\") center / contain no-repeat",
                    "&.MuiSelect-iconOpen": { transform: "rotate(180deg)" },
                    "& path": { display: "none" }
                }
            }
        },
        MuiAutocomplete: {
            defaultProps: {
                slotProps: {
                    paper: {
                        className: 'background-popup'
                    }
                }
            } as any,
            styleOverrides: {
                listbox: {
                    padding: 0,
                },
                option: {
                    fontSize: '0.875rem',
                    padding: '6px',
                    marginBottom: '4px',
                    borderRadius: "var(--shape-borderRadius-sm)",
                },
            },
        },
        MuiTableRow: {
            styleOverrides: {
                root: {
                    '&:hover': {
                        backgroundColor: 'transparent',
                    },
                    '&.MuiTableRow-hover:hover': {
                        backgroundColor: 'transparent',
                    },
                },
            },
        },
        MuiSwitch: {
            styleOverrides: {
                root: {
                    width: '36px !important',
                    height: '20px !important',
                    padding: '0 !important',
                    margin: '8px !important',
                },
                switchBase: {
                    padding: '0 !important',
                    margin: '2px !important',
                    transitionDuration: '300ms',
                    '&.Mui-checked': {
                        transform: 'translateX(16px) !important',
                        color: '#fff !important',
                        '& + .MuiSwitch-track': {
                            backgroundColor: '#FF3030 !important',
                            opacity: '1 !important',
                            border: '0 !important',
                        },
                        '&.Mui-disabled + .MuiSwitch-track': {
                            opacity: '0.5 !important',
                        },
                    },
                    '&.Mui-focusVisible .MuiSwitch-thumb': {
                        color: '#FF3030 !important',
                        border: '4px solid #fff !important',
                    },
                    '&.Mui-disabled .MuiSwitch-thumb': {
                        color: '#f5f5f5 !important',
                    },
                    '&.Mui-disabled + .MuiSwitch-track': {
                        opacity: '0.7 !important',
                    },
                },
                thumb: {
                    boxSizing: 'border-box',
                    width: '16px !important',
                    height: '16px !important',
                    boxShadow: '0 2px 4px 0 rgb(0 35 11 / 20%) !important',
                },
                track: {
                    borderRadius: '10px !important',
                    backgroundColor: '#919eab7a !important',
                    opacity: '1 !important',
                    transition: 'background-color 500ms',
                },
            },
        },
        MuiDataGrid: {
            defaultProps: {
                disableColumnMenu: true,
                disableColumnSorting: true,
            },
            styleOverrides: {

                root: {
                    color: 'var(--palette-text-primary)',
                    borderWidth: "0",
                    overflow: 'auto',
                    '--DataGrid-t-color-interactive-focus': 'var(--palette-primary-main)',
                    '--DataGrid-t-color-border-base': 'var(--palette-background-neutral)',
                    
                    '& .MuiDataGrid-columnHeaders': {
                        borderRadius: "0", position: 'sticky', top: 70, zIndex: 3, background: 'var(--palette-background-neutral)',
                        '& .MuiDataGrid-columnHeader': {
                            color: 'var(--palette-text-secondary)', fontSize: "0.875rem", border: "none",
                            borderBottom: `1px solid var(--palette-background-neutral)`, backgroundColor: 'var(--palette-background-neutral)'
                        },
                        '& .MuiDataGrid-columnHeader--withRightBorder': { borderRight: `1px solid var(--palette-background-neutral)` },
                        '& .MuiDataGrid-menuIcon': { display: 'none !important', width: 0, opacity: 0, pointerEvents: 'none' },
                        '& .MuiDataGrid-iconButtonContainer': { display: 'none !important', width: 0, opacity: 0, pointerEvents: 'none' },
                        '& .MuiDataGrid-sortIcon': { display: 'none !important', width: 0, opacity: 0, pointerEvents: 'none' },
                        '& .MuiButtonBase-root': { fontSize: "1.125rem" }
                    },
                    
                    '& .MuiDataGrid-footerContainer': {
                        borderTop: "1px solid var(--palette-divider)", minHeight: "auto", fontSize: "0.875rem", color: "var(--palette-text-secondary)",
                        '& .MuiTablePagination-selectLabel': { fontSize: "0.875rem", color: "var(--palette-text-secondary)", marginBottom: "-2px" },
                        '& .MuiSelect-select': { minHeight: "21.5625px", lineHeight: "1.5rem", fontSize: "0.9375rem" },
                        '& .MuiSelect-icon': { top: "6px" },
                        '& .MuiTablePagination-displayedRows': { fontSize: "0.875rem", color: "var(--palette-text-secondary)" },
                        '& .MuiTablePaginationActions-root': {
                            marginRight: "8px",
                            '& .MuiButtonBase-root': { padding: "5px", '& .MuiSvgIcon-root': { width: "1.5rem", height: "1.5rem" } }
                        },
                    },
                    
                    '& .MuiDataGrid-withBorderColor': { borderColor: 'var(--palette-background-neutral)' },
                    
                    '& .MuiDataGrid-cell': {
                        color: 'inherit', fontSize: "0.875rem", display: 'flex', alignItems: 'center',
                    },

                    '& .MuiDataGrid-row:hover, & .MuiDataGrid-row.Mui-hovered': {
                        backgroundColor: 'transparent',
                    },

                    '& .MuiDataGrid-row:hover .MuiDataGrid-cell, & .MuiDataGrid-row.Mui-hovered .MuiDataGrid-cell': {
                        backgroundColor: 'transparent',
                    },
                    
                    '& .MuiDataGrid-toolbarContainer': {
                        color: 'inherit', position: 'sticky', top: 0, zIndex: 4, background: 'var(--palette-background-paper)', borderBottom: `none`,
                    },
                    
                    '& .MuiCheckbox-root': {
                        color: 'var(--palette-text-disabled)',
                        '&.Mui-checked, &.Mui-indeterminate': { color: 'var(--palette-primary-main)' },
                    },
                    
                    '& .MuiFormControl-root': { color: 'inherit' },
                    '& .MuiInputLabel-root': { color: 'var(--palette-text-secondary)' },
                    '& .MuiInputLabel-root.Mui-focused': { color: 'var(--palette-text-primary)' },
                    
                    '& .MuiOutlinedInput-root': {
                        color: 'var(--palette-text-primary)',
                        '& fieldset': { borderColor: 'rgba(145 158 171 / 20%)' },
                        '&:hover fieldset': { borderColor: 'rgba(145 158 171 / 40%)' },
                        '&.Mui-focused fieldset': { borderColor: 'var(--palette-text-primary)' },
                    },
                    
                    '& .MuiDataGrid-actionsCell .MuiIconButton-root': { color: 'var(--palette-text-secondary)' },
                    '& .MuiDataGrid-actionsCell .MuiSvgIcon-root': { fontSize: '1.25rem' },

                    '& .MuiDataGrid-columnsManagement .MuiCheckbox-root.Mui-disabled': { color: 'var(--palette-text-disabled)' },
                    '& .MuiDataGrid-columnsManagement .MuiTypography-root.Mui-disabled': { color: 'var(--palette-text-disabled)' },
                    '& .MuiDataGrid-columnsManagementHeader': { padding: '20px 16px', borderBottom: `1px solid var(--palette-background-neutral)` },
                    '& .MuiDataGrid-columnsManagementSearchInput .MuiOutlinedInput-root': {
                        fontSize: '1rem', padding: '0 14px', color: 'var(--palette-text-primary)', borderRadius: "var(--shape-borderRadius)", lineHeight: '24px', height: '56px'
                    },
                    '& .MuiDataGrid-columnsManagementSearchInput .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: 'var(--palette-text-primary)', borderWidth: '2px' },
                    '& .MuiDataGrid-columnsManagementSearchInput .MuiSvgIcon-root': { fontSize: '1.25rem', color: 'var(--palette-text-secondary)' },
                    '& .MuiDataGrid-columnsManagement': { padding: '4px 12px', display: 'flex', flexDirection: 'column', gap: '4px' },
                    '& .MuiTypography-root': { fontSize: '0.875rem !important' },
                    '& .MuiDataGrid-columnsManagementFooter': {
                        padding: '12px 8px 12px 12px',
                        '& .MuiButton-text': {
                            padding: '6px 8px', fontWeight: '700', fontSize: '0.875rem', textTransform: 'none',
                            borderRadius: "var(--shape-borderRadius)", color: 'var(--palette-text-primary)',
                            '&:hover': { background: 'var(--palette-action-hover)' },
                            '&.Mui-disabled': { color: 'var(--palette-text-disabled)', opacity: 0.48 }
                        }
                    },
                },

                panel: {
                    '& .MuiPaper-root': {
                        ...backgroundPopup,
                    }
                },
                menu: {
                    '& .MuiPaper-root': {
                        ...backgroundPopup,
                    }
                },
                panelContent: {
                    ...backgroundPopup,
                },
            }
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    padding: "0",
                    backgroundImage: "none !important",
                    backdropFilter: "none !important",
                    backgroundColor: "var(--palette-background-paper) !important",
                    boxShadow: "var(--customShadows-card)",
                    borderRadius: "var(--shape-borderRadius-lg)",
                    color: "var(--palette-text-primary)",
                }
            }
        },
        MuiFormHelperText: {
            styleOverrides: {
                root: {
                    fontSize: '0.75rem', fontWeight: '500', marginTop: '6px',
                    marginLeft: '12px', marginRight: '12px',
                    '&.Mui-error': { color: '#FF5630 !important' }
                }
            }
        },
        MuiIconButton: {
            styleOverrides: {
                root: {
                    '--IconButton-hoverBg': 'rgba(99, 115, 129, 0.08)',
                },
            },
        },
        MuiTooltip: {
            styleOverrides: {
                tooltip: {
                    fontSize: "0.6875rem",
                    backgroundColor: "#1C252E",
                    borderRadius: "6px",

                }
            }
        },
        MuiTablePagination: {
            styleOverrides: {
                root: {
                    borderTop: '1px solid var(--palette-divider)',
                    color: 'var(--palette-text-secondary)',
                    fontSize: '0.875rem',
                },
                selectLabel: {
                    fontSize: '0.875rem',
                    color: 'var(--palette-text-secondary)',
                },
                displayedRows: {
                    fontSize: '0.875rem',
                    color: 'var(--palette-text-secondary)',
                },
            },
        },
    },
});
