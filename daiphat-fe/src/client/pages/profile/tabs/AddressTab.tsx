import React, { useState } from 'react';
import { MapPin, Plus, Trash2, Edit2 } from "lucide-react";
import { AppToast as toast } from "../../../utils/toast.util";

// Define a type for address
interface Address {
    id: string;
    fullName: string;
    phone: string;
    addressLine: string;
    ward: string;
    district: string;
    city: string;
    isDefault: boolean;
}

const DUMMY_ADDRESSES: Address[] = [
    {
        id: "1",
        fullName: "Nguyễn Văn A",
        phone: "0901234567",
        addressLine: "Số 123 Đường B",
        ward: "Phường C",
        district: "Quận D",
        city: "TP. Hồ Chí Minh",
        isDefault: true
    }
];

export const AddressTab = () => {
    const [addresses, setAddresses] = useState<Address[]>(DUMMY_ADDRESSES);

    const handleAddClick = () => {
        toast.info("Chức năng thêm địa chỉ đang được phát triển!");
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="text-xl font-bold text-[#102937]">Địa chỉ nhận vé / giải thưởng</h3>
                    <p className="text-sm text-[#505050] mt-1">Quản lý địa chỉ giao vé cứng hoặc nhận thưởng vật lý.</p>
                </div>
                <button 
                    onClick={handleAddClick}
                    className="inline-flex items-center gap-2 h-10 px-4 bg-[#102937]/5 hover:bg-[#102937]/10 text-[#102937] font-bold rounded-lg transition-colors cursor-pointer"
                >
                    <Plus size={18} />
                    <span>Thêm địa chỉ</span>
                </button>
            </div>

            <div className="grid gap-4 mt-6">
                {addresses.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                        <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-300 mb-4">
                            <MapPin size={28} />
                        </div>
                        <p className="text-slate-500 font-medium">Bạn chưa có địa chỉ nào.</p>
                    </div>
                ) : (
                    addresses.map((address) => (
                        <div key={address.id} className="p-5 border border-slate-200 rounded-xl hover:border-[#FF6262]/30 hover:shadow-md transition-all bg-white relative group">
                            {address.isDefault && (
                                <span className="absolute top-5 right-5 inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#FF6262]/10 text-[#FF6262]">
                                    Mặc định
                                </span>
                            )}
                            
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 shrink-0 rounded-full bg-[#102937]/5 text-[#102937] flex items-center justify-center mt-1">
                                    <MapPin size={20} />
                                </div>
                                <div className="flex-1 pr-16 md:pr-0">
                                    <div className="flex items-center gap-3">
                                        <strong className="text-base text-[#102937]">{address.fullName}</strong>
                                        <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                        <span className="text-[#505050] font-medium">{address.phone}</span>
                                    </div>
                                    <div className="mt-2 text-sm text-[#505050] leading-relaxed">
                                        {address.addressLine}, {address.ward}, <br/>
                                        {address.district}, {address.city}
                                    </div>
                                    
                                    <div className="mt-4 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="text-sm font-bold text-[#102937] hover:text-[#FF6262] inline-flex items-center gap-1.5 cursor-pointer">
                                            <Edit2 size={14} /> Sửa
                                        </button>
                                        {!address.isDefault && (
                                            <>
                                                <div className="w-[1px] h-3 bg-slate-200"></div>
                                                <button className="text-sm font-bold text-[#102937] hover:text-[#FF6262] cursor-pointer">
                                                    Thiết lập mặc định
                                                </button>
                                            </>
                                        )}
                                        <div className="w-[1px] h-3 bg-slate-200"></div>
                                        <button className="text-sm font-bold text-slate-400 hover:text-red-500 inline-flex items-center gap-1.5 cursor-pointer">
                                            <Trash2 size={14} /> Xóa
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
