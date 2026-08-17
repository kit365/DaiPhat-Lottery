"use client";

import { Box, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import type { ImportBatchFileMapping } from '../../types/importBatch.type';

/** Every mapping key that points at a column of the file. */
export type ImportBatchFileMappingField =
    | 'drawDateColumn'
    | 'stationCodeColumn'
    | 'stationColumn'
    | 'numbersColumn'
    | 'serialsColumn'
    | 'ticketImageColumn'
    | 'quantityColumn'
    | 'importCostColumn'
    | 'salePriceColumn'
    | 'commissionRateColumn';

type FieldDefinition = {
    field: ImportBatchFileMappingField;
    label: string;
    hint: string;
    required?: boolean;
};

/**
 * Order matters: this is the order the tags appear in the picker, so the fields
 * an operator reaches for most often come first.
 */
export const IMPORT_BATCH_FILE_FIELDS: FieldDefinition[] = [
    { field: 'drawDateColumn', label: 'Ngày quay', hint: 'Bỏ trống nếu tệp chỉ có một ngày quay' },
    {
        field: 'stationCodeColumn',
        label: 'Mã đài',
        hint: 'Chính xác tuyệt đối; ưu tiên hơn tên nhà đài',
    },
    { field: 'stationColumn', label: 'Nhà đài', hint: 'Bắt buộc', required: true },
    { field: 'numbersColumn', label: 'Dãy số', hint: 'Gán cùng cột sê-ri để nhập luôn vé' },
    { field: 'serialsColumn', label: 'Danh sách sê-ri', hint: 'Nhiều sê-ri trong một ô' },
    { field: 'ticketImageColumn', label: 'Ảnh vé', hint: 'Một ảnh chung, hoặc đủ ảnh cho từng sê-ri' },
    { field: 'quantityColumn', label: 'Số lượng', hint: 'Bắt buộc nếu tệp không có sê-ri' },
    { field: 'importCostColumn', label: 'Giá nhập', hint: 'Chỉ để đối chiếu; hệ thống dùng giá đài' },
    { field: 'salePriceColumn', label: 'Giá bán', hint: 'Chỉ để đối chiếu' },
    { field: 'commissionRateColumn', label: 'Hoa hồng', hint: 'Chỉ để đối chiếu' },
];

const FIELD_COLOR: Record<ImportBatchFileMappingField, string> = {
    drawDateColumn: '#0ea5e9',
    stationCodeColumn: '#4338ca',
    stationColumn: '#6366f1',
    numbersColumn: '#f59e0b',
    serialsColumn: '#10b981',
    ticketImageColumn: '#a855f7',
    quantityColumn: '#64748b',
    importCostColumn: '#94a3b8',
    salePriceColumn: '#0f766e',
    commissionRateColumn: '#7c3aed',
};

/** Spreadsheet-style column label: A, B, ... Z, AA, AB, ... */
const columnLetter = (index: number): string => {
    let label = '';
    let value = index;
    while (value >= 0) {
        label = String.fromCharCode(65 + (value % 26)) + label;
        value = Math.floor(value / 26) - 1;
    }
    return label;
};

type ImportBatchFileColumnTaggerProps = {
    headers: string[];
    sampleRows: Record<string, string>[];
    mapping: ImportBatchFileMapping;
    onChange: (patch: Partial<ImportBatchFileMapping>) => void;
};

const MAX_SAMPLE_ROWS = 10;

/**
 * Shows the uploaded file as a spreadsheet and lets the operator tag each column
 * with the field it feeds.
 */
export const ImportBatchFileColumnTagger = ({
    headers,
    sampleRows,
    mapping,
    onChange,
}: ImportBatchFileColumnTaggerProps) => {
    const fieldOfColumn = (header: string): ImportBatchFileMappingField | '' => {
        const found = IMPORT_BATCH_FILE_FIELDS.find(
            (definition) => mapping[definition.field] === header
        );
        return found ? found.field : '';
    };

    const assign = (header: string, nextField: ImportBatchFileMappingField | '') => {
        const patch: Partial<ImportBatchFileMapping> = {};

        // A column holds at most one field, and a field comes from at most one
        // column, so both sides of the previous pairing are cleared first.
        const previousField = fieldOfColumn(header);
        if (previousField) {
            patch[previousField] = null;
        }
        if (nextField) {
            const columnHoldingField = mapping[nextField];
            if (columnHoldingField && columnHoldingField !== header) {
                patch[nextField] = null;
            }
            patch[nextField] = header;
        }

        onChange(patch);
    };

    const unassigned = IMPORT_BATCH_FILE_FIELDS.filter(
        (definition) => definition.required && !mapping[definition.field]
    );

    const displayedRows = sampleRows.slice(0, MAX_SAMPLE_ROWS);
    const hasMoreRows = sampleRows.length > MAX_SAMPLE_ROWS;

    return (
        <Stack spacing={2}>
            {/* Top Legend Bar */}
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="caption" fontWeight={700} color="#475569" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, mr: 0.5 }}>
                    Các trường dữ liệu:
                </Typography>
                {IMPORT_BATCH_FILE_FIELDS.map((definition) => {
                    const isAssigned = !!mapping[definition.field];
                    const color = FIELD_COLOR[definition.field];
                    return (
                        <Chip
                            key={definition.field}
                            size="small"
                            label={`${definition.label}${definition.required ? ' *' : ''}`}
                            sx={{
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                height: 24,
                                bgcolor: isAssigned ? color : `${color}14`,
                                color: isAssigned ? '#ffffff' : color,
                                border: `1px solid ${isAssigned ? color : `${color}40`}`,
                                transition: 'all 0.2s',
                            }}
                        />
                    );
                })}
            </Stack>

            {/* Unassigned Required Fields Warning Banner */}
            {unassigned.length > 0 && (
                <Box
                    sx={{
                        p: 1.5,
                        px: 2,
                        borderRadius: '12px',
                        bgcolor: '#fff1f2',
                        border: '1px solid #fecdd3',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                        flexWrap: 'wrap',
                    }}
                >
                    <ErrorOutlineIcon sx={{ color: '#e11d48', fontSize: 20 }} />
                    <Typography variant="body2" fontWeight={700} color="#9f1239">
                        Cần gán trường bắt buộc:
                    </Typography>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                        {unassigned.map((definition) => (
                            <Chip
                                key={definition.field}
                                size="small"
                                label={`${definition.label} *`}
                                sx={{
                                    height: 22,
                                    fontSize: '0.75rem',
                                    fontWeight: 800,
                                    bgcolor: '#ffe4e6',
                                    color: '#e11d48',
                                    border: '1px solid #fda4af',
                                }}
                            />
                        ))}
                    </Stack>
                    <Typography variant="caption" color="#be123c" sx={{ ml: { xs: 0, sm: 'auto' }, fontStyle: 'italic' }}>
                        (Chọn trường tương ứng ở tiêu đề cột bên dưới)
                    </Typography>
                </Box>
            )}

            {/* Spreadsheet Table */}
            <Box
                sx={{
                    overflowX: 'auto',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    bgcolor: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
            >
                <Box component="table" sx={{ borderCollapse: 'collapse', minWidth: '100%' }}>
                    <Box component="thead">
                        {/* Spreadsheet column letters (A, B, C, ...) */}
                        <Box component="tr">
                            {headers.map((header, index) => (
                                <Box
                                    component="th"
                                    key={`letter-${header}`}
                                    sx={{
                                        bgcolor: '#f8fafc',
                                        borderBottom: '1px solid #e2e8f0',
                                        borderRight: '1px solid #e2e8f0',
                                        px: 1.5,
                                        py: 0.75,
                                        fontSize: 12,
                                        color: '#64748b',
                                        fontWeight: 800,
                                        textAlign: 'center',
                                    }}
                                >
                                    {columnLetter(index)}
                                </Box>
                            ))}
                        </Box>

                        {/* Column Header & Tagger Dropdown */}
                        <Box component="tr">
                            {headers.map((header) => {
                                const assigned = fieldOfColumn(header);
                                return (
                                    <Box
                                        component="th"
                                        key={`tag-${header}`}
                                        sx={{
                                            borderBottom: '2px solid #e2e8f0',
                                            borderRight: '1px solid #e2e8f0',
                                            p: 1.25,
                                            minWidth: 200,
                                            bgcolor: assigned
                                                ? `${FIELD_COLOR[assigned]}12`
                                                : '#ffffff',
                                            verticalAlign: 'top',
                                            transition: 'background-color 0.2s',
                                        }}
                                    >
                                        <Stack spacing={1}>
                                            <Typography
                                                variant="caption"
                                                fontWeight={800}
                                                sx={{ color: '#0f172a', fontSize: '0.825rem' }}
                                                noWrap
                                            >
                                                {header}
                                            </Typography>
                                            <TextField
                                                select
                                                size="small"
                                                value={assigned}
                                                onChange={(event) =>
                                                    assign(
                                                        header,
                                                        event.target
                                                            .value as ImportBatchFileMappingField | ''
                                                    )
                                                }
                                                sx={{
                                                    '& .MuiOutlinedInput-root': {
                                                        bgcolor: '#ffffff',
                                                        borderRadius: '10px',
                                                        fontSize: 13,
                                                        fontWeight: 600,
                                                        borderColor: assigned ? FIELD_COLOR[assigned] : '#cbd5e1',
                                                    },
                                                }}
                                            >
                                                <MenuItem value="">
                                                    <em style={{ color: '#94a3b8' }}>Bỏ qua cột này</em>
                                                </MenuItem>
                                                {IMPORT_BATCH_FILE_FIELDS.map((definition) => (
                                                    <MenuItem
                                                        key={definition.field}
                                                        value={definition.field}
                                                        sx={{ fontSize: 13, fontWeight: 600 }}
                                                    >
                                                        {definition.label}
                                                        {definition.required ? ' *' : ''}
                                                    </MenuItem>
                                                ))}
                                            </TextField>
                                        </Stack>
                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>

                    {/* Sample Rows Body */}
                    <Box component="tbody">
                        {displayedRows.map((row, rowIndex) => (
                            <Box
                                component="tr"
                                key={rowIndex}
                                sx={{
                                    '&:hover': { bgcolor: '#f8fafc' },
                                    transition: 'background-color 0.15s',
                                }}
                            >
                                {headers.map((header) => {
                                    const assigned = fieldOfColumn(header);
                                    return (
                                        <Box
                                            component="td"
                                            key={header}
                                            sx={{
                                                borderBottom: '1px solid #f1f5f9',
                                                borderRight: '1px solid #f1f5f9',
                                                px: 1.5,
                                                py: 1,
                                                fontSize: 13,
                                                whiteSpace: 'nowrap',
                                                maxWidth: 280,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                color: assigned ? '#0f172a' : '#64748b',
                                                fontWeight: assigned ? 600 : 400,
                                                bgcolor: assigned
                                                    ? `${FIELD_COLOR[assigned]}08`
                                                    : 'transparent',
                                            }}
                                        >
                                            {row[header] || '—'}
                                        </Box>
                                    );
                                })}
                            </Box>
                        ))}

                        {/* Ellipsis / More rows indicator */}
                        {hasMoreRows && (
                            <Box component="tr">
                                <Box
                                    component="td"
                                    colSpan={headers.length}
                                    sx={{
                                        textAlign: 'center',
                                        py: 1.5,
                                        px: 2,
                                        bgcolor: '#f8fafc',
                                        borderBottom: '1px solid #f1f5f9',
                                    }}
                                >
                                    <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#94a3b8' }} />
                                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#94a3b8' }} />
                                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#94a3b8' }} />
                                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, ml: 1, fontSize: '0.85rem' }}>
                                            ... và {sampleRows.length - MAX_SAMPLE_ROWS} dòng dữ liệu khác (chỉ hiển thị 10 dòng mẫu để gán cột)
                                        </Typography>
                                    </Stack>
                                </Box>
                            </Box>
                        )}
                    </Box>
                </Box>
            </Box>
        </Stack>
    );
};
