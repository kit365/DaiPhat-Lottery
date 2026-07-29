import {
    Box,
    Card,
    CircularProgress,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from "@mui/material";
import { Edit2 } from "lucide-react";
import { CanAccess } from "../../../../components/auth/CanAccess";
import { PERMISSIONS } from "../../../../constants/permission.constants";
import { LotteryRegionResponse, formatRegionDefaultDrawTime } from "../../types/region.type";

interface RegionListProps {
    regions: LotteryRegionResponse[];
    isLoading: boolean;
    onEdit: (region: LotteryRegionResponse) => void;
}

export const RegionList = ({ regions, isLoading, onEdit }: RegionListProps) => {
    const showEmpty = !isLoading && regions.length === 0;

    return (
        <Card elevation={0} className="admin-datagrid-card">
            <div className="admin-table-wrap">
                {isLoading || showEmpty ? (
                    <Box className="admin-table-overlay">
                        {isLoading ? (
                            <CircularProgress size={32} />
                        ) : (
                            <span className="admin-datagrid-empty">Không có dữ liệu</span>
                        )}
                    </Box>
                ) : (
                    <TableContainer className="admin-table-container">
                        <Table className="admin-table">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Mã</TableCell>
                                    <TableCell>Tên Miền</TableCell>
                                    <TableCell>Loại vé</TableCell>
                                    <TableCell>Độ dài số</TableCell>
                                    <TableCell>Dải số (Min - Max)</TableCell>
                                    <TableCell align="center">Giờ quay mặc định</TableCell>
                                    <TableCell align="center">Số đài dự kiến</TableCell>
                                    <TableCell align="right">Hành động</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {regions.map((region) => (
                                    <TableRow key={region.id}>
                                        <TableCell>{region.code}</TableCell>
                                        <TableCell>
                                            <span className="admin-cell-text">{region.name}</span>
                                        </TableCell>
                                        <TableCell>{region.type}</TableCell>
                                        <TableCell>{region.numberLength}</TableCell>
                                        <TableCell>
                                            {region.minNumber} - {region.maxNumber}
                                        </TableCell>
                                        <TableCell align="center">
                                            {formatRegionDefaultDrawTime(region.defaultDrawTime)}
                                        </TableCell>
                                        <TableCell align="center">{region.stationCount}</TableCell>
                                        <TableCell align="right">
                                            <CanAccess permission={PERMISSIONS.REGION.EDIT}>
                                                <IconButton
                                                    onClick={() => onEdit(region)}
                                                    size="small"
                                                    className="admin-table-action"
                                                >
                                                    <Edit2 size={18} />
                                                </IconButton>
                                            </CanAccess>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </div>
        </Card>
    );
};
