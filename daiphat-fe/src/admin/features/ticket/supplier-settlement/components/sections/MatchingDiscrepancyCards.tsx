'use client';

import { Box, Chip, Grid, Stack, Typography } from '@mui/material';

const money = (value: number) => Math.round(value).toLocaleString('vi-VN');
const signedMoney = (value: number) => `${value > 0 ? '+' : ''}${money(value)} VNĐ`;
const percent = (value: number) => `${(value * 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`;

type SideProps = {
    label: string;
    quantity: number;
    grossUnitPrice: number;
    netUnitPrice: number;
    total: number;
    tone: 'system' | 'actual';
};

const QuantitySide = ({ label, quantity, grossUnitPrice, netUnitPrice, total, tone }: SideProps) => (
    <Box sx={{ height: '100%', p: 1.5, borderRadius: '10px', bgcolor: tone === 'system' ? '#f8fafc' : '#eff6ff', border: `1px solid ${tone === 'system' ? '#e2e8f0' : '#bfdbfe'}` }}>
        <Typography variant="caption" fontWeight={800} color={tone === 'system' ? '#475569' : '#1d4ed8'} sx={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
            {label}
        </Typography>
        <Typography variant="h6" fontWeight={900} color="#0f172a" sx={{ mt: 0.35, mb: 1 }}>
            {quantity.toLocaleString('vi-VN')} <Box component="span" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>vé</Box>
        </Typography>
        <Stack spacing={0.5}>
            <Stack direction="row" justifyContent="space-between" gap={1}>
                <Typography variant="caption" color="#64748b">Giá nhập / tờ</Typography>
                <Typography variant="caption" fontWeight={700}>{money(grossUnitPrice)} VNĐ</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" gap={1}>
                <Typography variant="caption" color="#64748b">Sau hoa hồng / tờ</Typography>
                <Typography variant="caption" fontWeight={700}>{money(netUnitPrice)} VNĐ</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" gap={1} sx={{ pt: 0.65, borderTop: '1px solid #cbd5e1' }}>
                <Typography variant="caption" fontWeight={700}>Tổng giá trị</Typography>
                <Typography variant="caption" fontWeight={800}>{money(total)} VNĐ</Typography>
            </Stack>
        </Stack>
    </Box>
);

export type QuantityDiscrepancyProps = {
    title: string;
    systemQuantity: number;
    actualQuantity: number;
    systemGrossUnitPrice: number;
    actualGrossUnitPrice: number;
    systemNetUnitPrice: number;
    actualNetUnitPrice: number;
    systemTotal: number;
    actualTotal: number;
    mode?: 'summary' | 'detail';
};

export const QuantityDiscrepancyCard = (props: QuantityDiscrepancyProps) => {
    const quantityDifference = props.actualQuantity - props.systemQuantity;
    const valueDifference = props.actualTotal - props.systemTotal;
    if (props.mode === 'summary') {
        return (
            <Box sx={{ p: 1.5, bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #f59e0b', borderRadius: '10px' }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={1} sx={{ mb: 1.25 }}>
                    <Typography variant="body2" fontWeight={800} color="#0f172a">{props.title}</Typography>
                    <Chip size="small" label={`Lệch ${quantityDifference > 0 ? '+' : ''}${quantityDifference.toLocaleString('vi-VN')} vé`} sx={{ bgcolor: '#fff7ed', color: '#9a3412', fontWeight: 800 }} />
                </Stack>
                <Grid container spacing={1}>
                    {[
                        { label: 'Hệ thống', value: `${props.systemQuantity.toLocaleString('vi-VN')} vé`, note: `${money(props.systemTotal)} VNĐ`, tone: '#475569', bg: '#f8fafc', border: '#e2e8f0' },
                        { label: 'Thực tế', value: `${props.actualQuantity.toLocaleString('vi-VN')} vé`, note: `${money(props.actualTotal)} VNĐ`, tone: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
                        { label: 'Chênh tổng giá trị', value: signedMoney(valueDifference), note: 'Gồm số lượng và đơn giá', tone: '#9a3412', bg: '#fff7ed', border: '#fed7aa' },
                    ].map((item) => (
                        <Grid key={item.label} size={{ xs: 12, sm: 4 }}>
                            <Box sx={{ height: '100%', p: 1.1, borderRadius: '8px', bgcolor: item.bg, border: `1px solid ${item.border}` }}>
                                <Typography variant="caption" color={item.tone} fontWeight={700}>{item.label}</Typography>
                                <Typography variant="subtitle2" color={item.label === 'Chênh tổng giá trị' ? item.tone : '#0f172a'} fontWeight={900} sx={{ mt: 0.2 }}>{item.value}</Typography>
                                <Typography variant="caption" color="#64748b">{item.note}</Typography>
                            </Box>
                        </Grid>
                    ))}
                </Grid>
            </Box>
        );
    }
    return (
        <Box sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #f59e0b', borderRadius: '12px' }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={1} sx={{ mb: 1.5 }}>
                <Typography variant="body2" fontWeight={800} color="#0f172a">{props.title}</Typography>
                <Chip size="small" label={`Lệch ${quantityDifference > 0 ? '+' : ''}${quantityDifference.toLocaleString('vi-VN')} vé`} sx={{ bgcolor: '#fff7ed', color: '#9a3412', fontWeight: 800 }} />
            </Stack>
            <Grid container spacing={1.25}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <QuantitySide label="Hệ thống" quantity={props.systemQuantity} grossUnitPrice={props.systemGrossUnitPrice}
                        netUnitPrice={props.systemNetUnitPrice} total={props.systemTotal} tone="system" />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <QuantitySide label="Thực tế" quantity={props.actualQuantity} grossUnitPrice={props.actualGrossUnitPrice}
                        netUnitPrice={props.actualNetUnitPrice} total={props.actualTotal} tone="actual" />
                </Grid>
            </Grid>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={0.5} sx={{ mt: 1.25, px: 1.25, py: 0.9, bgcolor: '#fffbeb', borderRadius: '8px' }}>
                <Typography variant="caption" color="#92400e" fontWeight={700}>Chênh tổng giá trị (gồm số lượng và đơn giá)</Typography>
                <Typography variant="caption" color="#9a3412" fontWeight={900}>{signedMoney(valueDifference)}</Typography>
            </Stack>
        </Box>
    );
};

export type MismatchedStation = {
    id: number;
    name: string;
    systemGross: number;
    actualGross: number;
    systemCommission: number;
    actualCommission: number;
    systemNet: number;
    actualNet: number;
    priceChanged: boolean;
    commissionChanged: boolean;
};

type PriceProps = {
    systemNetUnitPrice: number;
    actualNetUnitPrice: number;
    stations: MismatchedStation[];
    mode?: 'summary' | 'detail';
};

export const UnitPriceDiscrepancyCard = ({ systemNetUnitPrice, actualNetUnitPrice, stations, mode = 'detail' }: PriceProps) => {
    const difference = actualNetUnitPrice - systemNetUnitPrice;
    if (mode === 'summary') {
        return (
            <Box sx={{ p: 1.5, bgcolor: '#ffffff', border: '1px solid #fed7aa', borderLeft: '4px solid #f97316', borderRadius: '10px' }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={1} sx={{ mb: 1.25 }}>
                    <Box>
                        <Typography variant="body2" fontWeight={800} color="#0f172a">Chênh lệch giá nhập mỗi vé</Typography>
                        <Typography variant="caption" color="#64748b">Giá sau hoa hồng trên mỗi vé</Typography>
                    </Box>
                    <Chip size="small" label={`${signedMoney(difference)}/vé`} sx={{ bgcolor: '#fff7ed', color: '#9a3412', fontWeight: 800 }} />
                </Stack>
                <Grid container spacing={1}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Box sx={{ p: 1.1, borderRadius: '8px', bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                            <Typography variant="caption" color="#64748b" fontWeight={700}>Hệ thống</Typography>
                            <Typography variant="subtitle2" fontWeight={900}>{money(systemNetUnitPrice)} VNĐ/vé</Typography>
                        </Box>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Box sx={{ p: 1.1, borderRadius: '8px', bgcolor: '#eff6ff', border: '1px solid #bfdbfe' }}>
                            <Typography variant="caption" color="#1d4ed8" fontWeight={700}>Thực tế</Typography>
                            <Typography variant="subtitle2" fontWeight={900}>{money(actualNetUnitPrice)} VNĐ/vé</Typography>
                        </Box>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Box sx={{ height: '100%', p: 1.1, borderRadius: '8px', bgcolor: '#fff7ed', border: '1px solid #fed7aa' }}>
                            <Typography variant="caption" color="#9a3412" fontWeight={700}>Nhà đài bị lệch</Typography>
                            <Typography variant="subtitle2" color="#9a3412" fontWeight={900}>{stations.length} đài</Typography>
                        </Box>
                    </Grid>
                </Grid>
                {stations.length > 0 && (
                    <Typography variant="caption" color="#64748b" sx={{ display: 'block', mt: 1 }}>
                        {stations.slice(0, 3).map((station) => station.name).join(' · ')}
                        {stations.length > 3 ? ` · +${stations.length - 3} đài khác` : ''}
                    </Typography>
                )}
            </Box>
        );
    }
    return (
        <Box sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: '#ffffff', border: '1px solid #fed7aa', borderLeft: '4px solid #f97316', borderRadius: '12px' }}>
            <Typography variant="body2" fontWeight={800} color="#0f172a" sx={{ mb: 0.5 }}>Chênh lệch giá nhập mỗi vé</Typography>
            <Typography variant="caption" color="#64748b">Giá sau hoa hồng trên mỗi vé, tính theo số lượng nhập của các nhà đài</Typography>
            <Grid container spacing={1.25} sx={{ mt: 0.5 }}>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <Box sx={{ p: 1.25, bgcolor: '#f8fafc', borderRadius: '9px', border: '1px solid #e2e8f0' }}>
                        <Typography variant="caption" color="#64748b">Hệ thống · sau HH / vé</Typography>
                        <Typography variant="subtitle1" fontWeight={800}>{money(systemNetUnitPrice)} VNĐ</Typography>
                    </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <Box sx={{ p: 1.25, bgcolor: '#eff6ff', borderRadius: '9px', border: '1px solid #bfdbfe' }}>
                        <Typography variant="caption" color="#1d4ed8">Thực tế · sau HH / vé</Typography>
                        <Typography variant="subtitle1" fontWeight={800}>{money(actualNetUnitPrice)} VNĐ</Typography>
                    </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <Box sx={{ p: 1.25, bgcolor: '#fff7ed', borderRadius: '9px', border: '1px solid #fed7aa' }}>
                        <Typography variant="caption" color="#9a3412">Chênh lệch / vé</Typography>
                        <Typography variant="subtitle1" fontWeight={800} color="#9a3412">{signedMoney(difference)}</Typography>
                    </Box>
                </Grid>
            </Grid>
            {stations.length > 0 && (
                <Box sx={{ mt: 1.75 }}>
                    <Typography variant="caption" color="#334155" fontWeight={800} sx={{ display: 'block', mb: 0.75 }}>
                        Nhà đài có giá nhập hoặc hoa hồng khác hệ thống ({stations.length})
                    </Typography>
                    <Stack spacing={0.75} sx={{ maxHeight: 330, overflowY: 'auto' }}>
                        {stations.map((station) => (
                            <Box key={station.id} sx={{ p: 1.25, borderRadius: '9px', border: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
                                <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap" sx={{ mb: 1 }}>
                                    <Typography variant="body2" fontWeight={800} color="#0f172a">{station.name}</Typography>
                                    {station.priceChanged && <Chip size="small" label="Lệch giá nhập" sx={{ height: 20, bgcolor: '#ffedd5', color: '#9a3412', fontSize: '0.7rem', fontWeight: 700 }} />}
                                    {station.commissionChanged && <Chip size="small" label="Lệch hoa hồng" sx={{ height: 20, bgcolor: '#dbeafe', color: '#1d4ed8', fontSize: '0.7rem', fontWeight: 700 }} />}
                                </Stack>
                                <Grid container spacing={1}>
                                    {([
                                        { label: 'Hệ thống', gross: station.systemGross, commission: station.systemCommission, net: station.systemNet },
                                        { label: 'Thực tế', gross: station.actualGross, commission: station.actualCommission, net: station.actualNet },
                                    ] as const).map((side) => (
                                        <Grid key={side.label} size={{ xs: 12, sm: 6 }}>
                                            <Box sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '7px', p: 1 }}>
                                                <Typography variant="caption" fontWeight={800} color={side.label === 'Hệ thống' ? '#475569' : '#1d4ed8'}>{side.label}</Typography>
                                                <Typography variant="caption" display="block" color="#334155">
                                                    Giá nhập: <strong>{money(side.gross)} VNĐ/vé</strong> · HH: <strong>{percent(side.commission)}</strong>
                                                </Typography>
                                                <Typography variant="caption" display="block" color="#0f172a">
                                                    Sau HH: <strong>{money(side.net)} VNĐ/vé</strong>
                                                </Typography>
                                            </Box>
                                        </Grid>
                                    ))}
                                </Grid>
                            </Box>
                        ))}
                    </Stack>
                </Box>
            )}
        </Box>
    );
};
