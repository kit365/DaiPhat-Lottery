"use client";

import { Button, Popover, Stack, TextField, Typography } from "@mui/material";
import { InsertImageIcon } from "../../../../assets/icons";
import { ButtonTiptap } from "./ButtonTiptap";
import { memo, useCallback, useState } from "react";
import type { Editor } from '@tiptap/react'

export const ImageInsertButton = memo(({ editor }: { editor: Editor }) => {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [url, setUrl] = useState('');
    const [alt, setAlt] = useState('');

    const open = Boolean(anchorEl);

    const handleToggle = useCallback(
        (e: React.MouseEvent<HTMLButtonElement>) =>
            setAnchorEl((prev) => (prev ? null : e.currentTarget)),
        []
    );

    const handleClose = useCallback(() => {
        setAnchorEl(null);
        setUrl('');
        setAlt('');
    }, []);

    const handleApply = useCallback(() => {
        if (!url.trim()) return;

        editor
            .chain()
            .focus()
            .setImage({ src: url.trim(), alt: alt.trim() })
            .run();

        handleClose();
    }, [url, alt, editor, handleClose]);

    const inputSx = {
        '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            fontSize: "0.875rem",
            height: "40px",
            mb: "10px",
            "& input": { padding: "8px 14px" },
        },
    };

    return (
        <>
            <ButtonTiptap title="Chèn hình ảnh" onClick={handleToggle}>
                <InsertImageIcon />
            </ButtonTiptap>

            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                slotProps={{
                    paper: {
                        sx: {
                            p: "20px",
                            width: 320,
                            borderRadius: '10px',
                            boxShadow:
                                '0 0 2px 0 rgba(145, 158, 171, 0.24), -20px 20px 40px -4px rgba(145, 158, 171, 0.24)',
                        },
                    },
                }}
            >
                <Typography sx={{ mb: "10px", fontWeight: 600, fontSize: "0.875rem" }}>
                    Thêm hình ảnh
                </Typography>

                <Stack>
                    <TextField
                        fullWidth
                        autoFocus
                        size="small"
                        placeholder="Đường dẫn ảnh"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        sx={inputSx}
                    />

                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Mô tả"
                        value={alt}
                        onChange={(e) => setAlt(e.target.value)}
                        sx={inputSx}
                        onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                    />

                    <Button
                        variant="contained"
                        onClick={handleApply}
                        disabled={!url.trim()}
                        sx={{
                            bgcolor: url.trim() ? '#1C252E' : '#919eab3d',
                            color: url.trim() ? '#fff' : '#919eabcc',
                            fontSize: "0.875rem",
                            fontWeight: 700,
                            borderRadius: '8px',
                            width: "64px",
                            height: '36px',
                            textTransform: 'none',
                            boxShadow: "none",
                            ml: "auto",
                            '&:hover': { bgcolor: '#454F5B' },
                        }}
                    >
                        Lưu
                    </Button>
                </Stack>
            </Popover>
        </>
    );
});
