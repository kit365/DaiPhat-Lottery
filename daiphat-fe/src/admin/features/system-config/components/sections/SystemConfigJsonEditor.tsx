"use client";

import { useEffect, useState, useMemo } from 'react';
import { Box, Stack, TextField, Switch, FormControlLabel, Typography, Button, Alert } from '@mui/material';
import CodeOutlinedIcon from '@mui/icons-material/CodeOutlined';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';

interface SystemConfigJsonEditorProps {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    helperText?: string;
}

export const SystemConfigJsonEditor = ({ value, onChange, error, helperText }: SystemConfigJsonEditorProps) => {
    const [rawMode, setRawMode] = useState(false);
    const [localRaw, setLocalRaw] = useState(value);
    const [jsonError, setJsonError] = useState<string | null>(null);

    // Synchronize localRaw when value changes from outside (e.g., initial load)
    useEffect(() => {
        try {
            // Pretty print incoming value if it's valid JSON
            const parsed = JSON.parse(value || '{}');
            setLocalRaw(JSON.stringify(parsed, null, 4));
        } catch {
            setLocalRaw(value);
        }
    }, [value]);

    const parsedObj = useMemo(() => {
        try {
            const parsed = JSON.parse(value || '{}');
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return parsed;
            }
        } catch {
            // ignore
        }
        return null;
    }, [value]);

    const isFlatObject = useMemo(() => {
        if (!parsedObj) return false;
        return Object.values(parsedObj).every(
            (v) => v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
        );
    }, [parsedObj]);

    const handleFieldChange = (key: string, newValue: any) => {
        if (!parsedObj) return;
        const updated = { ...parsedObj, [key]: newValue };
        const newJson = JSON.stringify(updated, null, 4);
        setLocalRaw(newJson);
        onChange(JSON.stringify(updated));
    };

    const handleRawChange = (newRaw: string) => {
        setLocalRaw(newRaw);
        try {
            const parsed = JSON.parse(newRaw);
            setJsonError(null);
            // Send standard JSON
            onChange(JSON.stringify(parsed));
        } catch (err: any) {
            setJsonError('JSON không hợp lệ: ' + err.message);
            onChange(newRaw); // still pass string so validation can catch it
        }
    };

    const forceRaw = !parsedObj || !isFlatObject;

    return (
        <Stack spacing={2}>
            {!forceRaw && (
                <Stack direction="row" justifyContent="flex-end">
                    <Button
                        size="small"
                        startIcon={rawMode ? <EditNoteOutlinedIcon /> : <CodeOutlinedIcon />}
                        onClick={() => setRawMode(!rawMode)}
                        color="inherit"
                        sx={{ textTransform: 'none', borderRadius: 2 }}
                    >
                        {rawMode ? 'Sử dụng Form nhập liệu' : 'Chỉnh sửa mã JSON'}
                    </Button>
                </Stack>
            )}

            {(forceRaw || rawMode) ? (
                <Box>
                    <TextField
                        label="Giá trị (JSON)"
                        fullWidth
                        multiline
                        minRows={8}
                        maxRows={15}
                        value={localRaw}
                        onChange={(e) => handleRawChange(e.target.value)}
                        error={!!error || !!jsonError}
                        helperText={jsonError || error || helperText}
                        inputProps={{ style: { fontFamily: 'monospace', fontSize: 13, lineHeight: 1.5 } }}
                    />
                </Box>
            ) : (
                <Stack spacing={2.5} sx={{ p: 2.5, bgcolor: '#f8fafc', borderRadius: 3, border: '1px solid #e2e8f0' }}>
                    <Typography variant="subtitle2" fontWeight={700} color="#0f172a">
                        Thuộc tính cấu hình
                    </Typography>
                    
                    {Object.entries(parsedObj).map(([key, val]) => {
                        const type = typeof val;
                        return (
                            <Box key={key}>
                                <Typography variant="caption" fontWeight={700} color="#334155" sx={{ mb: 0.5, display: 'block', fontFamily: 'monospace' }}>
                                    {key}
                                </Typography>
                                {type === 'boolean' ? (
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={val as boolean}
                                                onChange={(e) => handleFieldChange(key, e.target.checked)}
                                                color="primary"
                                            />
                                        }
                                        label={
                                            <Typography variant="body2" fontWeight={600} color={val ? '#15803d' : 'text.secondary'}>
                                                {val ? 'Bật (true)' : 'Tắt (false)'}
                                            </Typography>
                                        }
                                    />
                                ) : type === 'number' ? (
                                    <TextField
                                        size="small"
                                        fullWidth
                                        type="number"
                                        value={val}
                                        onChange={(e) => handleFieldChange(key, Number(e.target.value))}
                                        sx={{ bgcolor: '#ffffff' }}
                                    />
                                ) : (
                                    <TextField
                                        size="small"
                                        fullWidth
                                        value={val || ''}
                                        onChange={(e) => handleFieldChange(key, e.target.value)}
                                        sx={{ bgcolor: '#ffffff' }}
                                    />
                                )}
                            </Box>
                        );
                    })}
                    {error && (
                        <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>
                    )}
                </Stack>
            )}
        </Stack>
    );
};
