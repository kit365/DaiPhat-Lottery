import { PageHeader } from "../../../../components/ui/PageHeader";
import { prefixAdmin } from "../../../../constants/routes";
import { OrderList } from "../sections/OrderList";

export const OrderListPage = () => {
    return (
        <>
            <PageHeader
                title="Danh sách đơn hàng"
                breadcrumbItems={[
                    { label: "Bảng điều khiển", to: `/${prefixAdmin}` },
                    { label: "Danh sách đơn hàng" }
                ]}
            />

            <OrderList />
        </>
    );
};
