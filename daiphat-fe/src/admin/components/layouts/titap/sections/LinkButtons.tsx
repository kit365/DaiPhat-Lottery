"use client";

import { memo, useState, useCallback } from "react";
import type { Editor } from '@tiptap/react'
import { ButtonTiptap } from "./ButtonTiptap";
import { InsertLinkIcon, RemoveLinkIcon } from "../../../../assets/icons";
import { Button, Popover, Stack, TextField, Typography } from "@mui/material";

interface LinkButtonProps {
    editor: Editor | null;
    active?: boolean;
}

export const LinkButtons = memo(({ editor, active }: LinkButtonProps) => {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [linkUrl, setLinkUrl] = useState('');

    const handleOpen = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        const currentUrl = editor?.getAttributes('link').href || '';
        setLinkUrl(currentUrl);
        setAnchorEl(event.currentTarget);
    }, [editor]);

    const handleClose = useCallback(() => {
        setAnchorEl(null);
        setLinkUrl('');
    }, []);

    const handleApply = useCallback(() => {
        if (!editor) return;

        if (linkUrl.trim() === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
        } else {
            editor.chain()
                .focus()
                .extendMarkRange('link')
                .setLink({ href: linkUrl.trim() })
                .run();
        }
        handleClose();
    }, [editor, linkUrl, handleClose]);

    const handleRemoveLink = useCallback(() => {
        if (editor) {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
        }
    }, [editor]);

    return (
        <>
            <ButtonTiptap
                title="Chèn liên kết"
                active={active}
                onClick={handleOpen}
            >
                <InsertLinkIcon />
            </ButtonTiptap>
            <Popover
                open={Boolean(anchorEl)}
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
                        }
                    }
                }}
            >
                <Typography variant="subtitle2" sx={{ mb: "10px", fontWeight: 600, fontSize: "0.875rem" }}>Đường dẫn</Typography>

                <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Nhập đường dẫn"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        autoFocus
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '8px',
                                fontSize: "0.875rem",
                                padding: "8px 14px",
                                height: "40px",

                                "& input": {
                                    padding: "0"
                                }
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleApply();
                        }}
                    />
                    <Button
                        variant="contained"
                        color="inherit"
                        onClick={handleApply}
                        disabled={!linkUrl.trim()}
                        sx={{
                            bgcolor: linkUrl.trim() ? '#1C252E' : '#919eab3d',
                            color: linkUrl.trim() ? '#fff' : '#919eabcc',
                            fontSize: "0.875rem",
                            fontWeight: "700",
                            borderRadius: '8px',
                            height: '36px',
                            textTransform: 'none',
                            boxShadow: "none",

                            '&:hover': {
                                bgcolor: linkUrl.trim() ? '#1C252E' : '#919eab3d',
                                opacity: linkUrl.trim() ? 0.8 : 1,
                            }
                        }}
                    >
                        Lưu
                    </Button>
                </Stack>
            </Popover>

            <ButtonTiptap
                title="Gỡ liên kết"
                disabled={!active}
                onClick={handleRemoveLink}
                sx={{
                    opacity: !active ? 0.48 : 1,
                    transition: 'opacity 0.2s',
                }}
            >
                <RemoveLinkIcon />
            </ButtonTiptap>
        </>
    );
});
