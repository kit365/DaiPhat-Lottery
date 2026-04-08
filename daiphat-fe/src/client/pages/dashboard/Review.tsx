import { Link } from "react-router-dom";
import { ProductBanner } from "../product/sections/ProductBanner";
import { Sidebar } from "./sections/Sidebar";
import StarIcon from "@mui/icons-material/Star";
import { useMyReviews } from "../../hooks/useMyReviews";
import { format } from "date-fns";
import { useState, useRef } from "react";
import { Modal, Box, IconButton, TextField, Button, Rating } from "@mui/material";
import { Xmark, MediaImage, Trash } from "iconoir-react";
import { toast } from "react-toastify";
import { uploadImagesToCloudinary } from "../../../admin/api/uploadCloudinary.api";
import { useProductReviews } from "../../hooks/useProductReviews";

export const ReviewPage = () => {
    const { data: reviewsData, isLoading, refetch } = useMyReviews();
    const reviews = reviewsData?.data || [];

    const [openModal, setOpenModal] = useState(false);
    const [selectedReview, setSelectedReview] = useState<any>(null);
    const [editRating, setEditRating] = useState(5);
    const [editComment, setEditComment] = useState("");
    const [editImages, setEditImages] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Dùng hook này để gọi mutation update
    // Truyền productId rỗng vì ta sẽ dùng selectedReview.productId._id sau
    const { updateReview, isUpdating } = useProductReviews("");

    const handleOpenEdit = (review: any) => {
        setSelectedReview(review);
        setEditRating(review.rating);
        setEditComment(review.comment);
        setEditImages(review.images || []);
        setOpenModal(true);
    };

    const handleCloseModal = () => {
        setOpenModal(false);
        setSelectedReview(null);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setIsUploading(true);
        try {
            const uploadedUrls = await uploadImagesToCloudinary(Array.from(files));
            setEditImages(prev => [...prev, ...uploadedUrls]);
            toast.success("Tải ảnh lên thành công!");
        } catch (error) {
            toast.error("Lỗi khi tải ảnh lên!");
        } finally {
            setIsUploading(false);
        }
    };

    const handleUpdate = () => {
        if (!editComment.trim()) {
            toast.error("Vui lòng nhập nhận xét");
            return;
        }

        updateReview({
            id: selectedReview._id,
            data: {
                rating: editRating,
                comment: editComment,
                images: editImages
            }
        }, {
            onSuccess: (data: any) => {
                if (data.success) {
                    toast.success(data.message);
                    handleCloseModal();
                    refetch(); // Tải lại danh sách "My Reviews"
                } else {
                    toast.error(data.message);
                }
            },
            onError: (err: any) => {
                toast.error(err.response?.data?.message || "Lỗi khi cập nhật");
            }
        });
    };

    const breadcrumbs = [
        { label: "Trang chủ", to: "/" },
        { label: "Tài khoản", to: "/dashboard/profile" },
        { label: "Đánh giá của tôi", to: `/dashboard/review` },
    ];

    return (
        <>
            <ProductBanner
                pageTitle="Đánh giá của tôi"
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
                        <h3 className="text-[24px] font-[600] text-client-secondary mb-[25px]">
                            Đánh giá của tôi ({reviews.length})
                        </h3>

                        {isLoading ? (
                            <div className="py-10 text-center">Đang tải đánh giá...</div>
                        ) : reviews.length === 0 ? (
                            <div className="p-[50px] border border-[#eee] rounded-[10px] flex flex-col items-center justify-center text-center space-y-[20px]">
                                <div className="w-[100px] h-[100px] bg-gray-50 rounded-full flex items-center justify-center">
                                    <span className="text-[40px]">✍️</span>
                                </div>
                                <div className="space-y-[5px]">
                                    <p className="text-[18px] font-[600] text-client-secondary tracking-tight">Chưa có đánh giá nào</p>
                                    <p className="text-[15px] text-[#7d7b7b]">Bạn chưa thực hiện đánh giá nào.</p>
                                </div>
                            </div>
                        ) : (
                            reviews.map((review: any) => (
                                <div key={review._id} className="border border-[#eee] p-[20px] mb-[20px] rounded-[10px] flex">
                                    <img
                                        className="w-[70px] h-[70px] rounded-[12px] overflow-hidden border-[3px] shadow-[0px_7px_29px_0px_#64646f33] border-white object-cover"
                                        src={review.targetImage || "https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/05/product-img-11c-1000x1048.jpg"}
                                        alt=""
                                    />
                                    <div className="pl-[25px] flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${review.reviewType === 'product' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                                                {review.reviewType === 'product' ? 'Đơn hàng' : 'Dịch vụ'}
                                            </span>

                                            <h5 className="text-[17px] font-[600] text-client-secondary hover:text-client-primary transition-default">
                                                {review.targetLink && review.targetLink !== '#' ? (
                                                    <Link to={review.targetLink}>{review.targetName || 'Sản phẩm'}</Link>
                                                ) : (
                                                    <span>{review.targetName || 'Dịch vụ'}</span>
                                                )}
                                            </h5>
                                        </div>
                                        <div className="flex items-center gap-2 mt-[2px] mb-[13px]">
                                            <p className="text-[13px] text-client-secondary">
                                                {format(new Date(review.createdAt), 'dd MMMM yyyy')}
                                            </p>
                                            <span className={`text-[11px] px-2 py-0.5 rounded-full border ${review.status === 'approved' ? 'border-green-500 text-green-600 bg-green-50' :
                                                review.status === 'pending' ? 'border-orange-500 text-orange-600 bg-orange-50' :
                                                    'border-red-500 text-red-600 bg-red-50'
                                                }`}>
                                                {review.status === 'approved' ? 'Đã duyệt' : review.status === 'pending' ? 'Chờ duyệt' : 'Từ chối'}
                                            </span>
                                        </div>
                                        <p className="text-[#7d7b7b] text-[14px] mb-[15px]">{review.comment}</p>
                                        {review.images && review.images.length > 0 && (
                                            <div className="flex gap-[10px]">
                                                {review.images.map((img: string, idx: number) => (
                                                    <img key={idx} src={img} alt="" className="w-[60px] h-[60px] rounded-[8px] object-cover border border-[#eee]" />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end justify-between self-stretch ml-4 min-w-[120px]">
                                        <span className="flex items-center gap-[2px]">
                                            {[...Array(5)].map((_, i) => (
                                                <StarIcon
                                                    key={i}
                                                    sx={{
                                                        fontSize: "20px !important",
                                                        color: i < review.rating ? "#F9A61C !important" : "#ccc !important",
                                                    }}
                                                />
                                            ))}
                                        </span>
                                        {review.reviewType === 'product' && (
                                            <button
                                                onClick={() => handleOpenEdit(review)}
                                                className="px-4 py-1.5 border border-client-primary text-client-primary text-[13px] font-medium rounded-full hover:bg-client-primary hover:text-white transition-all cursor-pointer whitespace-nowrap"
                                            >
                                                Sửa đánh giá
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div >

            <Modal open={openModal} onClose={handleCloseModal}>
                <Box sx={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: { xs: '90%', sm: 500 }, bgcolor: 'background.paper', borderRadius: '16px',
                    boxShadow: 24, p: 4, outline: 'none'
                }}>
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="text-[20px] font-bold text-client-secondary">Chỉnh sửa đánh giá</h4>
                        <IconButton onClick={handleCloseModal} size="small">
                            <Xmark className="w-6 h-6" />
                        </IconButton>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-[14px] font-medium text-gray-700 mb-2">Đánh giá của bạn</label>
                            <Rating
                                value={editRating}
                                onChange={(_, newValue) => setEditRating(newValue || 5)}
                                sx={{ color: '#FF6262', fontSize: '32px' }}
                            />
                        </div>

                        <div>
                            <label className="block text-[14px] font-medium text-gray-700 mb-2">Nhận xét</label>
                            <TextField
                                fullWidth
                                multiline
                                rows={4}
                                value={editComment}
                                onChange={(e) => setEditComment(e.target.value)}
                                placeholder="Nhập nhận xét của bạn..."
                                variant="outlined"
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                            />
                        </div>

                        <div>
                            <label className="block text-[14px] font-medium text-gray-700 mb-2">Hình ảnh</label>
                            <div className="flex flex-wrap gap-2">
                                {editImages.map((img, i) => (
                                    <div key={i} className="relative w-16 h-16 rounded-lg border overflow-hidden group">
                                        <img src={img} alt="" className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => setEditImages(prev => prev.filter((_, idx) => idx !== i))}
                                            className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                        >
                                            <Trash className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                                {editImages.length < 5 && (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-16 h-16 border-2 border-dashed rounded-lg flex items-center justify-center text-gray-400 hover:border-client-primary hover:text-client-primary cursor-pointer"
                                    >
                                        {isUploading ? <div className="w-4 h-4 border-2 border-t-transparent border-client-primary rounded-full animate-spin" /> : <MediaImage className="w-6 h-6" />}
                                    </button>
                                )}
                                <input type="file" ref={fileInputRef} hidden multiple onChange={handleFileChange} accept="image/*" />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button
                                fullWidth
                                variant="contained"
                                onClick={handleUpdate}
                                disabled={isUpdating || isUploading}
                                sx={{
                                    bgcolor: 'var(--palette-client-primary)',
                                    borderRadius: '50px',
                                    py: 1.5,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    '&:hover': { bgcolor: 'var(--palette-client-secondary)' }
                                }}
                            >
                                {isUpdating ? 'Đang lưu...' : 'Lưu thay đổi'}
                            </Button>
                            <Button
                                fullWidth
                                variant="outlined"
                                onClick={handleCloseModal}
                                disabled={isUpdating}
                                sx={{
                                    borderColor: '#ddd',
                                    color: 'var(--palette-client-secondary)',
                                    borderRadius: '50px',
                                    py: 1.5,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    '&:hover': { borderColor: '#999', bgcolor: '#f5f5f5' }
                                }}
                            >
                                Hủy
                            </Button>
                        </div>
                    </div>
                </Box>
            </Modal>
        </>
    );
};

