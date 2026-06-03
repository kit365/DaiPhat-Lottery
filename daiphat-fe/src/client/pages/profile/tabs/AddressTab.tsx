import React, { useState } from 'react';
import { MapPin, Save } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { AppToast as toast } from "../../../utils/toast.util";

export const AddressTab = () => {
    const { user } = useAuth();
    const [address, setAddress] = useState(user?.address || '');

    const handleSave = () => {
        toast.success("Đã cập nhật địa chỉ.");
    };

    return (
        <div className="space-y-6">
            <div className="border-b border-gray-100 pb-4">
                <h3 className="text-[22px] font-bold text-[#212B36]">Địa chỉ</h3>
                <p className="text-[14px] text-[#637381] mt-1">Địa chỉ là thông tin tùy chọn trong hồ sơ cá nhân.</p>
            </div>

            <div className="bg-white border border-[#E5E8EB] rounded-[8px] p-5">
                <label className="flex items-center gap-2 text-[14px] font-bold text-[#212B36] mb-3">
                    <MapPin size={18} className="text-[#BA0000]" />
                    Địa chỉ liên hệ
                </label>
                <textarea
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    placeholder="Nhập địa chỉ nếu cần"
                    rows={4}
                    className="w-full rounded-[8px] border border-[#DCE0E4] px-4 py-3 text-[14px] text-[#212B36] outline-none transition-colors focus:border-[#BA0000] resize-none"
                />
                <div className="mt-4 flex justify-end">
                    <button
                        type="button"
                        onClick={handleSave}
                        className="inline-flex items-center gap-2 h-10 px-4 bg-[#BA0000] hover:bg-[#990000] text-white text-[14px] font-bold rounded-[4px] transition-colors cursor-pointer"
                    >
                        <Save size={16} />
                        Lưu địa chỉ
                    </button>
                </div>
            </div>
        </div>
    );
};
