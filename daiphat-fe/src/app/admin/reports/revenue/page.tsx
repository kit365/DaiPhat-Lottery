import { RevenueReportPage } from "@/admin/features/reports/components/pages/RevenueReportPage";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Báo cáo doanh thu & đối soát",
};

export default function Page() {
    return <RevenueReportPage />;
}
