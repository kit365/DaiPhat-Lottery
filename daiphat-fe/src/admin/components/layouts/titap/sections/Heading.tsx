"use client";

import { memo, useState } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import { ArrowIcon } from "../../../../assets/icons";
import {
    ButtonBase,
    ClickAwayListener,
    MenuItem,
    MenuList,
    Paper,
    Popper,
} from "@mui/material";

type BlockType = "paragraph" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

const BLOCK_STYLE: Record<
    BlockType,
    { fontSize: string; fontWeight: number }
> = {
    paragraph: { fontSize: "0.875rem", fontWeight: 400 },
    h1: { fontSize: "1.0625rem", fontWeight: 700 },
    h2: { fontSize: "1rem", fontWeight: 700 },
    h3: { fontSize: "0.9375rem", fontWeight: 700 },
    h4: { fontSize: "0.875rem", fontWeight: 700 },
    h5: { fontSize: "0.8125rem", fontWeight: 700 },
    h6: { fontSize: "0.75rem", fontWeight: 700 },
};

const BLOCK_TYPES = [
    { label: "Đoạn văn", value: "paragraph" as const },
    { label: "Tiêu đề 1", value: "h1" as const, level: 1 as const },
    { label: "Tiêu đề 2", value: "h2" as const, level: 2 as const },
    { label: "Tiêu đề 3", value: "h3" as const, level: 3 as const },
    { label: "Tiêu đề 4", value: "h4" as const, level: 4 as const },
    { label: "Tiêu đề 5", value: "h5" as const, level: 5 as const },
    { label: "Tiêu đề 6", value: "h6" as const, level: 6 as const },
];

export const Heading = memo(({ editor }: { editor: Editor | null }) => {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const openMenu = Boolean(anchorEl);

    const currentBlock = useEditorState({
        editor,
        selector: ({ editor }) => {
            if (editor?.isActive("heading", { level: 1 })) return "h1";
            if (editor?.isActive("heading", { level: 2 })) return "h2";
            if (editor?.isActive("heading", { level: 3 })) return "h3";
            if (editor?.isActive("heading", { level: 4 })) return "h4";
            if (editor?.isActive("heading", { level: 5 })) return "h5";
            if (editor?.isActive("heading", { level: 6 })) return "h6";
            return "paragraph";
        },
    });

    if (!editor) return null;

    const currentLabel =
        BLOCK_TYPES.find((b) => b.value === currentBlock)?.label ??
        "Đoạn văn";

    const handleSelect = (type: BlockType, level?: 1 | 2 | 3 | 4 | 5 | 6) => {
        if (type === "paragraph") {
            editor.chain().focus().setParagraph().run();
        } else if (level) {
            editor.chain().focus().toggleHeading({ level }).run();
        }
        setAnchorEl(null);
    };

    return (
        <>
            <ButtonBase
                onClick={(e) => setAnchorEl(anchorEl ? null : e.currentTarget)}
                sx={{
                    px: "8px",
                    borderRadius: "6px",
                    width: "120px",
                    height: "32px",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    border: "1px solid #919eab33",
                    justifyContent: "space-between",
                }}
            >
                {currentLabel}
                <ArrowIcon
                    style={{
                        transform: openMenu ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "0.2s",
                    }}
                />
            </ButtonBase>

            <Popper open={openMenu} anchorEl={anchorEl} placement="bottom-start">
                <ClickAwayListener onClickAway={() => setAnchorEl(null)}>
                    <Paper sx={{ width: anchorEl?.clientWidth }}>
                        <MenuList>
                            {BLOCK_TYPES.map((item) => (
                                <MenuItem
                                    key={item.value}
                                    selected={item.value === currentBlock}
                                    onClick={() =>
                                        handleSelect(item.value, item.level)
                                    }
                                    sx={{
                                        px: "8px",
                                        fontSize: BLOCK_STYLE[item.value as BlockType].fontSize,
                                        fontWeight: BLOCK_STYLE[item.value as BlockType].fontWeight,

                                        "&.Mui-selected": {
                                            backgroundColor: "#919eab29",
                                        },
                                        "&.Mui-selected:hover": {
                                            backgroundColor: "#919eab3d",
                                        },
                                    }}
                                >
                                    {item.label}
                                </MenuItem>
                            ))}
                        </MenuList>
                    </Paper>
                </ClickAwayListener>
            </Popper>
        </>
    );
});

Heading.displayName = "Heading";
