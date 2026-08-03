import React from 'react';
import {
  Box,
  TableCell,
  TableRow,
  Typography,
  Tooltip,
  Chip,
  IconButton,
  Stack,
} from '@mui/material';
import { Edit2 } from 'lucide-react';
import {
  CONFIG_DATA_TYPE_LABELS,
  CONFIG_TYPE_LABELS,
  ConfigDataType,
  ConfigType,
  SystemConfigResponse,
} from '../../types/system-config';
import { formatSystemConfigDisplayValue } from '../../utils/systemConfigDisplay.util';

interface SystemConfigTableRowProps {
  config: SystemConfigResponse;
  canEdit: boolean;
  onEdit: (config: SystemConfigResponse) => void;
}

const getTypeChipColor = (
  type: ConfigType
): 'default' | 'primary' | 'secondary' | 'warning' | 'error' | 'info' | 'success' => {
  switch (type) {
    case ConfigType.ORDER_SETTING:
      return 'primary';
    case ConfigType.PAYMENT_SETTING:
      return 'info';
    case ConfigType.TICKET_IMPORT:
      return 'warning';
    case ConfigType.TICKET_RETURN:
      return 'warning';
    case ConfigType.REFUND_SETTING:
      return 'secondary';
    case ConfigType.COMPLAINT_SETTING:
      return 'error';
    case ConfigType.PAYOUT_SETTING:
      return 'success';
    default:
      return 'default';
  }
};

const ConfigValueCell = ({ config }: { config: SystemConfigResponse }) => {
  const display = formatSystemConfigDisplayValue(
    config.configKey,
    config.configValue,
    config.dataType
  );

  if (display.isStructured && display.detailLines?.length) {
    const preview = display.detailLines[0];
    const extraCount = display.detailLines.length - 1;
    return (
      <Tooltip
        title={
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            {display.detailLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </Box>
        }
        placement="top-start"
      >
        <Stack spacing={0.25} sx={{ maxWidth: 260, cursor: 'help' }}>
          <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.35 }}>
            {display.summary}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              lineHeight: 1.35,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {preview}
            {extraCount > 0 ? '…' : ''}
          </Typography>
        </Stack>
      </Tooltip>
    );
  }

  return (
    <Tooltip title={display.summary} placement="top-start">
      <Typography
        variant="body2"
        sx={{
          fontFamily: config.dataType === ConfigDataType.TIME ? 'monospace' : 'inherit',
          maxWidth: 260,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {display.summary}
      </Typography>
    </Tooltip>
  );
};

export const SystemConfigTableRow: React.FC<SystemConfigTableRowProps> = ({
  config,
  canEdit,
  onEdit,
}) => {
  return (
    <TableRow
      hover
      sx={{ '& td': { borderBottom: '1px dashed var(--palette-divider)' } }}
    >
      <TableCell sx={{ maxWidth: 240 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {config.configName || config.configKey}
        </Typography>
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ fontFamily: 'monospace' }}
        >
          {config.configKey}
        </Typography>
      </TableCell>
      <TableCell sx={{ maxWidth: 220 }}>
        <Typography variant="body2" color="text.secondary">
          {config.description}
        </Typography>
      </TableCell>
      <TableCell sx={{ maxWidth: 280, verticalAlign: 'middle' }}>
        <ConfigValueCell config={config} />
      </TableCell>
      <TableCell>
        <Typography variant="body2" color="text.secondary">
          {config.unit || '—'}
        </Typography>
      </TableCell>
      <TableCell align="center">
        <Chip
          size="small"
          label={CONFIG_TYPE_LABELS[config.configType] || config.configType}
          color={getTypeChipColor(config.configType)}
          variant="outlined"
        />
      </TableCell>
      <TableCell>
        <Chip
          size="small"
          label={CONFIG_DATA_TYPE_LABELS[config.dataType] || config.dataType}
          variant="outlined"
        />
      </TableCell>
      {canEdit && (
        <TableCell align="center">
          {config.isEditable === false ? (
            <Tooltip title="Cấu hình hệ thống — không chỉnh sửa được">
              <span>
                <IconButton size="small" disabled>
                  <Edit2 size={18} />
                </IconButton>
              </span>
            </Tooltip>
          ) : (
            <Tooltip title="Chỉnh sửa">
              <IconButton onClick={() => onEdit(config)} size="small" color="primary">
                <Edit2 size={18} />
              </IconButton>
            </Tooltip>
          )}
        </TableCell>
      )}
    </TableRow>
  );
};
