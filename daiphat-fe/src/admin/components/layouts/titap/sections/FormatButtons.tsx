"use client";

import { memo } from "react";
import { Editor } from '@tiptap/react';
import { BoldIcon, ItalicIcon, UnderlineIcon, StrikeIcon } from "../../../../assets/icons";
import { ButtonTiptap } from "./ButtonTiptap";

interface BasicFormattingProps {
    editor: Editor | null;
    state: {
        isBold: boolean;
        isItalic: boolean;
        isUnderline: boolean;
        isStrike: boolean;
    };
}

export const FormatButtons = memo(({ editor, state }: BasicFormattingProps) => {
    if (!editor) return null;

    const FORMAT_BUTTONS = [
        {
            key: "bold",
            title: "In đậm (Ctrl + B)",
            icon: <BoldIcon />,
            action: (editor: Editor) => editor.chain().focus().toggleBold().run(),
            activeKey: "isBold" as const,
        },
        {
            key: "italic",
            title: "In nghiêng (Ctrl + I)",
            icon: <ItalicIcon />,
            action: (editor: Editor) => editor.chain().focus().toggleItalic().run(),
            activeKey: "isItalic" as const,
        },
        {
            key: "underline",
            title: "Gạch chân (Ctrl + U)",
            icon: <UnderlineIcon />,
            action: (editor: Editor) => editor.chain().focus().toggleUnderline().run(),
            activeKey: "isUnderline" as const,
        },
        {
            key: "strike",
            title: "Gạch ngang",
            icon: <StrikeIcon />,
            action: (editor: Editor) => editor.chain().focus().toggleStrike().run(),
            activeKey: "isStrike" as const,
        },
    ];

    return (
        <div className="flex items-center gap-1">
            {FORMAT_BUTTONS.map(btn => (
                <ButtonTiptap
                    key={btn.key}
                    title={btn.title}
                    active={state[btn.activeKey]}
                    onClick={() => btn.action(editor)}
                >
                    {btn.icon}
                </ButtonTiptap>
            ))}
        </div>
    );
});
