import { Stack, Box, Divider } from "@mui/material"
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'

import { memo, useEffect, useState, useCallback, useRef } from "react";
import { ImageInsertButton } from "./sections/ImageInsertButton";
import { LinkButtons } from "./sections/LinkButtons";
import { Heading } from "./sections/Heading";
import { AlignmentButtons } from "./sections/AlignmentButtons"
import { FormatButtons } from "./sections/FormatButtons"
import { UtilityButtons } from "./sections/UtilityButtons"
import { editorContainerStyles, tiptapContentStyles, editorHeadingStyles } from "./TiptapStyles"
import { getExtensions } from "./TiptapExtensions";
import { FullscreenControl } from "./sections/FullscreenControl";

const VerticalDivider = memo(() => (
    <Divider sx={{
        borderWidth: "0px thin 0px 0px",
        borderColor: "#919eab33",
        height: "16px"
    }} />
));
VerticalDivider.displayName = 'VerticalDivider';

interface TiptapProps {
    value?: string;
    onChange?: (content: string) => void;
}

export const Tiptap = memo(({ value = '', onChange }: TiptapProps) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    const emitChange = useCallback((html: string) => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
            onChange?.(html);
        }, 300);
    }, [onChange]);

    const editor = useEditor({
        extensions: getExtensions("Hãy viết điều gì đó tuyệt vời..."),
        content: value,
        immediatelyRender: true,
        shouldRerenderOnTransaction: false,
        onUpdate: ({ editor }) => {
            emitChange(editor.getHTML());
        },
    });

    const formatState = useEditorState({
        editor,
        selector: ({ editor }) => ({
            bold: editor.isActive("bold"),
            italic: editor.isActive("italic"),
            underline: editor.isActive("underline"),
            strike: editor.isActive("strike"),
        }),
    });

    const alignState = useEditorState({
        editor,
        selector: ({ editor }) => ({
            left: editor.isActive({ textAlign: "left" }),
            center: editor.isActive({ textAlign: "center" }),
            right: editor.isActive({ textAlign: "right" }),
            justify: editor.isActive({ textAlign: "justify" }),
        }),
    });

    const linkActive = useEditorState({
        editor,
        selector: ({ editor }) => editor.isActive("link"),
    });

    const utilityState = useEditorState({
        editor,
        selector: ({ editor }) => ({
            canHardBreak: editor.can().setHardBreak(),
            canClearMarks:
                editor.can().unsetAllMarks() ||
                editor.can().clearNodes(),
        }),
    });

    const toggleFullscreen = useCallback(() => setIsFullscreen(!isFullscreen), [isFullscreen]);

    useEffect(() => {
        // 1. Xử lý phím ESC
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFullscreen) {
                setIsFullscreen(false);
            }
        };

        // 2. Ẩn Scroll khi Fullscreen
        if (isFullscreen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleKeyDown);
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isFullscreen]);

    // Trong file Tiptap.tsx
    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value || "");
        }
    }, [value, editor]);

    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    return (
        <Stack gap="12px" sx={{
            backgroundColor: isFullscreen ? "#1c252e7a" : "#fff"
        }}>

            {isFullscreen && (
                <Box
                    onClick={toggleFullscreen}
                    sx={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        bgcolor: 'rgba(28, 37, 46, 0.48)',
                        zIndex: 9998,
                        backdropFilter: 'blur(4px)',
                    }}
                />
            )}
            <Box
                sx={{
                    ...editorContainerStyles,

                    ...(isFullscreen && {
                        position: 'fixed',
                        top: "16px",
                        left: "16px",
                        width: 'calc(100vw - 32px)',
                        height: 'calc(100vh - 32px)',
                        maxHeight: 'none',
                        zIndex: 9999,
                        bgcolor: '#fff',
                        borderRadius: '8px',
                    }),
                    transition: 'all 0.2s ease-in-out',
                }}
            >
                <Stack sx={editorHeadingStyles}>
                    <Heading editor={editor} />
                    <VerticalDivider />
                    <FormatButtons
                        editor={editor}
                        state={{
                            isBold: formatState.bold,
                            isItalic: formatState.italic,
                            isUnderline: formatState.underline,
                            isStrike: formatState.strike,
                        }}
                    />
                    <VerticalDivider />
                    <AlignmentButtons
                        editor={editor}
                        state={{
                            isLeft: alignState.left,
                            isCenter: alignState.center,
                            isRight: alignState.right,
                            isJustify: alignState.justify,
                        }}
                    />
                    <VerticalDivider />
                    <div className="flex items-center gap-1">
                        <LinkButtons editor={editor} active={linkActive} />
                        <ImageInsertButton editor={editor} />
                    </div>
                    <VerticalDivider />
                    <UtilityButtons
                        editor={editor}
                        state={utilityState}
                    />
                    <VerticalDivider />
                    <FullscreenControl isFullscreen={isFullscreen} onToggle={toggleFullscreen} />
                </Stack>

                <Box sx={tiptapContentStyles}>
                    <EditorContent style={{
                        height: "100%"
                    }} spellCheck="false" autoCapitalize="off" autoComplete="off" editor={editor} />
                </Box>
            </Box>
        </Stack >
    );
});
