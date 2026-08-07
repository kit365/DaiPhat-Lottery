"use client";

import { memo, useCallback } from "react";
import type { Editor } from "@tiptap/react";
import { HardBreakIcon, ClearFormatIcon } from "../../../../assets/icons";
import { ButtonTiptap } from "./ButtonTiptap";

interface UtilityButtonsProps {
    editor: Editor | null;
    state: {
        canHardBreak: boolean;
        canClearMarks: boolean;
    };
}

export const UtilityButtons = memo(
    ({ editor, state }: UtilityButtonsProps) => {
        const handleHardBreak = useCallback(() => {
            editor?.chain().focus().setHardBreak().run();
        }, [editor]);

        const handleClearMarks = useCallback(() => {
            editor
                ?.chain()
                .focus()
                .unsetAllMarks()
                .clearNodes()
                .run();
        }, [editor]);

        if (!editor) return null;

        return (
            <div className="flex items-center gap-1">
                <ButtonTiptap
                    title="Xuống dòng cứng (Shift + Enter)"
                    onClick={handleHardBreak}
                    disabled={!state.canHardBreak}
                >
                    <HardBreakIcon />
                </ButtonTiptap>

                <ButtonTiptap
                    title="Xoá định dạng"
                    onClick={handleClearMarks}
                    disabled={!state.canClearMarks}
                >
                    <ClearFormatIcon />
                </ButtonTiptap>
            </div>
        );
    }
);

UtilityButtons.displayName = "UtilityButtons";
