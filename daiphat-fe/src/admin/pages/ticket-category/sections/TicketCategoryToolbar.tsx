import { Toolbar } from "@mui/material";
import { SelectMulti } from "../../../components/ui/SelectMulti";
import { Search } from "../../../components/ui/Search";
import { STATUS_OPTIONS } from "../configs/constants";
import { toolbarStyles } from "../configs/styles.config";
import { ExportImport } from "../../../components/ui/ExportImport";

interface TicketCategoryToolbarProps {
    search: string;
    onSearchChange: (val: string) => void;
    status: string[];
    onStatusChange: (val: string[]) => void;
}

export const TicketCategoryToolbar = ({ search, onSearchChange, status, onStatusChange }: TicketCategoryToolbarProps) => {
    return (
        <Toolbar style={toolbarStyles.root}>
            <div className='flex gap-[calc(2*var(--spacing))] w-full'>
                <SelectMulti
                    label="Trạng thái"
                    options={STATUS_OPTIONS}
                    value={status}
                    onChange={onStatusChange}
                />
                <div className="flex flex-1 items-center gap-[calc(2*var(--spacing))]">
                    <div className="flex-1">
                        <Search
                            maxWidth="100%"
                            placeholder="Tìm kiếm miền/tỉnh thành..."
                            value={search}
                            onChange={onSearchChange}
                        />
                    </div>
                    <ExportImport />
                </div>
            </div>
        </Toolbar>
    );
};
