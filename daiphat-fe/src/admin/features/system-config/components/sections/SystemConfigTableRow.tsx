import React from 'react';
import {
  TableCell,
  TableRow,
  Typography,
  Tooltip,
  Chip,
  IconButton,
} from '@mui/material';
import { Edit2 } from 'lucide-react';
import {
  CONFIG_DATA_TYPE_LABELS,
  CONFIG_TYPE_LABELS,
  ConfigDataType,
  ConfigType,
  SystemConfigResponse,
} from '../../types/system-config';

interface SystemConfigTableRowProps {
  config: SystemConfigResponse;
  canEdit: boolean;
  onEdit: (config: SystemConfigResponse) => void;
}

const truncateValue = (value: string, maxLen = 48) => {
  if (value.length <= maxLen) return value;
  return `${value.slice(0, maxLen)}…`;
};

const getTypeChipColor = (
  type: ConfigType
): 'default' | 'primary' | 'secondary' | 'warning' | 'error' | 'info' => {
  switch (type) {
    case ConfigType.ORDER_SETTING:
      return 'primary';
    case ConfigType.PAYMENT_SETTING:
      return 'info';
    case ConfigType.TICKET_IMPORT:
      return 'warning';
    case ConfigType.REFUND_SETTING:
      return 'secondary';
    case ConfigType.COMPLAINT_SETTING:
      return 'error';
    default:
      return 'default';
  }
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
      <TableCell sx={{ maxWidth: 200 }}>
        <Tooltip title={config.configValue} placement="top-start">
          <Typography
            variant="body2"
            sx={{
              fontFamily:
                config.dataType === ConfigDataType.TIME ? 'monospace' : 'inherit',
            }}
          >
            {truncateValue(config.configValue)}
          </Typography>
        </Tooltip>
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
