import { Toolbar, Box, Button, Badge, SvgIcon } from '@mui/material';
import { useMemo, type Dispatch, type SetStateAction } from 'react';
import { IGridSettings, JiraFilter } from '../../../../../shared/data-grid';
import { Search } from '../../../../../components/ui/Search';
import { Columns } from '../../../../../components/ui/Columns';
import { ExportButton } from '../../../../../components/ui/ExportButton';
import { SettingsList } from '../../../../../components/ui/SettingsList';
import { useStations } from '../../../../station/hooks/useStation';
import { TICKET_STATUS_OPTIONS } from '../../constants/ticket-status.config';
import dayjs from 'dayjs';

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
    const { data: stationsData } = useStations({ limit: 1000 });

    const filterFields = useMemo(() => {
        const stationList = stationsData?.data?.recordList || [];
        const stationOptions = stationList.map((p: any) => ({
            value: (p.id || p._id).toString(),
            label: p.name,
        }));

        const today = dayjs().format('YYYY-MM-DD');
        const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');

        return [
            {
                id: 'status',
                label: 'Trạng thái',
                options: TICKET_STATUS_OPTIONS.map((opt) => ({
                    value: opt.value,
                    label: opt.label,
                })),
            },
            {
                id: 'provider',
                label: 'Nhà đài',
                options: stationOptions,
            },
        ];
    }, [stationsData]);

    return (
        <Toolbar className="admin-list-toolbar">
            <Box className="admin-list-toolbar__search">
                <Search
                    maxWidth="100%"
                    placeholder="Tìm kiếm vé số..."
                    value={filters.search || ''}
                    onChange={onSearchChange}
                />
            </Box>
            <Box className="admin-list-toolbar__actions">
                <JiraFilter
                    fields={filterFields}
                    selectedFilters={{
                        status: filters.status || [],
                        provider: filters.provider || [],
                    }}
                    onFilterChange={onFilterChange}
                    onClearAll={onClearFilters}
                    trigger={({ onClick, totalFilterCount }) => (
                        <Button
                            variant="text"
                            size="small"
                            disableElevation
                            className="admin-list-action-button"
                            onClick={onClick}
                            startIcon={
                                <Badge badgeContent={totalFilterCount} color="primary" variant="dot">
                                    <SvgIcon viewBox="0 0 24 24">
                                        <g fill="none" fillRule="evenodd">
                                            <path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" />
                                            <path
                                                fill="currentColor"
                                                d="M3 4.5A1.5 1.5 0 0 1 4.5 3h15A1.5 1.5 0 0 1 21 4.5v2.086A2 2 0 0 1 20.414 8L15 13.414v7.424a1.1 1.1 0 0 1-1.592.984l-3.717-1.858A1.25 1.25 0 0 1 9 18.846v-5.432L3.586 8A2 2 0 0 1 3 6.586z"
                                            />
                                        </g>
                                    </SvgIcon>
                                </Badge>
                            }
                        >
                            Bộ lọc
                        </Button>
                    )}
                />
                <Columns />
                <ExportButton />
                <SettingsList settings={settings} onSettingsChange={onSettingsChange} />
            </Box>
        </Toolbar>
    );
};
