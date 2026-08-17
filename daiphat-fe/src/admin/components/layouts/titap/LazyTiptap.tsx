"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { TiptapSkeleton } from "./TiptapSkeleton";

const TiptapEditor = dynamic(
    () => import("./Tiptap").then((mod) => mod.Tiptap),
    {
        ssr: false,
        loading: () => <TiptapSkeleton />,
    },
);

type LazyTiptapProps = ComponentProps<typeof TiptapEditor>;

export function LazyTiptap(props: LazyTiptapProps) {
    return <TiptapEditor {...props} />;
}
