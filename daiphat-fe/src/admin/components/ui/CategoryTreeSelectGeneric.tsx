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
    children?: CategoryNode[];
}

interface Props {
    control: Control<any>;
    categories: CategoryNode[]; // Updated interface name
    name?: string;
    label?: string;
    placeholder?: string;
}

export const CategoryTreeSelectGeneric = ({
    control,
    categories,
    name = "categoryId",
    label = "Danh mục",
    placeholder = "Chọn danh mục",
    multiple = false
}: Props & { multiple?: boolean }) => {
    // Hàm render đệ quy các MenuItem
    const renderMenuItems = (
        nodes: CategoryNode[],
        currentValue: any,
        level = 0
    ): React.ReactNode[] => {
        return nodes.reduce((acc: React.ReactNode[], node) => {
            const stringId = (node.id || node._id || "").toString();

            let isSelected = false;
            if (multiple && Array.isArray(currentValue)) {
                isSelected = currentValue.some((val: any) => val?.toString() === stringId);
            } else {
                isSelected = currentValue?.toString() === stringId;
            }

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
                            '&.Mui-checked': { color: '#FF3030' }
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

    const findCategoryNode = (nodes: CategoryNode[], id: string): CategoryNode | undefined => {
        for (const node of nodes) {
            const nodeId = (node.id || node._id || "").toString();
            if (nodeId === id) return node;
            if (node.children?.length) {
                const found = findCategoryNode(node.children, id);
                if (found) return found;
            }
        }
        return undefined;
    };

    const getDescendantIds = (node: CategoryNode): string[] => {
        let ids: string[] = [];
        if (node.children) {
            for (const child of node.children) {
                const childId = (child.id || child._id || "").toString();
                ids.push(childId);
                ids = ids.concat(getDescendantIds(child));
            }
        }
        return ids;
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

    const findAncestorIds = (nodes: CategoryNode[], targetId: string, currentPath: string[] = []): string[] | undefined => {
        for (const node of nodes) {
            const nodeId = (node.id || node._id || "").toString();
            if (nodeId === targetId) return currentPath;
            if (node.children?.length) {
                const found = findAncestorIds(node.children, targetId, [...currentPath, nodeId]);
                if (found) return found;
            }
        }
        return undefined;
    };

    return (
        <Controller
            name={name}
            control={control}
            render={({ field, fieldState }) => {
                const value = multiple
                    ? (Array.isArray(field.value) ? field.value : [])
                    : (field.value?.toString() ?? "");

                return (
                    <FormControl fullWidth error={!!fieldState.error}>
                        <InputLabel shrink>{label}</InputLabel>
                        <Select
                            {...field}
                            multiple={multiple}
                            displayEmpty
                            value={value}
                            input={<OutlinedInput label={label} notched />}
                            onChange={(event) => {
                                if (!multiple) {
                                    field.onChange(event);
                                    return;
                                }

                                const newValue = event.target.value as string[];
                                const oldValue = (field.value as string[]) || [];

                                // Find what changed
                                const added = newValue.filter(x => !oldValue.includes(x));
                                const removed = oldValue.filter(x => !newValue.includes(x));

                                let finalValue = [...newValue];

                                if (added.length > 0) {
                                    const addedId = added[0];
                                    const node = findCategoryNode(categories, addedId);
                                    if (node) {
                                        // Auto-select descendants
                                        const descendants = getDescendantIds(node);
                                        descendants.forEach(dId => {
                                            if (!finalValue.includes(dId)) {
                                                finalValue.push(dId);
                                            }
                                        });

                                        // Auto-select ancestors
                                        const ancestors = findAncestorIds(categories, addedId);
                                        if (ancestors) {
                                            ancestors.forEach(aId => {
                                                if (!finalValue.includes(aId)) {
                                                    finalValue.push(aId);
                                                }
                                            });
                                        }
                                    }
                                }

                                if (removed.length > 0) {
                                    const removedId = removed[0];
                                    const node = findCategoryNode(categories, removedId);
                                    if (node) {
                                        const descendants = getDescendantIds(node);
                                        finalValue = finalValue.filter(id => !descendants.includes(id));
                                    }
                                }

                                field.onChange(finalValue);
                            }}
                            renderValue={(selected) => {
                                if (multiple) {
                                    if (!Array.isArray(selected) || selected.length === 0) {
                                        return <Box sx={{ color: "#919EAB" }}>{placeholder}</Box>;
                                    }
                                    const names = selected.map((id: any) => findCategoryName(categories, id.toString()) ?? id);
                                    return names.join(", ");
                                } else {
                                    if (!selected || selected === "") {
                                        return <Box sx={{ color: "#919EAB" }}>{placeholder}</Box>;
                                    }
                                    const name = findCategoryName(categories, selected.toString());
                                    return name ?? "Danh mục không tồn tại";
                                }
                            }}
                            MenuProps={{
                                PaperProps: {
                                    sx: {
                                        maxHeight: 350,
                                        '& .Mui-selected': {
                                            backgroundColor: '#FF303014 !important',
                                        },
                                    }
                                }
                            }}
                        >
                            {renderMenuItems(categories, value)}
                        </Select>

                        {/* Hiển thị lỗi đỏ dưới field nếu có lỗi validation */}
                        {fieldState.error && (
                            <Box sx={{ color: 'error.main', fontSize: '0.75rem', mt: 1, ml: 2 }}>
                                {fieldState.error.message}
                            </Box>
                        )}
                    </FormControl>
                )
            }}
        />
    );
};
