import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";

interface CancelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
    title?: string;
    confirmText?: string;
    isBooking?: boolean;
    paymentStatus?: string;
    refundCancellationHours?: number;
    startTime?: string;
}

import dayjs from "dayjs";

const CANCEL_REASONS = [
    "Tôi muốn cập nhật địa chỉ/sđt nhận hàng.",
    "Tôi muốn thêm/thay đổi Mã giảm giá",
    "Tôi muốn thay đổi sản phẩm (kích thước, màu sắc, số lượng...)",
    "Thủ tục thanh toán rắc rối",
    "Tôi tìm thấy chỗ mua khác tốt hơn (Rẻ hơn, uy tín hơn, giao nhanh hơn...)",
    "Tôi không có nhu cầu mua nữa",
    "Tôi không tìm thấy lý do hủy phù hợp",
    "Lý do khác",
];

const BOOKING_CANCEL_REASONS = [
    "Tôi bận việc đột xuất không thể đến đúng hẹn.",
    "Tôi muốn thay đổi dịch vụ hoặc bé cưng.",
    "Tôi muốn đổi sang khung giờ hoặc ngày khác.",
    "Tôi tìm thấy nơi khác có dịch vụ tốt hơn/rẻ hơn.",
    "Thủ tục đặt lịch và cọc rắc rối.",
    "Tôi không còn nhu cầu sử dụng dịch vụ nữa.",
    "Tôi không tìm thấy lý do hủy phù hợp",
    "Lý do khác",
];

export const CancelModal: React.FC<CancelModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title = "Lý Do Hủy",
    confirmText = "HỦY ĐƠN HÀNG",
    isBooking = false,
    paymentStatus = "unpaid",
    refundCancellationHours = 0,
    startTime,
}) => {
    const [selectedReason, setSelectedReason] = useState("");
    const [customReason, setCustomReason] = useState("");

    const reasons = isBooking ? BOOKING_CANCEL_REASONS : CANCEL_REASONS;

    const isRefundable = isBooking &&
        ["paid", "partially_paid"].includes(paymentStatus || "") &&
        refundCancellationHours > 0 &&
        startTime &&
        dayjs().add(refundCancellationHours, 'hour').isBefore(dayjs(startTime));

    React.useEffect(() => {
        if (isOpen) {
            setSelectedReason("");
            setCustomReason("");
        }
    }, [isOpen]);

    const handleConfirm = () => {
        if (selectedReason === "Lý do khác") {
            if (customReason.trim()) {
                onConfirm(customReason.trim());
            }
        } else if (selectedReason) {
            onConfirm(selectedReason);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-2 bg-black/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-white w-full max-w-[650px] rounded-[16px] overflow-hidden shadow-2xl"
                    >
                        <div className="p-[35px]">
                            <h3 className="text-[26px] font-bold text-[#333] mb-4">{title}</h3>

                            <div className="bg-[#fffdf5] border border-[#fceabc] p-2 rounded-lg flex gap-3 mb-4">
                                <div className="mt-0.5">
                                    <Icon icon="solar:info-circle-bold" className="text-[#facc15] text-[20px]" />
                                </div>
                                <p className="text-[14px] text-[#856404] leading-relaxed">
                                    Nếu bạn xác nhận hủy, toàn bộ {isBooking ? "lịch đặt" : "đơn hàng"} sẽ được hủy. Chọn lý do hủy phù hợp nhất với bạn nhé!
                                </p>
                            </div>

                            {isBooking && ["paid", "partially_paid"].includes(paymentStatus || "") && refundCancellationHours > 0 && startTime && (
                                <div className={`mb-4 p-4 rounded-xl flex gap-3 border shadow-sm ${isRefundable ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100"}`}>
                                    <Icon
                                        icon={isRefundable ? "solar:check-circle-bold-duotone" : "solar:info-circle-bold-duotone"}
                                        className={`text-[24px] shrink-0 ${isRefundable ? "text-emerald-500" : "text-red-500"}`}
                                    />
                                    <div className="flex flex-col gap-1">
                                        <p className="text-[14px] font-bold uppercase tracking-wide">
                                            {isRefundable ? "Đủ điều kiện hoàn tiền" : "Quá hạn hoàn tiền"}
                                        </p>
                                        <p className="text-[13px] leading-relaxed opacity-90">
                                            {isRefundable
                                                ? `Bạn có thể nhận lại ${paymentStatus === 'paid' ? '100% số tiền đã thanh toán' : 'tiền cọc'} nếu hủy ngay lúc này (Quy định: hủy trước ít nhất ${refundCancellationHours} giờ).`
                                                : `Hiện tại đã quá hạn quy định hoàn tiền (ít nhất ${refundCancellationHours} giờ trước hẹn). Bạn vẫn có thể hủy lịch nhưng sẽ không được hoàn trả tiền cọc.`
                                            }
                                        </p>
                                    </div>
                                </div>
                            )}

                            {paymentStatus === "paid" && !isBooking && (
                                <div className="mb-4 text-[13px] text-red-500 font-medium italic">
                                    * Đơn hàng đã thanh toán sẽ được kiểm tra và thực hiện hoàn tiền sau khi bạn gửi yêu cầu.
                                </div>
                            )}

                            <div className="space-y-4 pr-2">
                                {reasons.map((reason, index) => (
                                    <label
                                        key={index}
                                        className="flex items-center gap-3 cursor-pointer group"
                                    >
                                        <div className="relative flex items-center justify-center">
                                            <input
                                                type="radio"
                                                name="cancelReason"
                                                className="peer hidden"
                                                checked={selectedReason === reason}
                                                onChange={() => setSelectedReason(reason)}
                                            />
                                            <div className="w-[18px] h-[18px] border-2 border-[#ddd] rounded-full peer-checked:border-client-primary transition-all group-hover:border-client-primary"></div>
                                            <div className="absolute w-[8px] h-[8px] bg-client-primary rounded-full scale-0 peer-checked:scale-100 transition-transform"></div>
                                        </div>
                                        <span className={`text-[15px] transition-colors ${selectedReason === reason ? "text-client-secondary font-semibold" : "text-[#555] group-hover:text-client-secondary"}`}>
                                            {reason}
                                        </span>
                                    </label>
                                ))}
                            </div>

                            <AnimatePresence>
                                {selectedReason === "Lý do khác" && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="mt-4 overflow-hidden"
                                    >
                                        <textarea
                                            value={customReason}
                                            onChange={(e) => setCustomReason(e.target.value)}
                                            placeholder="Vui lòng nhập lý do của bạn..."
                                            className="w-full h-[100px] p-4 border border-[#eee] rounded-lg text-[14px] outline-none focus:border-client-primary transition-all resize-none bg-[#fcfcfc]"
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="flex items-center justify-end gap-4 mt-4">
                                <button
                                    onClick={onClose}
                                    className="relative overflow-hidden group bg-[#f5f5f5] rounded-[8px] px-[25px] py-[12px] font-[600] text-[14px] text-[#666] cursor-pointer"
                                >
                                    <span className="relative z-10 transition-colors group-hover:text-white uppercase">Không phải bây giờ</span>
                                    <div className="absolute top-0 left-0 w-full h-full bg-[#ccc] transition-transform duration-500 ease-in-out transform scale-x-0 origin-left group-hover:scale-x-100"></div>
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    disabled={!selectedReason || (selectedReason === "Lý do khác" && !customReason.trim())}
                                    className={`relative overflow-hidden group rounded-[8px] px-[25px] py-[12px] font-[600] text-[14px] transition-all ${(selectedReason && (selectedReason !== "Lý do khác" || customReason.trim()))
                                        ? "bg-client-primary text-white cursor-pointer"
                                        : "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60"
                                        }`}
                                >
                                    <span className="relative z-10 uppercase">{confirmText}</span>
                                    {(selectedReason && (selectedReason !== "Lý do khác" || customReason.trim())) && (
                                        <div className="absolute top-0 left-0 w-full h-full bg-client-secondary transition-transform duration-500 ease-in-out transform scale-x-0 origin-left group-hover:scale-x-100"></div>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
