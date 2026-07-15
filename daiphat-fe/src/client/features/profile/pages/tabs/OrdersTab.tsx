import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { OrderStatus, OrderType, GetMyOrdersParams, OrderResponse } from '../../../../../types/order.type';
import { Pagination } from '../../../../components/common/Pagination';
import { useGetMyOrders, useGetMyOrderDetail } from '../../../../hooks/useOrder';
import { useProcessPayment } from '../../../../hooks/useTransaction';
import { PaymentGateway } from '../../../../../types/transaction.type';
import { isRefundWindowOpen } from '../../../../../types/refund.type';
import { AppToast } from '../../../../../utils/toast.util';
import { RefundRequestModal } from '../../../../components/refund/RefundRequestModal';
import { useGetMyRefunds } from '../../../../hooks/useRefund';
import { OrderRowActionsMenu } from '../components/OrderRowActionsMenu';
import { format } from 'date-fns';

const ORDER_STATUS_MAP: Record<OrderStatus, { label: string, bg: string, text: string }> = {
    [OrderStatus.PENDING_PAYMENT]: { label: 'Chờ thanh toán', bg: 'bg-[#FFF9F3]', text: 'text-[#FFB020]' },
    [OrderStatus.PAID]: { label: 'Đã thanh toán', bg: 'bg-[#E4F8ED]', text: 'text-[#1CD162]' },
    [OrderStatus.PREPARING]: { label: 'Đang chuẩn bị vé', bg: 'bg-[#F0F5FF]', text: 'text-[#2065D1]' },
    [OrderStatus.PENDING_PICKUP]: { label: 'Chờ nhận vé', bg: 'bg-[#F0F5FF]', text: 'text-[#2065D1]' },
    [OrderStatus.COMPLETED]: { label: 'Đã hoàn thành', bg: 'bg-[#E4F8ED]', text: 'text-[#1CD162]' },
    [OrderStatus.CANCELLED]: { label: 'Đã huỷ', bg: 'bg-[#FFF4F4]', text: 'text-[#ee1314]' }
};

const ORDER_TYPE_MAP: Record<OrderType, { label: string, icon: string }> = {
    [OrderType.ONLINE]: { label: 'Online', icon: 'fa-solid fa-desktop' },
    [OrderType.DIRECT]: { label: 'Tại quầy', icon: 'fa-solid fa-store' }
};

export const OrdersTab = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<OrderStatus | 'ALL'>('ALL');
    const [showFilter, setShowFilter] = useState(false);
    const [sortByUI, setSortByUI] = useState('default');
    
    // Filter & Pagination States
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [orderType, setOrderType] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const queryParams: GetMyOrdersParams = {
        page,
        size: 10,
        status: activeTab === 'ALL' ? undefined : activeTab,
        search: searchTerm || undefined,
        orderType: orderType || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
    };

    // Apply Sorting
    if (sortByUI === 'default') {
        queryParams.sortBy = 'createdAt';
        queryParams.direction = 'DESC';
    } else if (sortByUI === 'newest') {
        queryParams.sortBy = 'createdAt';
        queryParams.direction = 'DESC';
    } else if (sortByUI === 'pickup_asc') {
        queryParams.sortBy = 'expectedPickupAt';
        queryParams.direction = 'ASC';
    } else if (sortByUI === 'price_desc') {
        queryParams.sortBy = 'totalAmount';
        queryParams.direction = 'DESC';
    } else if (sortByUI === 'price_asc') {
        queryParams.sortBy = 'totalAmount';
        queryParams.direction = 'ASC';
    }

    const { data: orderData, isLoading } = useGetMyOrders(queryParams);
    const processPaymentMutation = useProcessPayment();

    const [refundOrderId, setRefundOrderId] = useState<string | null>(null);
    const { data: refundOrderData, isLoading: isLoadingRefundOrder } = useGetMyOrderDetail(refundOrderId || '');

    const { data: allRefundsData } = useGetMyRefunds({ limit: 100, page: 1 });
    const pendingRefunds = useMemo(
        () =>
            allRefundsData?.data?.recordList?.filter((r: any) =>
                ['PENDING', 'READY_TO_PAY', 'APPROVED'].includes(r.status)
            ) || [],
        [allRefundsData]
    );

    const handleRequestRefund = (order: OrderResponse) => {
        if (
            !isRefundWindowOpen({
                paymentSuccessAt: order.refundPaymentSuccessAt,
                graceMinutes: order.refundGraceMinutes,
                remainingSeconds: order.refundRemainingSeconds
            })
        ) {
            AppToast.error('Đã hết thời gian yêu cầu hoàn tiền');
            return;
        }
        setRefundOrderId(order.id);
    };

    const handleQuickPayment = (order: OrderResponse) => {
        if (!order?.id) {
            AppToast.error('Không tìm thấy thông tin đơn hàng');
            return;
        }

        const pendingTransaction = order.transactions?.find(
            (transaction: any) => transaction.type === 'ONLINE' && transaction.status === 'PENDING'
        );

        if (!pendingTransaction?.id) {
            AppToast.error('Không còn giao dịch thanh toán khả dụng');
            return;
        }

        processPaymentMutation.mutate({
            orderId: order.id,
            data: {
                transactionId: pendingTransaction.id,
                gateway: pendingTransaction.gateway || PaymentGateway.PAYOS
            }
        }, {
            onSuccess: (paymentRes: any) => {
                if (paymentRes.success && paymentRes.data?.checkoutUrl) {
                    window.location.href = paymentRes.data.checkoutUrl;
                } else {
                    AppToast.error("Không lấy được đường dẫn thanh toán");
                }
            }
        });
    };

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [activeTab, sortByUI, searchTerm, orderType, fromDate, toDate]);

    const orderTabs: { value: OrderStatus | 'ALL', label: string }[] = [
        { value: 'ALL', label: 'Tất cả' },
        { value: OrderStatus.PENDING_PAYMENT, label: 'Chờ thanh toán' },
        { value: OrderStatus.PAID, label: 'Đã thanh toán' },
        { value: OrderStatus.PREPARING, label: 'Đang chuẩn bị vé' },
        { value: OrderStatus.PENDING_PICKUP, label: 'Chờ nhận vé' },
        { value: OrderStatus.COMPLETED, label: 'Đã hoàn thành' },
        { value: OrderStatus.CANCELLED, label: 'Đã huỷ' }
    ];

    const getStatusBadge = (status: OrderStatus) => {
        const config = ORDER_STATUS_MAP[status];
        return (
            <div className={`inline-block ${config.bg} ${config.text} px-2.5 py-1 rounded-md text-[12px] font-medium`}>
                {config.label}
            </div>
        );
    };

    const getOrderTypeDisplay = (type: OrderType) => {
        const config = ORDER_TYPE_MAP[type];
        return (
            <span className="text-[11px] font-medium text-[#637381] bg-[#F4F6F8] px-2 py-0.5 rounded flex items-center gap-1.5 w-max mt-1.5">
                <i className={`${config.icon} text-[10px]`}></i>
                {config.label}
            </span>
        );
    };

    return (
        <div className="flex flex-col gap-5">
            {/* Top Controls: Search & Sort/Filter */}
            <div className="flex flex-col lg:flex-row gap-4 w-full">
                <div className="relative flex-1">
                    <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-[#919EAB] text-[14px]"></i>
                    <input 
                        type="text" 
                        placeholder="Tìm theo mã đơn hàng..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-[#E5E8EB] rounded-xl text-[14px] text-[#212B36] font-medium outline-none focus:border-[#ee1314] transition-colors shadow-[0_2px_8px_rgb(0,0,0,0.02)]"
                    />
                </div>
                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <select 
                        value={sortByUI}
                        onChange={(e) => setSortByUI(e.target.value)}
                        className="px-4 py-3 bg-white border border-[#E5E8EB] rounded-xl text-[14px] text-[#212B36] font-medium outline-none cursor-pointer hover:border-[#919EAB] transition-colors min-w-[180px] shadow-[0_2px_8px_rgb(0,0,0,0.02)]"
                    >
                        <option value="default">Sắp xếp: Mặc định</option>
                        <option value="newest">Mới nhất</option>
                        <option value="pickup_asc">Giờ lấy vé gần nhất</option>
                        <option value="price_desc">Thành tiền: Cao → Thấp</option>
                        <option value="price_asc">Thành tiền: Thấp → Cao</option>
                    </select>
                    
                    <button 
                        onClick={() => setShowFilter(!showFilter)}
                        className={`w-12 h-[46px] border rounded-xl flex items-center justify-center transition-colors shrink-0 cursor-pointer shadow-[0_2px_8px_rgb(0,0,0,0.02)] ${showFilter ? 'bg-[#FFF4F4] border-[#ee1314] text-[#ee1314]' : 'bg-white border-[#E5E8EB] text-[#454F5B] hover:bg-[#F4F6F8]'}`}
                    >
                        <i className="fa-solid fa-filter text-[14px]"></i>
                    </button>
                </div>
            </div>

            {/* Advanced Filters */}
            {showFilter && (
                <div className="p-5 border border-[#E5E8EB] bg-white rounded-xl shadow-[0_2px_8px_rgb(0,0,0,0.02)] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-[12px] font-bold text-[#454F5B]">Loại đơn hàng</label>
                        <select 
                            value={orderType}
                            onChange={(e) => setOrderType(e.target.value)}
                            className="w-full px-3 py-2.5 bg-white border border-[#E5E8EB] rounded-xl text-[13px] text-[#212B36] font-medium outline-none focus:border-[#ee1314] transition-colors cursor-pointer"
                        >
                            <option value="">Tất cả loại đơn</option>
                            <option value={OrderType.ONLINE}>Online (Đặt qua app)</option>
                            <option value={OrderType.DIRECT}>Tại quầy (Staff tạo)</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-2 lg:col-span-2">
                        <label className="text-[12px] font-bold text-[#454F5B]">Khoảng thời gian (Từ ngày - Đến ngày)</label>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <input 
                                    type="date" 
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-white border border-[#E5E8EB] rounded-xl text-[13px] text-[#637381] font-medium outline-none focus:border-[#ee1314] transition-colors cursor-pointer" 
                                />
                            </div>
                            <span className="text-[#919EAB] font-bold">-</span>
                            <div className="relative flex-1">
                                <input 
                                    type="date" 
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-white border border-[#E5E8EB] rounded-xl text-[13px] text-[#637381] font-medium outline-none focus:border-[#ee1314] transition-colors cursor-pointer" 
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Card */}
            <div className="bg-white border border-[#E5E8EB] rounded-[20px] shadow-[0_2px_12px_rgb(0,0,0,0.03)] overflow-hidden">
                {/* Tabs Row */}
                <div className="flex items-center gap-8 overflow-x-auto w-full scrollbar-hide px-6 pt-2 border-b border-[#E5E8EB]">
                    {orderTabs.map(tab => (
                        <button 
                            key={tab.value}
                            onClick={() => setActiveTab(tab.value)}
                            className={`py-3.5 text-[14px] font-bold whitespace-nowrap transition-all cursor-pointer border-b-2 ${activeTab === tab.value ? 'text-[#ee1314] border-[#ee1314]' : 'text-[#637381] border-transparent hover:text-[#212B36]'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Advanced Filters */}
                {showFilter && (
                    <div className="p-5 border-b border-[#E5E8EB] bg-[#FAFBFC] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-[12px] font-bold text-[#454F5B]">Loại đơn hàng</label>
                            <select 
                                value={orderType}
                                onChange={(e) => setOrderType(e.target.value)}
                                className="w-full px-3 py-2.5 bg-white border border-[#E5E8EB] rounded-xl text-[13px] text-[#212B36] font-medium outline-none focus:border-[#ee1314] transition-colors cursor-pointer"
                            >
                                <option value="">Tất cả loại đơn</option>
                                <option value={OrderType.ONLINE}>Online (Đặt qua app)</option>
                                <option value={OrderType.DIRECT}>Tại quầy (Staff tạo)</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-2 lg:col-span-2">
                            <label className="text-[12px] font-bold text-[#454F5B]">Khoảng thời gian (Từ ngày - Đến ngày)</label>
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <input 
                                        type="date" 
                                        value={fromDate}
                                        onChange={(e) => setFromDate(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-white border border-[#E5E8EB] rounded-xl text-[13px] text-[#637381] font-medium outline-none focus:border-[#ee1314] transition-colors cursor-pointer" 
                                    />
                                </div>
                                <span className="text-[#919EAB] font-bold">-</span>
                                <div className="relative flex-1">
                                    <input 
                                        type="date" 
                                        value={toDate}
                                        onChange={(e) => setToDate(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-white border border-[#E5E8EB] rounded-xl text-[13px] text-[#637381] font-medium outline-none focus:border-[#ee1314] transition-colors cursor-pointer" 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Orders List */}
                <div className="flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[960px]">
                            <thead>
                                <tr className="bg-[#F9FAFB] border-b border-[#E5E8EB]">
                                    <th className="py-4 px-5 text-[13px] font-semibold text-[#637381] tracking-wide">Mã đơn hàng</th>
                                    <th className="py-4 px-5 text-[13px] font-semibold text-[#637381] tracking-wide">Ngày đặt</th>
                                    <th className="py-4 px-5 text-[13px] font-semibold text-[#637381] tracking-wide">Giờ lấy vé</th>
                                    <th className="py-4 px-5 text-[13px] font-semibold text-[#637381] tracking-wide text-center">SL Vé</th>
                                    <th className="py-4 px-5 text-[13px] font-semibold text-[#637381] tracking-wide">Thành tiền</th>
                                    <th className="py-4 px-5 text-[13px] font-semibold text-[#637381] tracking-wide">Trạng thái</th>
                                    <th className="py-4 px-5 text-[13px] font-semibold text-[#637381] tracking-wide text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-[14px] text-[#637381]">
                                            <i className="fa-solid fa-spinner fa-spin mr-2"></i> Đang tải dữ liệu...
                                        </td>
                                    </tr>
                                ) : orderData?.data?.recordList?.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-[14px] text-[#637381]">
                                            Không tìm thấy đơn hàng nào.
                                        </td>
                                    </tr>
                                ) : (
                                    orderData?.data?.recordList?.map((order) => {
                                        // Calculate urgent logic (example: expectedPickupAt < 2 hours from now)
                                        let isUrgent = false;
                                        if (order.expectedPickupAt) {
                                            const pickupTime = new Date(order.expectedPickupAt).getTime();
                                            const now = new Date().getTime();
                                            if (pickupTime - now > 0 && pickupTime - now < 2 * 60 * 60 * 1000) {
                                                isUrgent = true;
                                            }
                                        }
                                        
                                        const hasPendingRefund = pendingRefunds.some((r: any) => r.orderId === order.id);

                                        return (
                                            <tr key={order.id} className="border-b border-[#F4F6F8] hover:bg-[#FAFBFC] transition-colors group">
                                                <td className="py-4 px-5 align-top">
                                                    <div className="flex flex-col">
                                                        <span className="text-[14px] font-medium text-[#212B36]">{order.orderCode}</span>
                                                        {getOrderTypeDisplay(order.orderType)}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-5 align-top">
                                                    <span className="text-[14px] text-[#454F5B]">{format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm')}</span>
                                                </td>
                                                <td className="py-4 px-5 align-top">
                                                    {order.actualPickedUpAt ? (
                                                        <span className="text-[14px] text-[#212B36] font-medium">
                                                            {format(new Date(order.actualPickedUpAt), 'dd/MM/yyyy HH:mm')}
                                                        </span>
                                                    ) : order.expectedPickupAt ? (
                                                        <span className={`text-[14px] ${isUrgent ? 'text-[#ee1314] font-medium' : 'text-[#454F5B]'}`}>
                                                            {format(new Date(order.expectedPickupAt), 'dd/MM/yyyy HH:mm')}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[14px] text-[#919EAB]">-</span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-5 align-top text-center">
                                                    <span className="text-[14px] text-[#212B36] font-medium">
                                                        {order.orderDetails?.length || 0}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-5 align-top">
                                                    <span className="text-[14px] font-bold text-[#212B36]">{order.totalAmount.toLocaleString('vi-VN')}đ</span>
                                                </td>
                                                <td className="py-4 px-5 align-top">
                                                    {getStatusBadge(order.status)}
                                                </td>
                                                <td className="py-4 px-5 text-right align-top">
                                                    <div className="flex items-center justify-end">
                                                        <OrderRowActionsMenu
                                                            order={order}
                                                            hasPendingRefund={hasPendingRefund}
                                                            isPaying={processPaymentMutation.isPending}
                                                            onViewDetail={() => navigate(`/profile/orders/${order.id}`)}
                                                            onRequestRefund={() => handleRequestRefund(order)}
                                                            onQuickPayment={
                                                                order.status === OrderStatus.PENDING_PAYMENT
                                                                    ? () => handleQuickPayment(order)
                                                                    : undefined
                                                            }
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                {orderData?.data?.pagination && orderData.data.pagination.totalPages > 1 && (
                    <div className="px-5 pb-5">
                        <Pagination
                            page={page}
                            totalPages={orderData.data.pagination.totalPages}
                            onPageChange={setPage}
                            totalRecords={orderData.data.pagination.totalRecords}
                            limit={10}
                        />
                    </div>
                )}
            </div>

            {refundOrderId && isLoadingRefundOrder && !refundOrderData?.data && (
                <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/30">
                    <div className="bg-white rounded-xl px-6 py-4 text-[14px] text-[#637381] font-medium shadow-lg">
                        <i className="fa-solid fa-spinner fa-spin mr-2 text-[#ee1314]"></i>
                        Đang tải thông tin đơn hàng...
                    </div>
                </div>
            )}

            {refundOrderId && refundOrderData?.data && (
                <RefundRequestModal
                    isOpen={!!refundOrderId}
                    onClose={() => setRefundOrderId(null)}
                    order={refundOrderData.data}
                />
            )}
        </div>
    );
};
