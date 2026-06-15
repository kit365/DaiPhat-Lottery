import { Toolbar } from "@mui/material";
import { useMemo, type Dispatch, type SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { IGridSettings } from "../configs/types";
import { Search } from "../../../components/ui/Search";
import { JiraFilter } from "./JiraFilter";
import { Columns } from "../../../components/ui/Columns";
import { Filter } from "../../../components/ui/Filter";
import { ExportButton } from "../../../components/ui/ExportButton";
import { SettingsList } from "../../../components/ui/SettingsList";
import { toolbarStyles } from "../configs/styles.config";
import { useProviders } from "../../provider/hooks/useProvider";
import dayjs from "dayjs";

interface ToolbarProps {
    settings: IGridSettings;
    onSettingsChange: Dispatch<SetStateAction<IGridSettings>>;
    filters: {
        status?: string[];
        batchCode?: string[];
        provider?: string[];
        drawDate?: string[];
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
    const { data: providersData } = useProviders({ size: 1000 });
    
    const filterFields = useMemo(() => {
        const providerList = providersData?.data?.recordList || [];
        const providerOptions = providerList.map((p: any) => ({
            value: (p.id || p._id).toString(),
            label: p.name
        }));

        const today = dayjs().format('YYYY-MM-DD');
        const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');

        return [
            {
                id: 'status',
                label: "Trạng thái",
                options: [
                    { value: 'in_stock', label: "Trong kho" },
                    { value: 'sold', label: "Đã bán" }
                ]
            },
            {
                id: 'provider',
                label: "Nhà đài",
                options: providerOptions
            },
            {
                id: 'drawDate',
                label: "Ngày quay",
                type: 'date' as const,
                options: [
                    { value: today, label: `Hôm nay (${dayjs(today).format('DD/MM/YYYY')})` },
                    { value: tomorrow, label: `Ngày mai (${dayjs(tomorrow).format('DD/MM/YYYY')})` }
                ]
            }
        ];
    }, [providersData]);

    return (
        <Toolbar style={toolbarStyles.root}>
            <div className='flex gap-[calc(2*var(--spacing))] items-center'>
                <JiraFilter
                    fields={filterFields}
                    selectedFilters={{
                        status: filters.status || [],
                        provider: filters.provider || [],
                        drawDate: filters.drawDate || []
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
