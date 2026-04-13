import { useTranslation } from "react-i18next";
import { GridLocaleText } from "@mui/x-data-grid";
import { useMemo } from "react";

export const useDataGridLocale = (): Partial<GridLocaleText> => {
    const { t } = useTranslation();

    const localeText = useMemo(() => ({
        // Filter
        filterPanelDeleteIconLabel: t("admin.datagrid.filterPanelDeleteIconLabel"),
        filterPanelLogicOperator: t("admin.datagrid.filterPanelLinkOperator"),
        filterPanelOperator: t("admin.datagrid.filterPanelOperators"),
        filterPanelColumns: t("admin.datagrid.filterPanelColumns"),
        filterPanelInputLabel: t("admin.datagrid.filterPanelInputLabel"),
        filterPanelInputPlaceholder: t("admin.datagrid.filterPanelInputPlaceholder"),

        filterOperatorContains: t("admin.datagrid.filterOperatorContains"),
        filterOperatorDoesNotContain: t("admin.datagrid.filterOperatorDoesNotContain"),
        filterOperatorEquals: t("admin.datagrid.filterOperatorEquals"),
        filterOperatorDoesNotEqual: t("admin.datagrid.filterOperatorDoesNotEqual"),
        filterOperatorStartsWith: t("admin.datagrid.filterOperatorStartsWith"),
        filterOperatorEndsWith: t("admin.datagrid.filterOperatorEndsWith"),
        filterOperatorIsEmpty: t("admin.datagrid.filterOperatorIsEmpty"),
        filterOperatorIsNotEmpty: t("admin.datagrid.filterOperatorIsNotEmpty"),
        filterOperatorIsAnyOf: t("admin.datagrid.filterOperatorIsAnyOf"),

        // Columns
        toolbarColumns: t("admin.datagrid.toolbarColumns"),
        columnsManagementSearchTitle: t("admin.datagrid.columnsPanelTextFieldLabel"),
        columnsManagementShowHideAllText: t("admin.datagrid.columnsPanelShowAllButton"), // or HideAll? usually combined logic in UI but one key. Checking translation.json.. I have ShowAll and HideAll. MUI uses one text for "Show/Hide All"? No, it has separate buttons.
        // Actually MUI DataGrid `columnsManagementShowHideAllText` is deprecated or specific?
        // Let's check keys I added: columnsPanelShowAllButton, columnsPanelHideAllButton.
        // Default MUI keys are:
        // columnsPanelShowAllButton: 'Show all',
        // columnsPanelHideAllButton: 'Hide all',

        columnsPanelTextFieldLabel: t("admin.datagrid.columnsPanelTextFieldLabel"),
        columnsPanelTextFieldPlaceholder: t("admin.datagrid.columnsPanelTextFieldPlaceholder"),
        columnsPanelDragIconLabel: t("admin.datagrid.columnsPanelDragIconLabel"),
        columnsPanelShowAllButton: t("admin.datagrid.columnsPanelShowAllButton"),
        columnsPanelHideAllButton: t("admin.datagrid.columnsPanelHideAllButton"),

        // Pagination
        paginationRowsPerPage: t("admin.datagrid.paginationRowsPerPage"),
        paginationDisplayedRows: ({ from, to, count }: { from: number, to: number, count: number }) => {
            return t("admin.datagrid.footerTotalVisibleRows")
                .replace("{{from}}", from.toString())
                .replace("{{to}}", to.toString())
                .replace("{{count}}", count === -1 ? "..." : count.toString());
        },

        // Toolbar
        toolbarFilters: t("admin.datagrid.toolbarFilters"),
        toolbarDensity: t("admin.datagrid.toolbarDensity"),
        toolbarDensityLabel: t("admin.datagrid.toolbarDensityLabel"),
        toolbarDensityCompact: t("admin.datagrid.toolbarDensityCompact"),
        toolbarDensityStandard: t("admin.datagrid.toolbarDensityStandard"),
        toolbarDensityComfortable: t("admin.datagrid.toolbarDensityComfortable"),
        toolbarExport: t("admin.datagrid.toolbarExport"),
        toolbarExportLabel: t("admin.datagrid.toolbarExportLabel"),
        toolbarExportCSV: t("admin.datagrid.toolbarExportCSV"),
        toolbarExportPrint: t("admin.datagrid.toolbarExportPrint"),

        // Column Menu
        columnMenuLabel: t("admin.datagrid.columnMenuLabel"),
        columnMenuShowColumns: t("admin.datagrid.columnMenuShowColumns"),
        columnMenuFilter: t("admin.datagrid.columnMenuFilter"),
        columnMenuHideColumn: t("admin.datagrid.columnMenuHideColumn"),
        columnMenuUnsort: t("admin.datagrid.columnMenuUnsort"),
        columnMenuSortAsc: t("admin.datagrid.columnMenuSortAsc"),
        columnMenuSortDesc: t("admin.datagrid.columnMenuSortDesc"),
        columnHeaderSortIconLabel: t("admin.datagrid.columnHeaderSortIconLabel"),

        // Footer
        footerRowSelected: (count: number) => t("admin.datagrid.footerRowSelected").replace("{{count}}", count.toLocaleString()),
        footerTotalRows: t("admin.datagrid.footerTotalRows"),

        // Global
        noRowsLabel: t("admin.datagrid.noRowsLabel"),
        noResultsOverlayLabel: t("admin.datagrid.noResultsOverlayLabel"),
        errorOverlayDefaultLabel: t("admin.datagrid.errorOverlayDefaultLabel"),

    }), [t]);

    return localeText as Partial<GridLocaleText>;
};
