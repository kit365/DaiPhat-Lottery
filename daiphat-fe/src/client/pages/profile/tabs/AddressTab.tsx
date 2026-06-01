import React, { useState } from 'react';
import { MapPin, Plus, Trash2, Edit2, MoreVertical, Star, AlertCircle } from "lucide-react";
import { AppToast as toast } from "../../../utils/toast.util";
import { useNavigate } from 'react-router-dom';

interface Address {
    id: string;
    fullName: string;
    phone: string;
    addressLine: string;
    updatedAt: string;
    isDefault: boolean;
}

const DUMMY_ADDRESSES: Address[] = [
    {
        id: "1",
        fullName: "Nguyễn Văn A",
        phone: "0901 234 567",
        addressLine: "123 Nguyễn Văn Cừ, Phường 1, Quận 5, TP. Hồ Chí Minh",
        updatedAt: "20/03/2024",
        isDefault: true
    },
    {
        id: "2",
        fullName: "Nguyễn Văn A",
        phone: "0901 234 567",
        addressLine: "456 Lê Văn Sỹ, Phường 12, Quận 3, TP. Hồ Chí Minh",
        updatedAt: "15/02/2024",
        isDefault: false
    }
];

export const AddressTab = () => {
    const navigate = useNavigate();
    const [addresses, setAddresses] = useState<Address[]>(DUMMY_ADDRESSES);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    const toggleMenu = (id: string) => {
        if (openMenuId === id) {
            setOpenMenuId(null);
        } else {
            setOpenMenuId(id);
        }
    };

    const setAsDefault = (id: string) => {
        const newAddresses = addresses.map(addr => ({ ...addr, isDefault: addr.id === id }));
        newAddresses.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
        setAddresses(newAddresses);
        setOpenMenuId(null);
        toast.success("Đã đặt làm mặc định!");
    };

    const deleteAddress = (id: string) => {
        setAddresses(addresses.filter(a => a.id !== id));
        setOpenMenuId(null);
        toast.success("Đã xóa địa chỉ!");
    };

    return (
        <div className="space-y-6 relative">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
                <div>
                    <h3 className="text-[22px] font-bold text-[#212B36]">Địa chỉ giao hàng</h3>
                    <p className="text-[14px] text-[#637381] mt-1">Quản lý địa chỉ nhận vé số của bạn</p>
                </div>
                <button 
                    onClick={() => navigate('/profile/address/create')}
                    className="inline-flex items-center gap-1.5 h-10 px-4 bg-[#BA0000] hover:bg-[#990000] text-white text-[14px] font-bold rounded-[4px] transition-colors cursor-pointer"
                >
                    <Plus size={18} />
                    <span>Thêm địa chỉ</span>
                </button>
            </div>

            <div className="flex flex-col gap-4">
                {addresses.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                        <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-300 mb-4">
                            <MapPin size={28} />
                        </div>
                        <p className="text-slate-500 font-medium">Bạn chưa có địa chỉ nào.</p>
                    </div>
                ) : (
                    addresses.map((address) => (
                        <div 
                            key={address.id} 
                            className={`p-5 rounded-[8px] border relative flex items-start gap-4 transition-all
                                ${address.isDefault ? 'border-[#BA0000] bg-[#FFF8F8]' : 'border-[#E5E8EB] bg-white'}
                            `}
                        >
                            <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center
                                ${address.isDefault ? 'bg-[#FFF4F4] text-[#BA0000]' : 'bg-[#F4F6F8] text-[#637381]'}
                            `}>
                                <MapPin size={24} strokeWidth={2} />
                            </div>
                            
                            <div className="flex-1 pr-8">
                                <div className="flex items-center gap-3 mb-1.5">
                                    <strong className="text-[16px] text-[#212B36] font-bold">{address.fullName}</strong>
                                    {address.isDefault && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[12px] font-medium bg-[#FFF4F4] text-[#BA0000]">
                                            Mặc định
                                        </span>
                                    )}
                                </div>
                                
                                <div className="text-[14px] text-[#637381] space-y-1">
                                    <p>{address.phone}</p>
                                    <p className="text-[#212B36]">{address.addressLine}</p>
                                    <p className="text-[13px] pt-1">Cập nhật: {address.updatedAt}</p>
                                </div>
                            </div>

                            <div className="absolute top-5 right-4">
                                <button 
                                    onClick={() => toggleMenu(address.id)}
                                    className="p-1 text-[#637381] hover:bg-[#F4F6F8] rounded-full transition-colors cursor-pointer"
                                >
                                    <MoreVertical size={20} />
                                </button>
                                
                                {openMenuId === address.id && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)}></div>
                                        <div className="absolute right-0 mt-1 w-48 bg-white border border-[#E5E8EB] rounded-lg shadow-[0_4px_20px_rgb(0,0,0,0.08)] z-20 py-2">
                                            {!address.isDefault && (
                                                <button 
                                                    onClick={() => setAsDefault(address.id)}
                                                    className="w-full text-left px-4 py-2 text-[14px] text-[#212B36] hover:bg-[#F4F6F8] flex items-center gap-3 transition-colors cursor-pointer"
                                                >
                                                    <Star size={16} className="text-[#BA0000]" /> Đặt làm mặc định
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => navigate(`/profile/address/edit/${address.id}`)}
                                                className="w-full text-left px-4 py-2 text-[14px] text-[#212B36] hover:bg-[#F4F6F8] flex items-center gap-3 transition-colors cursor-pointer"
                                            >
                                                <Edit2 size={16} className="text-[#637381]" /> Chỉnh sửa
                                            </button>
                                            <button 
                                                onClick={() => deleteAddress(address.id)}
                                                className="w-full text-left px-4 py-2 text-[14px] text-[#212B36] hover:bg-[#F4F6F8] flex items-center gap-3 transition-colors cursor-pointer"
                                            >
                                                <Trash2 size={16} className="text-[#637381]" /> Xóa địa chỉ
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="flex items-center gap-2 mt-8 py-4 border-t border-gray-100">
                <AlertCircle size={18} className="text-[#BA0000]" />
                <span className="text-[14px] font-medium text-[#212B36]">
                    Lưu ý: <span className="font-normal text-[#637381]">Vui lòng kiểm tra kỹ địa chỉ để đảm bảo nhận vé số chính xác và đúng thời gian.</span>
                </span>
            </div>

        </div>
    );
};
