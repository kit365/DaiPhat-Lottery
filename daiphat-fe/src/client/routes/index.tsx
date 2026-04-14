import { lazy } from "react";
import type { RouteObject } from "react-router-dom";
import { AuthGuard } from "../components/guards/AuthGuard";

// Lazy-loaded components
const HomePage = lazy(() => import("../pages/home/HomePage").then(m => ({ default: m.HomePage })));
const ProductDetailPage = lazy(() => import("../pages/product/ProductDetail").then(m => ({ default: m.ProductDetailPage })));
const ProductListPage = lazy(() => import("../pages/product/ProductList").then(m => ({ default: m.ProductListPage })));
const BlogListPage = lazy(() => import("../pages/blog/BlogList").then(m => ({ default: m.BlogListPage })));
const RegisterPage = lazy(() => import("../pages/auth/Register").then(m => ({ default: m.RegisterPage })));
const LoginPage = lazy(() => import("../pages/auth/Login").then(m => ({ default: m.LoginPage })));
const ForgotPasswordPage = lazy(() => import("../pages/auth/ForgotPassword").then(m => ({ default: m.ForgotPasswordPage })));
const OTPPasswordPage = lazy(() => import("../pages/auth/OTPPassword").then(m => ({ default: m.OTPPasswordPage })));
const ResetPasswordPage = lazy(() => import("../pages/auth/ResetPassword").then(m => ({ default: m.ResetPasswordPage })));
const ServicePage = lazy(() => import("../pages/service/Service").then(m => ({ default: m.ServicePage })));
const ServiceDetailPage = lazy(() => import("../pages/service/ServiceDetail").then(m => ({ default: m.ServiceDetailPage })));
const ServiceCheckoutPage = lazy(() => import("../pages/service/ServiceCheckout").then(m => ({ default: m.ServiceCheckoutPage })));
const CartPage = lazy(() => import("../pages/cart/Cart").then(m => ({ default: m.CartPage })));
const CheckoutPage = lazy(() => import("../pages/checkout/Checkout").then(m => ({ default: m.CheckoutPage })));
const CheckSuccessPage = lazy(() => import("../pages/checkout/CheckoutSuccess").then(m => ({ default: m.CheckSuccessPage })));
const ProfilePage = lazy(() => import("../pages/dashboard/Profile").then(m => ({ default: m.ProfilePage })));
const OverviewPage = lazy(() => import("../pages/dashboard/Overview").then(m => ({ default: m.OverviewPage })));
const ProfileEditPage = lazy(() => import("../pages/dashboard/ProfileEdit").then(m => ({ default: m.ProfileEditPage })));
const AddressListPage = lazy(() => import("../pages/dashboard/AddressList").then(m => ({ default: m.AddressListPage })));
const AddressCreatePage = lazy(() => import("../pages/dashboard/AddressCreate").then(m => ({ default: m.AddressCreatePage })));
const AddressEditPage = lazy(() => import("../pages/dashboard/AddressEdit").then(m => ({ default: m.AddressEditPage })));
const WishlistPage = lazy(() => import("../pages/dashboard/Wishlist").then(m => ({ default: m.WishlistPage })));
const ChangePasswordPage = lazy(() => import("../pages/dashboard/ChangePassword").then(m => ({ default: m.ChangePasswordPage })));
const ReviewPage = lazy(() => import("../pages/dashboard/Review").then(m => ({ default: m.ReviewPage })));
const OrderDetailPage = lazy(() => import("../pages/dashboard/OrderDetail").then(m => ({ default: m.OrderDetailPage })));
const OrderHistoryPage = lazy(() => import("../pages/dashboard/OrderHistory").then(m => ({ default: m.OrderHistoryPage })));
const OrderInvoicePage = lazy(() => import("../pages/dashboard/OrderInvoice").then(m => ({ default: m.OrderInvoicePage })));
const PetListPage = lazy(() => import("../pages/dashboard/PetList").then(m => ({ default: m.PetListPage })));
const PetCreatePage = lazy(() => import("../pages/dashboard/PetCreate").then(m => ({ default: m.PetCreatePage })));
const PetEditPage = lazy(() => import("../pages/dashboard/PetEdit").then(m => ({ default: m.PetEditPage })));
const BookingSuccessPage = lazy(() => import("../pages/booking/BookingSuccess").then(m => ({ default: m.BookingSuccessPage })));
const BookingHistoryPage = lazy(() => import("../pages/dashboard/BookingHistory").then(m => ({ default: m.BookingHistoryPage })));
const BookingDetailPage = lazy(() => import("../pages/dashboard/BookingDetail").then(m => ({ default: m.BookingDetailPage })));
const TransactionHistoryPage = lazy(() => import("../pages/dashboard/TransactionHistory").then(m => ({ default: m.TransactionHistoryPage })));
const StaticPage = lazy(() => import("../pages/static/StaticPage").then(m => ({ default: m.StaticPage })));
const FaqPage = lazy(() => import("../pages/static/FaqPage").then(m => ({ default: m.FaqPage })));
const ContactPage = lazy(() => import("../pages/static/ContactPage").then(m => ({ default: m.ContactPage })));
const NotFoundPage = lazy(() => import("../pages/static/NotFound").then(m => ({ default: m.NotFound })));

export const ClientRoutes: RouteObject[] = [
    { path: "/", element: <HomePage /> },
    { path: "/about", element: <StaticPage /> },
    { path: "/stores", element: <StaticPage /> },
    { path: "/faq", element: <FaqPage /> },
    { path: "/contact", element: <ContactPage /> },
    { path: "/policy/:type", element: <StaticPage /> },
    { path: "/product/detail/:slug", element: <ProductDetailPage /> },

    { path: "/shop", element: <ProductListPage /> },
    { path: "/blogs", element: <BlogListPage /> },
    { path: "/cart", element: <CartPage /> },
    { path: "/checkout", element: <CheckoutPage /> },
    { path: "/order/success", element: <CheckSuccessPage /> },
    { path: "/booking/success", element: <BookingSuccessPage /> },
    { path: "/services/booking/success", element: <BookingSuccessPage /> },
    { path: "/services", element: <ServicePage /> },
    { path: "/services/:slug", element: <ServiceDetailPage /> },
    { path: "/services/checkout/:id", element: <ServiceCheckoutPage /> },
    {
        element: <AuthGuard />,
        children: []
    },
    { path: "/auth/register", element: <RegisterPage /> },
    { path: "/auth/login", element: <LoginPage /> },
    { path: "/auth/forgot-password", element: <ForgotPasswordPage /> },
    { path: "/auth/otp-password", element: <OTPPasswordPage /> },
    { path: "/auth/reset-password", element: <ResetPasswordPage /> },
    {
        path: "/dashboard",
        element: <AuthGuard />,
        children: [
            { path: "profile", element: <ProfilePage /> },
            { path: "overview", element: <OverviewPage /> },
            { path: "profile/edit", element: <ProfileEditPage /> },
            { path: "address", element: <AddressListPage /> },
            { path: "address/create", element: <AddressCreatePage /> },
            { path: "address/edit/:id", element: <AddressEditPage /> },
            { path: "wishlist", element: <WishlistPage /> },
            { path: "change-password", element: <ChangePasswordPage /> },
            { path: "review", element: <ReviewPage /> },
            { path: "order/invoice/:id", element: <OrderInvoicePage /> },
            { path: "order/detail/:id", element: <OrderDetailPage /> },
            { path: "orders", element: <OrderHistoryPage /> },
            { path: "bookings", element: <BookingHistoryPage /> },
            { path: "transactions", element: <TransactionHistoryPage /> },
            { path: "booking/detail/:id", element: <BookingDetailPage /> },
            { path: "pet", element: <PetListPage /> },
            { path: "pet/create", element: <PetCreatePage /> },
            { path: "pet/edit/:id", element: <PetEditPage /> },
        ]
    },
];
