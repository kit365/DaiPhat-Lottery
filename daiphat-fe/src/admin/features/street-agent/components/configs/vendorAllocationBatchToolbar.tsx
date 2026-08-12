"use client";

import {
    Autocomplete,
    Box,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Toolbar,
} from "@mui/material";
import { Search } from "../../../../components/ui/Search";
import { Columns } from "../../../../components/ui/Columns";
import { SettingsList } from "../../../../components/ui/SettingsList";
import { DateRangePicker } from "../../../../components/ui/DateRangePicker";
import type { IGridSettings } from "../../../../shared/data-grid";
import type { StreetAgentProfile } from "../../types/street-agent.type";
import { ALLOCATION_BATCH_STATUS_FILTER_OPTIONS } from "./constants";

/** Đồng bộ chiều cao với Search + DateRangePicker trong admin toolbar */
const toolbarFieldSx = {
    "& .MuiOutlinedInput-root": {
        borderRadius: "8px",
        fontSize: "0.9375rem",
        paddingLeft: "14px",
        paddingRight: "14px",
        bgcolor: "var(--palette-background-paper)",
        minHeight: 56,
        "& fieldset": {
            borderColor: "rgba(145, 158, 171, 0.2)",
        },
        "&:hover fieldset": {
            borderColor: "rgba(145, 158, 171, 0.4)",
        },
        "&.Mui-focused fieldset": {
            borderColor: "#1C252E",
            borderWidth: "1px",
        },
    },
    "& .MuiOutlinedInput-input": {
        py: "16px",
    },
    "& .MuiSelect-select": {
        py: "16px !important",
        minHeight: "unset !important",
        display: "flex",
        alignItems: "center",
    },
    "& .MuiInputLabel-root": {
        fontSize: "0.9375rem",
    },
};

const toolbarFieldWrapSx = {
    display: "flex",
    alignItems: "stretch",
    "& > *": { width: "100%" },
};

export interface VendorAllocationBatchToolbarProps {
    settings: IGridSettings;
    onSettingsChange: React.Dispatch<React.SetStateAction<IGridSettings>>;
    search: string;
    onSearchChange: (value: string) => void;
    profiles: StreetAgentProfile[];
    isLoadingProfiles: boolean;
    profile: StreetAgentProfile | null;
    onProfileChange: (profile: StreetAgentProfile | null) => void;
    getProfileLabel: (profile?: StreetAgentProfile | null) => string;
    status: string;
    onStatusChange: (status: string) => void;
    businessDateFrom: string;
    businessDateTo: string;
    onBusinessDateRangeChange: (range: { startDate: string; endDate: string }) => void;
}

export const VendorAllocationBatchToolbar = ({
    settings,
    onSettingsChange,
    search,
    onSearchChange,
    profiles,
    isLoadingProfiles,
    profile = null,
    onProfileChange,
    getProfileLabel,
    status,
    onStatusChange,
    businessDateFrom,
    businessDateTo,
    onBusinessDateRangeChange,
}: VendorAllocationBatchToolbarProps) => (
    <Toolbar
        className="admin-list-toolbar"
        sx={{
            alignItems: "center",
            flexWrap: { xs: "wrap", lg: "nowrap" },
        }}
    >
        <Box
            className="admin-list-toolbar__search"
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                flex: 1,
                flexWrap: { xs: "wrap", xl: "nowrap" },
                minWidth: 0,
            }}
        >
            <Box sx={{ flex: "1 1 180px", minWidth: 160, maxWidth: { xs: "100%", xl: 220 }, ...toolbarFieldWrapSx }}>
                <Search
                    maxWidth="100%"
                    placeholder="Tìm mã phiếu..."
                    value={search}
                    onChange={onSearchChange}
                />
            </Box>
            <Box sx={{ flex: "1 1 200px", minWidth: 180, maxWidth: { xs: "100%", xl: 260 }, ...toolbarFieldWrapSx }}>
                <Autocomplete
                    options={profiles}
                    loading={isLoadingProfiles}
                    value={profile ?? null}
                    onChange={(_event, value) => onProfileChange(value ?? null)}
                    getOptionLabel={getProfileLabel}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    loadingText="Đang tải danh sách…"
                    noOptionsText="Không tìm thấy người bán vé số"
                    renderInput={(params) => (
                        <TextField {...params} label="Người bán vé số" sx={toolbarFieldSx} />
                    )}
                />
            </Box>
            <Box sx={{ flex: "0 1 150px", minWidth: 140, maxWidth: { xs: "100%", sm: 170 }, ...toolbarFieldWrapSx }}>
                <FormControl fullWidth sx={toolbarFieldSx}>
                    <InputLabel id="vendor-batch-status-label">Trạng thái</InputLabel>
                    <Select
                        labelId="vendor-batch-status-label"
                        label="Trạng thái"
                        value={status}
                        onChange={(event) => onStatusChange(event.target.value)}
                    >
                        <MenuItem value="">Tất cả</MenuItem>
                        {ALLOCATION_BATCH_STATUS_FILTER_OPTIONS.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>
            <Box sx={{ flex: "0 1 240px", minWidth: 220, maxWidth: { xs: "100%", sm: 280 }, ...toolbarFieldWrapSx }}>
                <DateRangePicker
                    label="Ngày kinh doanh"
                    startDate={businessDateFrom}
                    endDate={businessDateTo}
                    onChange={onBusinessDateRangeChange}
                />
            </Box>
        </Box>
        <Box className="admin-list-toolbar__actions" sx={{ flexShrink: 0 }}>
            <Columns />
            <SettingsList settings={settings} onSettingsChange={onSettingsChange} />
        </Box>
    </Toolbar>
);
