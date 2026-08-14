"use client";

import { POLICY_PAGE_KEYS } from "../services/staticPageService";
import { StaticPagesHub } from "./StaticPagesHub";

export const PolicySettingsTab = () => <StaticPagesHub pages={POLICY_PAGE_KEYS} />;
