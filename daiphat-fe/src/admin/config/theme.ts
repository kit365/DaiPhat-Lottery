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
                    fontSize: "0.875rem",
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
                    '&.Mui-checked, &.Mui-checkbox-indeterminate': { color: '#00A76F' },
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
            } as any
        },
        MuiDataGrid: {
            styleOverrides: {
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
                    padding: "0"
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
        }
    },
});