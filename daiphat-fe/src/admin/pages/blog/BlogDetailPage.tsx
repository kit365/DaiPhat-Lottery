import {
    Box,
    Button,
    Container,
    IconButton,
    Menu,
    MenuItem,
    SpeedDial,
    SpeedDialAction,
    Tooltip,
    Typography,
    CircularProgress,
    Stack,
    Divider
} from "@mui/material"
import { prefixAdmin } from "../../constants/routes"
import { ArrowIcon, EditIcon, GoLiveIcon, UploadIcon, DraftIcon, ArchivedIcon, ShareIcon, FacebookIcon, InstagramIcon } from "../../assets/icons"
import { Link, useParams, useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"
import { useBlogDetail, useUpdateBlog } from "./hooks/useBlog"
import dayjs from "dayjs"
import 'dayjs/locale/vi'
import { toast } from "react-toastify"

type BlogStatus = "published" | "draft" | "archived"

const getItemStyle = (current: BlogStatus, value: BlogStatus) => ({
    mb: "4px",
    borderRadius: "var(--shape-borderRadius)",
    fontWeight: current === value ? 600 : 400,
    backgroundColor:
        current === value
            ? "rgba(145 158 171 / 16%)"
            : "transparent",
    gap: "calc(2 * var(--spacing))",
    "&:hover": {
        backgroundColor: "rgba(145 158 171 / 24%)"
    }
})

export const BlogDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const open = Boolean(anchorEl)

    const { data: detailRes, isLoading, refetch } = useBlogDetail(id);
    const { mutate: updateBlog } = useUpdateBlog();

    // Status local để hiển thị khi chưa update xong hoặc để thao tác
    const [status, setStatus] = useState<BlogStatus>("draft");

    useEffect(() => {
        if (detailRes) {
            setStatus(detailRes.status || "draft");
        }
    }, [detailRes]);

    const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget)
    }

    const handleClose = () => {
        setAnchorEl(null)
    }

    const handleChangeStatus = (value: BlogStatus) => {
        if (value === status) {
            handleClose();
            return;
        }

        // Gọi API update status
        updateBlog({ id: id!, data: { status: value } }, {
            onSuccess: (res) => {
                if (res.success) {
                    toast.success("Cập nhật trạng thái thành công");
                    setStatus(value);
                    refetch();
                } else {
                    toast.error(res.message);
                }
            },
            onError: () => toast.error("Có lỗi xảy ra")
        });
        handleClose()
    }

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <CircularProgress color="inherit" />
            </Box>
        );
    }

    const blog = detailRes;
    if (!blog) return <Box sx={{ textAlign: 'center', py: 5 }}>Không tìm thấy bài viết</Box>;

    return (
        <>
            <Container disableGutters maxWidth={false} sx={{ px: "40px" }}>
                <Box sx={{ mb: "40px", gap: "12px", display: "flex", alignItems: 'flex-start' }}>
                    {/* Back */}
                    <Button
                        component={Link}
                        to={`/${prefixAdmin}/blog/list`}
                        color="inherit"
                        startIcon={
                            <ArrowIcon sx={{ rotate: "90deg", width: 16, height: 16 }} />
                        }
                        disableElevation
                        sx={{
                            fontWeight: 700,
                            textTransform: "none",
                            fontSize: "0.8125rem",
                            borderRadius: "var(--shape-borderRadius)",
                            "&:hover": {
                                backgroundColor: "var(--palette-text-disabled)14"
                            }
                        }}
                    >
                        Quay lại
                    </Button>

                    <Box sx={{ flex: 1 }} />

                    <Box sx={{ display: "flex", gap: "12px" }}>
                        {/* Actions */}
                        {status === 'published' && (
                            <Tooltip title="Xem trực tiếp">
                                <IconButton component={Link} to={`/blog/${blog.id}`} target="_blank">
                                    <GoLiveIcon />
                                </IconButton>
                            </Tooltip>
                        )}

                        <Tooltip title="Chỉnh sửa">
                            <IconButton onClick={() => navigate(`/${prefixAdmin}/blog/edit/${blog.id}`)}>
                                <EditIcon sx={{ mr: 0, color: "var(--palette-text-secondary)" }} />
                            </IconButton>
                        </Tooltip>

                        {/* Status Button */}
                        <Button
                            variant="contained"
                            color="inherit"
                            disableElevation
                            onClick={handleOpen}
                            endIcon={<ArrowIcon />}
                            sx={{
                                textTransform: "none",
                                fontWeight: 700,
                                fontSize: "0.8125rem",
                                backgroundColor: "var(--palette-text-primary)",
                                color: "var(--palette-common-white)",
                                borderRadius: "var(--shape-borderRadius)",
                                padding: "6px 12px",
                                "&:hover": {
                                    backgroundColor: "var(--palette-grey-700)",
                                    boxShadow: "var(--customShadows-z8)"
                                }
                            }}
                        >
                            {status === "published"
                                ? "Xuất bản"
                                : status === "draft"
                                    ? "Bản nháp"
                                    : "Đã lưu trữ"}
                        </Button>
                    </Box>

                    {/* MENU */}
                    <Menu
                        anchorEl={anchorEl}
                        open={open}
                        onClose={handleClose}
                        slotProps={{
                            paper: {
                                sx: {
                                    borderRadius: "10px",
                                    minWidth: 140,
                                    boxShadow:
                                        "0 0 2px 0 rgba(145 158 171 / 24%), -20px 20px 40px -4px rgba(145 158 171 / 24%)",
                                    overflow: "visible",
                                    mt: 1,
                                    '& .MuiMenuItem-root': {
                                        fontSize: '0.875rem'
                                    }
                                }
                            }
                        }}
                        anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'right',
                        }}
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'right',
                        }}
                    >
                        <MenuItem
                            dense
                            sx={getItemStyle(status, "published")}
                            onClick={() => handleChangeStatus("published")}
                        >
                            <UploadIcon sx={{ fontSize: "1.25rem" }} />
                            Xuất bản
                        </MenuItem>

                        <MenuItem
                            dense
                            sx={getItemStyle(status, "draft")}
                            onClick={() => handleChangeStatus("draft")}
                        >
                            <DraftIcon />
                            Bản nháp
                        </MenuItem>

                        <MenuItem
                            dense
                            sx={getItemStyle(status, "archived")}
                            onClick={() => handleChangeStatus("archived")}
                        >
                            <ArchivedIcon />
                            Đã lưu trữ
                        </MenuItem>
                    </Menu>
                </Box>
            </Container>

            {/* Image + Title */}
            <Box
                sx={{
                    backgroundImage: `linear-gradient(0deg, rgba(20, 26, 33, 0.64), rgba(20, 26, 33, 0.64)), url("${blog.featuredImage || 'https://api-prod-minimal-v700.pages.dev/assets/images/cover/cover-3.webp'}")`,
                    backgroundSize: "cover",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center center",
                    height: "480px",
                    overflow: "hidden",
                }}
            >
                <Container sx={{ height: "100%", position: "relative" }}>
                    <Stack sx={{ height: '100%', justifyContent: 'flex-end', pb: '80px' }}>
                        <Typography sx={{ fontSize: "1.875rem", maxWidth: "720px", fontWeight: "700", zIndex: "9", color: "var(--palette-common-white)", lineHeight: "1.5" }}>
                            {blog.title}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 2, color: "var(--palette-common-white)", opacity: 0.8, fontSize: '0.875rem' }}>
                            <Box component="span">
                                {dayjs(blog.createdAt).locale('vi').format('DD MMM YYYY, HH:mm')}
                            </Box>
                        </Box>
                    </Stack>

                    <Box sx={{ position: "absolute", left: "0", bottom: "0", width: "100%" }}>
                        <SpeedDial
                            ariaLabel="Share post"
                            direction="left"
                            icon={<ShareIcon />}
                            sx={{
                                position: "absolute",
                                bottom: "64px",
                                right: "24px",
                                zIndex: "1050",

                                '& .MuiFab-root': {
                                    width: "48px",
                                    height: "48px",
                                    backgroundColor: "var(--palette-primary-main)",

                                    '& .MuiSvgIcon-root': {
                                        color: "var(--palette-common-white)",
                                        width: "1.25rem",
                                        height: "1.25rem"
                                    }
                                },
                                '& .MuiSpeedDialAction-fab': {
                                    width: "2.5rem",
                                    height: "2.5rem",
                                    boxShadow: "var(--customShadows-z8)",
                                    backgroundColor: "var(--palette-background-paper)",
                                    m: "8px",

                                    '& svg': {
                                        width: "1.25rem",
                                        height: "1.25rem"
                                    }
                                }
                            }}
                        >
                            <SpeedDialAction
                                icon={<FacebookIcon />}
                                sx={{ transitionDelay: "120ms !important" }}
                                slotProps={{
                                    tooltip: {
                                        title: "Facebook",
                                    },
                                }}
                            />
                            <SpeedDialAction
                                icon={<InstagramIcon />}
                                sx={{ transitionDelay: "90ms !important" }}
                                slotProps={{
                                    tooltip: {
                                        title: "Instagram",
                                    },
                                }}
                            />
                        </SpeedDial>
                    </Box>
                </Container >
            </Box >

            {/* Content */}
            <Container maxWidth="md" sx={{ mt: 8, mb: 10 }}>
                <Typography variant="h6" sx={{ mb: 3, fontStyle: 'italic', opacity: 0.8, color: 'var(--palette-text-secondary)' }}>
                    {blog.excerpt || blog.metaDescription}
                </Typography>

                <Divider sx={{ mb: 4 }} />

                <Box className="prose lg:prose-xl" sx={{
                    color: 'var(--palette-text-primary)',
                    '& img': { borderRadius: "var(--shape-borderRadius-md)", my: 3 },
                    '& p': { mb: 2, fontSize: '1rem', lineHeight: 1.8 },
                    '& h2': { fontSize: '1.5rem', fontWeight: 700, mt: 4, mb: 2 },
                    '& h3': { fontSize: '1.25rem', fontWeight: 700, mt: 3, mb: 2 },
                    '& ul, & ol': { pl: 3, mb: 2 },
                    '& li': { mb: 1, fontSize: '1rem' },
                }}>
                    <div dangerouslySetInnerHTML={{ __html: blog.content }} />
                </Box>

            </Container>
        </>

    )
}




