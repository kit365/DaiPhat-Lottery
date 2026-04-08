import Box from '@mui/material/Box';
import { SelectMulti } from "../../../components/ui/SelectMulti";
import { Search } from "../../../components/ui/Search";
import { STATUS_OPTIONS } from "../configs/constants";
import { toolbarStyles } from "../configs/styles.config";
import { ExportImport } from "../../../components/ui/ExportImport";

interface ProviderToolbarProps {
    search: string;
    onSearchChange: (val: string) => void;
    status: string[];
    onStatusChange: (val: string[]) => void;
}

export const ProviderToolbar = ({ search, onSearchChange, status, onStatusChange }: ProviderToolbarProps) => {
    return (
        <Box sx={{ ...toolbarStyles.root, display: 'flex', alignItems: 'center' }}>
            <div className='flex gap-[calc(2*var(--spacing))] w-full'>
                <SelectMulti
                    label="Trạng thái"
                    options={STATUS_OPTIONS}
                    value={status}
                    onChange={onStatusChange}
                />
                <div className="flex flex-1 items-center gap-[calc(2*var(--spacing))]">
                    <div className="flex-1 max-w-[400px]">
                        <Search
                            maxWidth="100%"
                            placeholder="Tìm kiếm nhà đài..."
                            value={search}
                            onChange={onSearchChange}
                        />
                    </div>
                </div>
                <ExportImport />
            </div>
        </Box>
    );
};
