import { Link, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { useCancelRefund, useGetRefundDetail } from '../../../hooks/useRefund';
import { RefundRequestStatus, RefundType, isRefundTransferComplete, maskBankAccountNo } from '../../../../types/refund.type';
import { RefundStatusBadge } from '../../../components/refund/RefundStatusBadge';
import { RefundStatusStepper } from '../../../components/refund/RefundStatusStepper';
import { AppToast } from '../../../../utils/toast.util';

const REFUND_TYPE_LABELS: Record<RefundType, string> = {
    [RefundType.FULL_ORDER]: 'Hoàn cả đơn',
    [RefundType.ORDER_DETAIL]: 'Hoàn từng vé'
};

export const RefundDetailTab = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const refundId = Number(id);

    const { data, isLoading, isError } = useGetRefundDetail(refundId);
    const cancelMutation = useCancelRefund();

    const refund = data?.data;

    const handleCancel = async () => {
        const confirmed = await AppToast.confirm(
            'Bạn có chắc muốn hủy yêu cầu hoàn tiền này?',
            'Hủy yêu cầu hoàn tiền'
        );
        if (confirmed) {
            cancelMutation.mutate(refundId);
        }
    };

    if (isLoading) {
        return (
            <div className="py-16 text-center text-[14px] text-[#637381]">
                <i className="fa-solid fa-spinner fa-spin mr-2"></i> Đang tải chi tiết...
            </div>
        );
    }

    if (isError || !refund) {
        return (
            <div className="py-16 text-center flex flex-col items-center gap-4">
                <p className="text-[14px] text-[#637381]">Không tìm thấy yêu cầu hoàn tiền</p>
                <Link to="/profile/refunds" className="text-[#ee1314] font-bold text-[14px] hover:underline">
                    Quay lại danh sách
                </Link>
            </div>
        );
    }

    const bankAccount = refund.bankAccount;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <button
                        onClick={() => navigate('/profile/refunds')}
                        className="text-[13px] text-[#637381] hover:text-[#ee1314] font-medium flex items-center gap-1.5 mb-2 cursor-pointer"
                    >
                        <i className="fa-solid fa-arrow-left text-[11px]"></i> Quay lại danh sách
                    </button>
                    <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="text-[22px] font-bold text-[#212B36]">Yêu cầu hoàn tiền #{refund.id}</h2>
                        <RefundStatusBadge status={refund.status} />
                    </div>
                    <p className="text-[14px] text-[#637381] mt-1">
                        Tạo lúc {format(new Date(refund.createdAt), 'dd/MM/yyyy HH:mm')}
                    </p>
                </div>

                {refund.status === RefundRequestStatus.PENDING && (
                    <button
                        onClick={handleCancel}
                        disabled={cancelMutation.isPending}
                        className="px-5 py-3 rounded-xl border border-[#ee1314] text-[#ee1314] font-bold text-[14px] hover:bg-[#FFF4F4] transition-colors cursor-pointer disabled:opacity-50"
                    >
                        {cancelMutation.isPending ? (
                            <i className="fa-solid fa-spinner fa-spin"></i>
                        ) : (
                            <>
                                <i className="fa-solid fa-ban mr-2"></i> Hủy yêu cầu
                            </>
                        )}
                    </button>
                )}
            </div>

            <RefundStatusStepper status={refund.status} rejectReason={refund.rejectReason} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-[20px] p-6 lg:p-8 border border-[#E5E8EB] shadow-[0_2px_12px_rgb(0,0,0,0.03)] flex flex-col gap-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#FFF4F4] text-[#ee1314] flex items-center justify-center text-lg shrink-0">
                            <i className="fa-solid fa-file-invoice"></i>
                        </div>
                        <h3 className="text-[18px] font-bold text-[#212B36]">Thông tin yêu cầu</h3>
                    </div>

                    <div className="grid grid-cols-1 gap-4 border-t border-[#F4F6F8] pt-5">
                        <div className="flex flex-col gap-1">
                            <span className="text-[13px] text-[#637381]">Loại hoàn tiền</span>
                            <span className="text-[15px] font-semibold text-[#212B36]">
                                {REFUND_TYPE_LABELS[refund.refundType]}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[13px] text-[#637381]">Đơn hàng liên quan</span>
                            <Link
                                to={`/profile/orders/${refund.orderId}`}
                                className="text-[15px] font-semibold text-[#2065D1] hover:underline w-max"
                            >
                                Xem đơn hàng
                            </Link>
                        </div>
                        {refund.orderDetailId && (
                            <div className="flex flex-col gap-1">
                                <span className="text-[13px] text-[#637381]">Mã chi tiết vé</span>
                                <span className="text-[15px] font-semibold text-[#212B36]">#{refund.orderDetailId}</span>
                            </div>
                        )}
                        <div className="flex flex-col gap-1">
                            <span className="text-[13px] text-[#637381]">Số tiền hoàn</span>
                            <span className="text-[22px] font-bold text-[#ee1314]">
                                {refund.refundAmount.toLocaleString('vi-VN')}đ
                            </span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[13px] text-[#637381]">Lý do hoàn tiền</span>
                            <span className="text-[15px] font-medium text-[#212B36] leading-relaxed">{refund.refundReason}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[20px] p-6 lg:p-8 border border-[#E5E8EB] shadow-[0_2px_12px_rgb(0,0,0,0.03)] flex flex-col gap-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#FFF4F4] text-[#ee1314] flex items-center justify-center text-lg shrink-0">
                            <i className="fa-solid fa-building-columns"></i>
                        </div>
                        <h3 className="text-[18px] font-bold text-[#212B36]">Tài khoản nhận hoàn</h3>
                    </div>

                    {bankAccount ? (
                        <div className="border-t border-[#F4F6F8] pt-5 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-white border border-[#E5E8EB] flex items-center justify-center p-2 shrink-0">
                                {bankAccount.bankLogo ? (
                                    <img src={bankAccount.bankLogo} alt="" className="w-full h-full object-contain" />
                                ) : (
                                    <i className="fa-solid fa-building-columns text-[#637381]"></i>
                                )}
                            </div>
                            <div>
                                <p className="text-[15px] font-bold text-[#212B36]">{bankAccount.bankName}</p>
                                <p className="text-[14px] text-[#637381] font-mono mt-0.5">
                                    {maskBankAccountNo(bankAccount.bankAccountNo)}
                                </p>
                                <p className="text-[13px] text-[#919EAB] mt-0.5">{bankAccount.bankAccountName}</p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-[14px] text-[#637381] border-t border-[#F4F6F8] pt-5">Không có thông tin tài khoản</p>
                    )}
                </div>
            </div>

            {isRefundTransferComplete(refund.status) && (
                <div className="bg-[#E4F8ED] rounded-[20px] p-6 lg:p-8 border border-[#1CD162]/20 flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#1CD162] text-white flex items-center justify-center text-lg shrink-0">
                            <i className="fa-solid fa-check"></i>
                        </div>
                        <h3 className="text-[18px] font-bold text-[#212B36]">Đã chuyển khoản</h3>
                    </div>
                    {refund.transferredAt && (
                        <p className="text-[14px] text-[#637381]">
                            Thời gian: {format(new Date(refund.transferredAt), 'dd/MM/yyyy HH:mm')}
                        </p>
                    )}
                    {refund.transferEvidenceUrl && (
                        <div className="mt-3">
                            <p className="text-[14px] text-[#637381] mb-2">Minh chứng chuyển khoản</p>
                            <img
                                src={refund.transferEvidenceUrl}
                                alt="Minh chứng chuyển khoản"
                                className="max-w-full max-h-[360px] rounded-lg border border-[#919EAB3D] cursor-pointer object-contain"
                                onClick={() => window.open(refund.transferEvidenceUrl, '_blank', 'noopener,noreferrer')}
                            />
                            <a
                                href={refund.transferEvidenceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-[#2065D1] font-bold text-[14px] hover:underline w-max mt-2"
                            >
                                <i className="fa-solid fa-up-right-from-square"></i> Mở ảnh gốc
                            </a>
                        </div>
                    )}
                </div>
            )}

            {refund.reviewedAt && refund.status !== RefundRequestStatus.PENDING && (
                <div className="text-center text-[13px] text-[#919EAB]">
                    Cập nhật lần cuối: {format(new Date(refund.updatedAt), 'dd/MM/yyyy HH:mm')}
                </div>
            )}
        </div>
    );
};
