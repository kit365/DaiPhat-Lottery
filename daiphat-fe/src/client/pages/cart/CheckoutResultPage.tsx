import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Calendar, Hash } from 'lucide-react';
import { Header } from '../../components/layout/header';
import dayjs from 'dayjs';

export const CheckoutResultPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // Capture params once on mount so they survive the URL cleanup
    const [resultData] = useState(() => ({
        code: searchParams.get('code'),
        orderCode: searchParams.get('orderCode'),
        internalCode: searchParams.get('internalCode'),
        status: searchParams.get('status'),
        cancel: searchParams.get('cancel')
    }));

    useEffect(() => {
        console.log("==== PAYOS RETURNED TO FE ====");
        console.log("Full URL:", window.location.href);
        console.log("Params:", resultData);

        // Clean up the URL so the user doesn't see all the messy parameters
        if (searchParams.toString() || window.location.pathname !== '/checkout/result') {
            navigate('/checkout/result', { replace: true });
        }
    }, [navigate, searchParams, resultData]);

    const isSuccess = resultData.code === '00' && resultData.cancel !== 'true';
    const displayCode = resultData.internalCode || resultData.orderCode;

    return (
        <div 
            className="min-h-screen font-client-main flex flex-col bg-fixed bg-cover bg-center"
            style={{ backgroundImage: 'url("https://i.ibb.co/BVFGYpL1/86f05f70-fcf8-445f-978e-a0539eb2f0de.png")' }}
        >
            <Header />

            <div className="flex-1 w-full mt-[70px] lg:mt-[80px] py-10 px-4 flex items-center justify-center">
                <div className="bg-white rounded-[24px] shadow-xl max-w-[500px] w-full overflow-hidden border border-[#E5E8EB]">
                    {/* Top decoration */}
                    <div className={`h-2 w-full ${isSuccess ? 'bg-[#00A76F]' : 'bg-red-500'}`}></div>

                    <div className="p-8 flex flex-col items-center text-center">
                        {/* Icon */}
                        <div className="relative mb-6">
                            {/* Confetti decoration circles */}
                            <div className="absolute -top-4 -left-4 w-2 h-2 rounded-full bg-[#F59E0B]"></div>
                            <div className="absolute top-8 -right-6 w-3 h-3 rounded-full bg-[#3B82F6] opacity-60"></div>
                            <div className="absolute -bottom-2 -left-8 w-2.5 h-2.5 rounded-full bg-[#10B981] opacity-70"></div>
                            
                            <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg border-[3px] ${isSuccess ? 'bg-[#E8F5E9] border-[#E8F5E9] text-[#00A76F] shadow-[#00A76F]/20' : 'bg-red-50 border-red-50 text-red-500 shadow-red-500/20'}`}>
                                {isSuccess ? (
                                    <CheckCircle2 size={56} className="fill-[#00A76F] text-white" />
                                ) : (
                                    <XCircle size={56} className="fill-red-500 text-white" />
                                )}
                            </div>
                        </div>

                        <h1 className={`text-[28px] font-black mb-2 ${isSuccess ? 'text-[#00A76F]' : 'text-red-500'}`}>
                            {isSuccess ? 'Thanh toán thành công!' : 'Thanh toán thất bại'}
                        </h1>
                        <p className="text-[#637381] text-[15px] mb-8">
                            {isSuccess ? 'Cảm ơn bạn đã đặt vé tại Đại Phát.' : 'Rất tiếc, quá trình thanh toán của bạn không thành công hoặc đã bị hủy.'}
                        </p>

                        {/* Order Details Card */}
                        {displayCode && (
                            <div className="w-full bg-[#FAFBFC] rounded-2xl p-5 mb-8 border border-[#F4F6F8]">
                                <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#E5E8EB]">
                                    <div className="flex items-center gap-3 text-[#212B36] font-medium">
                                        <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-[#637381]">
                                            <Hash size={16} />
                                        </div>
                                        <span>Mã đơn hàng</span>
                                    </div>
                                    <span className="font-bold text-[#ee1314]">{displayCode.startsWith('ORD-') ? displayCode : `DP${displayCode}`}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 text-[#212B36] font-medium">
                                        <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-[#637381]">
                                            <Calendar size={16} />
                                        </div>
                                        <span>Thời gian đặt</span>
                                    </div>
                                    <span className="font-bold text-[#212B36]">{dayjs().format('DD/MM/YYYY - HH:mm')}</span>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="w-full flex flex-col sm:flex-row gap-3">
                            <Link 
                                to="/" 
                                className="flex-1 py-3.5 rounded-xl border-2 border-[#ee1314] text-[#ee1314] font-bold text-[15px] hover:bg-[#FFF4F4] transition-colors flex items-center justify-center gap-2"
                            >
                                <i className="fa-solid fa-house"></i> Về trang chủ
                            </Link>
                            <Link 
                                to={resultData.internalCode ? `/profile/orders/${resultData.internalCode}` : "/profile/orders"} 
                                className="flex-1 py-3.5 rounded-xl bg-[#ee1314] text-white font-bold text-[15px] hover:bg-[#d00f10] transition-colors shadow-md shadow-[#ee1314]/20 flex items-center justify-center gap-2"
                            >
                                <i className="fa-solid fa-file-invoice"></i> Xem đơn của tôi
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
