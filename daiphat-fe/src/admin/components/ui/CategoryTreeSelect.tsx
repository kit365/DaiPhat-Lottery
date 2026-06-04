import {
    Box,
    Checkbox,
    FormControl,
    InputLabel,
    ListItemText,
    MenuItem,
    OutlinedInput,
    Select
} from "@mui/material";
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { Controller, Control } from "react-hook-form";

export interface CategoryNode {
    id?: string;
    _id?: string;
    name?: string;
    label?: string;
    children: CategoryNode[];
}

interface Props {
    control: Control<any>;
    categories: CategoryNode[];
    excludedId?: string;
    name?: string;
    label?: string;
}

export const CategoryParentSelect = ({ control, categories, excludedId, name = "parent", label = "Danh mục cha" }: Props) => {
    // Hàm render đệ quy các MenuItem và ép kiểu value về string
    const renderMenuItems = (
        nodes: CategoryNode[],
        currentValue: any,
        level = 0
    ): React.ReactNode[] => {
        return nodes.reduce((acc: React.ReactNode[], node) => {
            // ID can be id or _id
            const stringId = (node.id || node._id || "").toString();

            // Skip excluded category
            if (excludedId && stringId === excludedId) {
                return acc;
            }

            const isSelected = currentValue?.toString() === stringId;

            const item = (
                <MenuItem
                    key={stringId}
                    value={stringId}
                    sx={{
                        pl: 2 + level * 3,
                        py: '8px',
                        fontSize: '0.875rem',
                        fontWeight: level === 0 ? 600 : 400,
                        gap: '8px'
                    }}
                >
                    <Checkbox
                        checked={isSelected}
                        size="small"
                        sx={{
                            p: 0,
                            color: '#919EAB',
                            '&.Mui-checked': { color: '#00A76F' }
                        }}
                    />

                    <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        {level > 0 && (
                            <SubdirectoryArrowRightIcon
                                sx={{ fontSize: '1rem', color: '#919EAB', mr: 1, opacity: 0.5 }}
                            />
                        )}
                        {level === 0 ? (
                            <FolderIcon sx={{ fontSize: '1.125rem', mr: 1, color: '#FFAB00' }} />
                        ) : (
                            <FolderOpenIcon sx={{ fontSize: '1.125rem', mr: 1, color: '#919EAB' }} />
                        )}
                        <ListItemText
                            primary={node.name || node.label}
                            slotProps={{
                                primary: {
                                    sx: {
                                        fontSize: '0.875rem',
                                        fontWeight: 'inherit',
                                        color: level === 0 ? "#1C252E" : "#637381"
                                    }
                                }
                            }}
                        />
                    </Box>
                </MenuItem>
            );

            acc.push(item);

            if (node.children && node.children.length > 0) {
                acc.push(...renderMenuItems(node.children, currentValue, level + 1));
            }

            return acc;
        }, []);
    };

    const findCategoryName = (nodes: CategoryNode[], id: string): string | undefined => {
        for (const node of nodes) {
            const nodeId = (node.id || node._id || "").toString();
            if (nodeId === id) return node.name || node.label;
            if (node.children?.length) {
                const found = findCategoryName(node.children, id);
                if (found) return found;
            }
        }
        return undefined;
    };

    return (
        <Controller
            name={name}
            control={control}
            render={({ field, fieldState }) => (
                <FormControl fullWidth error={!!fieldState.error}>
                    <InputLabel shrink>{label}</InputLabel>
                    <Select
                        {...field}
                        displayEmpty
                        // Đảm bảo value luôn là string để khớp với Zod Schema
                        value={field.value?.toString() ?? ""}
                        input={<OutlinedInput label={label} notched />}
                        renderValue={(selected) => {
                            if (!selected || selected === "") {
                                return <Box sx={{ color: "#919EAB" }}>Chọn {label.toLowerCase()}</Box>;
                            }
                            const name = findCategoryName(categories, selected.toString());
                            return name ?? "Danh mục không tồn tại";
                        }}
                        MenuProps={{
                            PaperProps: {
                                sx: {
                                    maxHeight: 350,
                                    '& .Mui-selected': {
                                        backgroundColor: '#00A76F14 !important',
                                    },
                                }
                            }
                        }}
                    >
                        {/* Option rỗng để người dùng có thể bỏ chọn về danh mục gốc */}
                        <MenuItem value="">
                            <em style={{ color: '#919EAB' }}>Không có (Danh mục gốc)</em>
                        </MenuItem>

                        {renderMenuItems(categories, field.value)}
                    </Select>

                    {/* Hiển thị lỗi đỏ dưới field nếu có lỗi validation */}
                    {fieldState.error && (
                        <Box sx={{ color: 'error.main', fontSize: '0.75rem', mt: 1, ml: 2 }}>
                            {fieldState.error.message}
                        </Box>
                    )}
                </FormControl>
            )}
        />
    );
};
