import { Toolbar } from "@mui/material";
import { useMemo, type Dispatch, type SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { IGridSettings } from "../configs/types";
import { SelectMulti } from "../../../components/ui/SelectMulti";
import { Search } from "../../../components/ui/Search";
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
        stock?: string[];
        search?: string;
    };
    onStatusChange: (status: string[]) => void;
    onStockChange: (stock: string[]) => void;
    onSearchChange: (search: string) => void;
}

export const TicketToolbar = ({
    settings,
    onSettingsChange,
    filters,
    onStatusChange,
    onStockChange,
    onSearchChange,
}: ToolbarProps) => {
    const { t } = useTranslation();
    const statusOptions = useMemo(() => [
        { value: 'active', label: "Đang bán" },
        { value: 'inactive', label: "Ngừng bán" },
        { value: 'draft', label: "Bản nháp" }
    ], []);

    const stockOptions = useMemo(() => [
        { value: 'instock', label: "Còn vé" },
        { value: 'lowstock', label: "Sắp hết vé" },
        { value: 'outofstock', label: "Hết vé" }
    ], []);

    return (
        <Toolbar style={toolbarStyles.root}>
            <div className='flex gap-[calc(2*var(--spacing))] items-stretch'>
                <SelectMulti
                    label="Trạng thái"
                    options={statusOptions}
                    value={filters.status || []}
                    onChange={onStatusChange}
                />
                <SelectMulti
                    label="Tình trạng vé"
                    options={stockOptions}
                    value={filters.stock || []}
                    onChange={onStockChange}
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
