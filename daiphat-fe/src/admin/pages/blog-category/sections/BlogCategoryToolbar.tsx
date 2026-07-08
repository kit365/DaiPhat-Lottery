import { Toolbar } from "@mui/material";
import { SelectMulti } from "../../../components/ui/SelectMulti";
import { Search } from "../../../components/ui/Search";
import { useBlogCategoryStatuses } from "../../../hooks/useBlogCategory";
import { toolbarStyles } from "../configs/styles.config";
import { ExportImport } from "../../../components/ui/ExportImport";

interface BlogCategoryToolbarProps {
    search: string;
    onSearchChange: (val: string) => void;
    status: string[];
    onStatusChange: (val: string[]) => void;
}

export const BlogCategoryToolbar = ({ search, onSearchChange, status, onStatusChange }: BlogCategoryToolbarProps) => {
    const { data: statuses = [] } = useBlogCategoryStatuses();

    return (
        <Toolbar style={toolbarStyles.root}>
            <div className='flex gap-[calc(2*var(--spacing))] w-full'>
                <SelectMulti 
                    label="Trạng thái" 
                    options={statuses} 
                    value={status}
                    onChange={onStatusChange}
                />
                <div className="flex flex-1 items-center gap-[calc(2*var(--spacing))]">
                    <div className="flex-1">
                        <Search 
                            maxWidth="100%" 
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




