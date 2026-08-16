"use client";

import type { GridLocaleText } from "@mui/x-data-grid";
import { DATA_GRID_LOCALE_VN } from "@/admin/components/data-grid/localeText.config";

export const useDataGridLocale = (): Partial<GridLocaleText> => DATA_GRID_LOCALE_VN;
