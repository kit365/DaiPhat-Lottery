import { ProductBanner } from "../product/sections/ProductBanner";
import { Link } from "react-router-dom";
import { Sidebar } from "./sections/Sidebar";
import { useAuthStore } from "../../../stores/useAuthStore";

export const ProfilePage = () => {
  const { user, isHydrated } = useAuthStore();

  const breadcrumbs = [
    { label: "Trang chủ", to: "/" },
    { label: "Tài khoản", to: "/dashboard/profile" },
    { label: "Thông tin cá nhân", to: "/dashboard/profile" },
  ];

  if (!isHydrated) return null;

  if (!user) {
    return (
      <>
        <ProductBanner
          pageTitle="Tài khoản"
          breadcrumbs={breadcrumbs}
          url="https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/06/bc-shop-details.jpg"
          className="bg-top"
        />
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4 bg-[#f9f9f9]">
          <p className="text-[18px] text-client-secondary">Vui lòng đăng nhập để xem thông tin tài khoản.</p>
          <Link to="/auth/login" className="bg-client-secondary text-white px-8 py-3 rounded-full text-[16px] hover:bg-client-primary transition-all">
            Đăng nhập ngay
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <ProductBanner
        pageTitle="Thông tin cá nhân"
        breadcrumbs={breadcrumbs}
        url="https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/06/bc-shop-details.jpg"
        className="bg-top"
      />

      <div className="mt-[-150px] mb-[100px] app-container flex items-stretch">
        <div className="w-[25%] px-[12px] flex">
          <Sidebar />
        </div>
        <div className="w-[75%] px-[12px]">
          <div className="mt-[100px] p-[35px] bg-white shadow-[0px_8px_24px_#959da533] rounded-[12px]">
            <h3 className="text-[24px] font-[600] text-client-secondary mb-[25px] flex items-center justify-between">
              Thông tin cá nhân
              <Link className="relative overflow-hidden group bg-client-primary rounded-[8px] px-[25px] py-[12px] font-[500] text-[14px] text-white" to="/dashboard/profile/edit">
                <span className="relative z-10">Chỉnh sửa</span>
                <div className="absolute top-0 left-0 w-full h-full bg-client-secondary transition-transform duration-500 ease-in-out transform scale-x-0 origin-left group-hover:scale-x-100"></div>
              </Link>
            </h3>
            <div className="p-[25px] border border-[#eee] rounded-[10px]">
              <ul>
                <li className="text-[#7d7b7b] mb-[20px]">
                  <span className="text-[#333] w-[120px] inline-block">Họ tên:</span>
                  {user.fullName}
                </li>
                <li className="text-[#7d7b7b] mb-[20px]">
                  <span className="text-[#333] w-[120px] inline-block">Email:</span>
                  {user.email}
                </li>
                <li className="text-[#7d7b7b]">
                  <span className="text-[#333] w-[120px] inline-block">SĐT:</span>
                  {user.phone || "Chưa cập nhật"}
                </li>
              </ul>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};
