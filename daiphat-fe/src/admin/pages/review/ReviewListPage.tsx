import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { ReviewList } from "./sections/ReviewList";
import { Title } from "../../components/ui/Title";
import { prefixAdmin } from "../../constants/routes";

export const ReviewListPage = () => {
    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Danh sách đánh giá" />
                    <Breadcrumb
                        items={[
                            { label: "Bảng điều khiển", to: "/" },
                            { label: "Đánh giá", to: `/${prefixAdmin}/review` },
                            { label: "Danh sách" }
                        ]}
                    />
                </div>
            </div>
            <ReviewList />
        </>
    );
};
