import { memo } from "react";
import { Editor } from '@tiptap/react';
import { useTranslation } from "react-i18next";
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
    const { t } = useTranslation();
    if (!editor) return null;

    const FORMAT_BUTTONS = [
        {
            key: "bold",
            title: t("admin.tiptap.toolbar.bold"),
            icon: <BoldIcon />,
            action: (editor: Editor) => editor.chain().focus().toggleBold().run(),
            activeKey: "isBold" as const,
        },
        {
            key: "italic",
            title: t("admin.tiptap.toolbar.italic"),
            icon: <ItalicIcon />,
            action: (editor: Editor) => editor.chain().focus().toggleItalic().run(),
            activeKey: "isItalic" as const,
        },
        {
            key: "underline",
            title: t("admin.tiptap.toolbar.underline"),
            icon: <UnderlineIcon />,
            action: (editor: Editor) => editor.chain().focus().toggleUnderline().run(),
            activeKey: "isUnderline" as const,
        },
        {
            key: "strike",
            title: t("admin.tiptap.toolbar.strike"),
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
