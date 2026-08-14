"use client";

import { CONTENT_PAGE_KEYS } from "../services/staticPageService";
import { StaticPagesHub } from "./StaticPagesHub";

/** Trang thông tin — cùng tab đen với Chính sách, không hiện mô tả footer. */
export const ContentPagesTab = () => {
    return <StaticPagesHub pages={CONTENT_PAGE_KEYS} />;
};
