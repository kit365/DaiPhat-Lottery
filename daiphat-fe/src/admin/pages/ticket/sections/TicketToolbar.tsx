import { Toolbar } from "@mui/material";
import { useMemo, type Dispatch, type SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { IGridSettings } from "../configs/types";
import { SelectMulti } from "../../../components/ui/SelectMulti";
import { Search } from "../../../components/ui/Search";
import { JiraFilter } from "./JiraFilter";
import { Columns } from "../../../components/ui/Columns";
import { Filter } from "../../../components/ui/Filter";
import { ExportButton } from "../../../components/ui/ExportButton";
import { SettingsList } from "../../../components/ui/SettingsList";
import { toolbarStyles } from "../configs/styles.config";

interface ToolbarProps {
    settings: IGridSettings;
    onSettingsChange: Dispatch<SetStateAction<IGridSettings>>;
    filters: {
        status?: string[];
        batchCode?: string[];
        provider?: string[];
        search?: string;
    };
    onFilterChange: (fieldId: string, values: string[]) => void;
    onClearFilters: () => void;
    onSearchChange: (search: string) => void;
}

export const TicketToolbar = ({
    settings,
    onSettingsChange,
    filters,
    onFilterChange,
    onClearFilters,
    onSearchChange,
}: ToolbarProps) => {
    const { t } = useTranslation();
    const filterFields = useMemo(() => [
        {
            id: 'status',
            label: "Trạng thái",
            options: [
                { value: 'in_stock', label: "Trong kho", color: '#0052CC', bgColor: '#DEEBFF' },
                { value: 'sold', label: "Đã bán", color: '#006644', bgColor: '#E3FCEF' }
            ]
        },
        {
            id: 'batchCode',
            label: "Lô nhập",
            options: [
                { value: 'B001', label: "B001" },
                { value: 'B002', label: "B002" },
                { value: 'B003', label: "B003" },
                { value: 'B004', label: "B004" }
            ]
        },
        {
            id: 'provider',
            label: "Nhà đài",
            options: [
                { value: '1', label: "Hồ Chí Minh" },
                { value: '2', label: "Đồng Tháp" },
                { value: '3', label: "Cà Mau" }
            ]
        }
    ], []);

    return (
        <Toolbar style={toolbarStyles.root}>
            <div className='flex gap-[calc(2*var(--spacing))] items-center'>
                <JiraFilter
                    fields={filterFields}
                    selectedFilters={{
                        status: filters.status || [],
                        batchCode: filters.batchCode || [],
                        provider: filters.provider || []
                    }}
                    onFilterChange={onFilterChange}
                    onClearAll={onClearFilters}
                />
                <Search
                    placeholder="Tìm kiếm vé số..."
                    value={filters.search || ''}
                    onChange={onSearchChange}
                />
            </div>
            <div>
                <Columns />
                <Filter />
                <ExportButton />
                <SettingsList
                    settings={settings}
                    onSettingsChange={onSettingsChange}
                />
            </div>
        </Toolbar>
    );
};
