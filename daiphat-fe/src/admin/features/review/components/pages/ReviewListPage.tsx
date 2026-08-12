import { PageHeader } from "@/admin/components/ui/PageHeader";
import { ReviewList } from "../sections/ReviewList";
import { prefixAdmin } from "@/admin/constants/routes";

export const ReviewListPage = () => {
    return (
        <>
            <PageHeader
                title="Danh sách đánh giá"
                breadcrumbItems={[
                    { label: "Bảng điều khiển", to: "/" },
                    { label: "Đánh giá", to: `/${prefixAdmin}/review` },
                    { label: "Danh sách" }
                ]}
            />
            <ReviewList />
        </>
    );
};
