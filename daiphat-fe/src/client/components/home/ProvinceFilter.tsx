import React from 'react';

interface ProvinceFilterProps {
  selectedProvince?: string;
  onProvinceChange?: (province: string) => void;
}

export const ProvinceFilter: React.FC<ProvinceFilterProps> = ({ 
  selectedProvince = "TP. Hồ Chí Minh",
  onProvinceChange 
}) => {
  const provinces = ["TP. Hồ Chí Minh", "Đồng Nai", "Bình Dương", "Khác"];

  return (
    <section className="px-5 lg:px-10 max-w-[1440px] mx-auto mt-6 mb-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-5">
        {/* Title Section */}
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-[#102937] text-[22px] font-bold">location_on</span>
          <h2 className="text-[15px] font-bold text-[#102937] font-client-display uppercase tracking-tight leading-none">CHỌN TỈNH</h2>
        </div>
        
        {/* Buttons Section */}
        <div className="flex flex-wrap items-center gap-3">
          {provinces.map((province) => {
            const isActive = province === selectedProvince;
            
            if (isActive) {
              return (
                <button 
                  key={province}
                  className="bg-[#E60F14] text-white px-7 py-3 rounded-xl font-bold text-[14px] transition-all shadow-md shadow-[#E60F14]/20 cursor-pointer active:scale-95 font-client-display min-w-[140px] text-center"
                >
                  {province}
                </button>
              );
            }
            
            return (
              <button 
                key={province}
                onClick={() => onProvinceChange?.(province)}
                className="bg-white border border-gray-200 text-[#505050] px-7 py-3 rounded-xl font-bold text-[14px] hover:border-[#E60F14] hover:text-[#E60F14] transition-all flex items-center justify-center gap-2 cursor-pointer font-client-display min-w-[140px] border-solid"
              >
                {province}
                {province === "Khác" && (
                  <span className="material-symbols-outlined text-[18px] leading-none">expand_more</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
