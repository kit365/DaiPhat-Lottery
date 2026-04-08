import { Title } from "../../components/ui/Title";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { prefixAdmin } from "../../constants/routes";
import { OrderList } from "./sections/OrderList";
export const OrderListPage = () => {
    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Danh sách đơn hàng" />
                    <Breadcrumb
                        items={[
                            { label: "Bảng điều khiển", to: `/${prefixAdmin}` },
                            { label: "Danh sách đơn hàng" }
                        ]}
                    />
                </div>
            </div>

            <OrderList />
        </>
    );
};
