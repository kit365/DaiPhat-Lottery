import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetMyPrizePayouts } from '../../hooks/usePrizePayout';
import {
    formatPrizePayoutCurrency,
    PRIZE_PAYOUT_STATUS_MAP,
    PrizePayoutRequestResponse,
} from '../../../types/prize-payout.type';
import { resolvePrizePayoutComplaintEligibility } from '../../utils/prizePayoutComplaintEligibility.logic';

interface SelectPrizePayoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (payoutId: string) => void;
    selectedPrizePayoutId?: string;
}

const getShortReason = (reasonCode: string) => {
    switch (reasonCode) {
        case 'too_early': return 'Chưa đến hạn';
        case 'window_expired': return 'Đã quá hạn';
        case 'status_invalid': return 'Xử lý thủ công';
        case 'not_eligible': return 'Không hỗ trợ';
        default: return 'Không khả dụng';
    }
};

export const SelectPrizePayoutModal: React.FC<SelectPrizePayoutModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    selectedPrizePayoutId,
}) => {
    const navigate = useNavigate();
    const { data: payoutsData, isLoading } = useGetMyPrizePayouts({ page: 1, limit: 100 }, isOpen);
    const payouts = (payoutsData?.data?.recordList || []) as PrizePayoutRequestResponse[];

    if (!isOpen) return null;

    const handleGoToPayouts = () => {
        onClose();
        navigate('/profile/prize-payouts');
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white rounded-[20px] shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-[#E5E8EB] bg-white z-10">
                    <h2 className="text-[18px] font-bold text-[#212B36]">Chọn yêu cầu trả thưởng</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg hover:bg-[#F4F6F8] flex items-center justify-center text-[#637381] cursor-pointer"
                    >
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div className="p-5 overflow-y-auto flex-1 bg-[#F9FAFB]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-3 text-[#919EAB]">
                            <i className="fa-solid fa-spinner fa-spin text-2xl"></i>
                            <span className="text-[14px] font-medium">Đang tải danh sách...</span>
                        </div>
                    ) : payouts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-4 text-[#919EAB]">
                            <div className="w-20 h-20 rounded-full bg-[#F4F6F8] flex items-center justify-center mb-2">
                                <i className="fa-solid fa-trophy text-4xl text-[#DFE3E8]"></i>
                            </div>
                            <span className="text-[15px] font-bold text-[#454F5B]">Bạn chưa có yêu cầu trả thưởng nào</span>
                            <span className="text-[13px] text-center max-w-[80%]">
                                Vui lòng tạo yêu cầu trả thưởng từ Vé của tôi trước khi khiếu nại.
                            </span>
                            <button
                                onClick={handleGoToPayouts}
                                className="mt-4 px-6 py-2.5 bg-[#ee1314] text-white font-bold rounded-xl hover:bg-[#c80f11] transition-colors cursor-pointer flex items-center gap-2"
                            >
                                <i className="fa-solid fa-arrow-right"></i>
                                Đi tới trả thưởng
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {payouts.map((payout) => {
                                const isSelected = String(payout.id) === String(selectedPrizePayoutId);
                                const eligibility = resolvePrizePayoutComplaintEligibility(payout);
                                const isEligible = eligibility.eligible;
                                const statusLabel = PRIZE_PAYOUT_STATUS_MAP[payout.status]?.label || payout.status;

                                return (
                                    <div
                                        key={payout.id}
                                        onClick={() => {
                                            if (!isEligible) return;
                                            onSelect(String(payout.id));
                                            onClose();
                                        }}
                                        className={`p-4 rounded-xl border transition-colors flex items-center justify-between gap-4 ${
                                            !isEligible
                                                ? 'bg-[#F9FAFB] border-[#E5E8EB] opacity-60 cursor-not-allowed'
                                                : isSelected
                                                    ? 'bg-[#FFF4F4] border-[#ee1314] cursor-pointer'
                                                    : 'bg-white border-[#E5E8EB] hover:border-[#ee1314]/50 hover:shadow-sm cursor-pointer'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-[#ee1314]/10 text-[#ee1314]' : 'bg-[#F4F6F8] text-[#637381]'}`}>
                                                <i className="fa-solid fa-trophy"></i>
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-bold text-[#212B36] text-[14px]">{payout.requestCode}</span>
                                                    <span className="px-2 py-0.5 bg-[#F4F6F8] text-[#454F5B] text-[10px] font-bold rounded-md uppercase">
                                                        {statusLabel}
                                                    </span>
                                                    {!isEligible && (
                                                        <span className="px-2 py-0.5 bg-[#FF4842]/10 text-[#FF4842] text-[10px] font-bold rounded-md uppercase ml-1">
                                                            {getShortReason(eligibility.reasonCode)}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[13px] font-semibold text-[#ee1314]">
                                                    {formatPrizePayoutCurrency(payout.netAmount ?? payout.grossAmount)}
                                                </span>
                                                <span className="text-[12px] text-[#919EAB]">
                                                    {payout.createdAt ? new Date(payout.createdAt).toLocaleDateString('vi-VN') : ''}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-center text-[#ee1314]">
                                            {!isEligible ? (
                                                <i className="fa-solid fa-ban text-xl text-[#DFE3E8]"></i>
                                            ) : isSelected ? (
                                                <i className="fa-solid fa-circle-check text-xl"></i>
                                            ) : (
                                                <i className="fa-regular fa-circle text-xl text-[#DFE3E8]"></i>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
