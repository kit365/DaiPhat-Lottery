"use client";

import { memo } from "react";
import { Editor } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import { ButtonTiptap } from "./ButtonTiptap";
import { AlignLeftIcon, AlignCenterIcon, AlignRightIcon, AlignJustifyIcon } from "../../../../assets/icons";

interface AlignmentButtonsProps {
    editor: Editor | null;
    state: {
        isLeft: boolean;
        isCenter: boolean;
        isRight: boolean;
        isJustify: boolean;
    };
}

export const AlignmentButtons = memo(({ editor, state }: AlignmentButtonsProps) => {
    const { t } = useTranslation();
    if (!editor) return null;

    const alignments = [
        { value: 'left', icon: <AlignLeftIcon />, title: t("admin.tiptap.toolbar.align_left"), key: 'isLeft' as const },
        { value: 'center', icon: <AlignCenterIcon />, title: t("admin.tiptap.toolbar.align_center"), key: 'isCenter' as const },
        { value: 'right', icon: <AlignRightIcon />, title: t("admin.tiptap.toolbar.align_right"), key: 'isRight' as const },
        { value: 'justify', icon: <AlignJustifyIcon />, title: t("admin.tiptap.toolbar.align_justify"), key: 'isJustify' as const },
    ];

    const handleAlign = (value: string) => {
        editor.chain().focus().setTextAlign(value as any).run();
    };


    return (
        <div className="flex items-center gap-1">
            {alignments.map(item => (
                <ButtonTiptap
                    key={item.value}
                    title={item.title}
                    active={state[item.key]}
                    onClick={() => handleAlign(item.value)}
                >
                    {item.icon}
                </ButtonTiptap>
            ))}
        </div>
    );
});
