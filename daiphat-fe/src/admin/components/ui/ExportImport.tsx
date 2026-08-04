"use client";

import { Menu, MenuItem, Button, SvgIcon } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import { ExportCsv, ExportPrint } from "@mui/x-data-grid";
import { useRef, useState } from "react";
import { ExportIcon, ImportIcon, PrintIcon } from "../../assets/icons";

const CustomExportImportIcon = (props: any) => (
    <SvgIcon {...props} viewBox="0 0 24 24" sx={{ width: "20px", height: "20px" }}>
        <circle cx="12" cy="12" r="2" fill="#637381"></circle>
        <circle cx="12" cy="5" r="2" fill="#637381"></circle>
        <circle cx="12" cy="19" r="2" fill="#637381"></circle>
    </SvgIcon>
);

interface ExportImportProps {
    onInvite?: () => void;
    inviteLabel?: string;
}

export const ExportImport = ({ onInvite, inviteLabel = "Mời" }: ExportImportProps) => {
    const [open, setOpen] = useState(false);
    const anchorRef = useRef<HTMLButtonElement>(null);

    return (
        <>
            <Button
                ref={anchorRef}
                size="small"
                disableElevation
                onClick={() => setOpen(true)}
                sx={{
                    fontSize: "0.9375rem",
                    borderRadius: "50%",
                    padding: "8px",
                    minWidth: "auto"
                }}
            >
                <CustomExportImportIcon />
            </Button>

            <Menu
                anchorEl={anchorRef.current}
                open={open}
                onClose={() => setOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{ className: 'background-popup' }}
            >
                {onInvite && (
                    <MenuItem 
                        sx={{ gap: "16px", alignItems: "center" }} 
                        onClick={() => {
                            onInvite();
                            setOpen(false);
                        }}
                    >
                        <AddIcon sx={{ fontSize: 20 }} />
                        {inviteLabel}
                    </MenuItem>
                )}
                <ExportPrint render={<MenuItem sx={{ gap: "16px", alignItems: "center" }} />} onClick={() => setOpen(false)}>
                    <PrintIcon />
                    In
                </ExportPrint>
                <ExportCsv render={<MenuItem sx={{ gap: "16px", alignItems: "center" }} />} onClick={() => setOpen(false)}>
                    <ImportIcon />
                    Nhập dữ liệu
                </ExportCsv>
                <ExportCsv render={<MenuItem sx={{ gap: "16px", alignItems: "center" }} />} onClick={() => setOpen(false)}>
                    <ExportIcon />
                    Tải xuống
                </ExportCsv>
            </Menu>
        </>
    );
};
