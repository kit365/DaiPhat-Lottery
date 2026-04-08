import { Toolbar } from "@mui/material";
import { Search } from "../../../components/ui/Search";
import { toolbarStyles } from "../configs/styles.config";
import { ExportImport } from "../../../components/ui/ExportImport";

export const TicketAttributeToolbar = ({ search, onSearchChange }: any) => {
    return (
        <Toolbar style={toolbarStyles.root}>
            <div className='flex gap-[calc(2*var(--spacing))] w-full'>
                <div className="flex flex-1 items-center gap-[calc(2*var(--spacing))]">
                    <div className="flex-1">
                        <Search
                            maxWidth="100%"
                            placeholder="Tìm kiếm thông số..."
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
