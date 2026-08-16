import fs from 'fs';
import path from 'path';

const targets = [
  'src/admin/features/refund',
  'src/admin/features/prize-payout',
  'src/admin/features/review',
  'src/admin/features/dashboard',
  'src/admin/features/settings',
  'src/admin/features/auth',
];

const replacements = [
  ["from '../../components/", "from '@/admin/components/"],
  ['from "../../components/', 'from "@/admin/components/'],
  ["from '../../../components/", "from '@/admin/components/"],
  ['from "../../../components/', 'from "@/admin/components/'],
  ["from '../../../../components/", "from '@/admin/components/"],
  ['from "../../../../components/', 'from "@/admin/components/'],
  ["from '../../constants/", "from '@/admin/constants/"],
  ['from "../../constants/', 'from "@/admin/constants/'],
  ["from '../../../constants/", "from '@/admin/constants/"],
  ['from "../../../constants/', 'from "@/admin/constants/'],
  ["from '../../../../constants/", "from '@/admin/constants/"],
  ['from "../../../../constants/', 'from "@/admin/constants/'],
  ["from '../../../utils/", "from '@/admin/utils/"],
  ['from "../../../utils/', 'from "@/admin/utils/'],
  ["from '../../../../utils/", "from '@/admin/utils/"],
  ['from "../../../../utils/', 'from "@/admin/utils/'],
  ["from '../../../../constants/queryKeys'", "from '@/constants/queryKeys'"],
  ['from "../../../../constants/queryKeys"', 'from "@/constants/queryKeys"'],
  ["from '../../../../types/", "from '@/types/"],
  ['from "../../../../types/', 'from "@/types/'],
  ["from '../../../types/", "from '@/types/"],
  ['from "../../../types/', 'from "@/types/'],
  ["from '../../assets/", "from '@/admin/assets/"],
  ['from "../../assets/', 'from "@/admin/assets/'],
  ["from '../../config/", "from '@/admin/config/"],
  ['from "../../config/', 'from "@/admin/config/'],
  ["from '../../../stores/", "from '@/stores/"],
  ['from "../../../stores/', 'from "@/stores/'],
  ["from '../../../../stores/", "from '@/stores/"],
  ['from "../../../../stores/', 'from "@/stores/'],
  ["from './sections/", "from '../sections/"],
  ['from "./sections/', 'from "../sections/'],
  ["from './hooks/", "from '@/admin/features/auth/hooks/"],
  ['from "./hooks/', 'from "@/admin/features/auth/hooks/'],
  [
    "from '../../features/orders/constants/incidentTicket.constants'",
    "from '@/admin/features/orders/constants/incidentTicket.constants'",
  ],
  [
    'from "../../features/orders/constants/incidentTicket.constants"',
    'from "@/admin/features/orders/constants/incidentTicket.constants"',
  ],
  ["from '../../features/refund/services/", "from '@/admin/features/refund/services/"],
  ['from "../../features/refund/services/', 'from "@/admin/features/refund/services/'],
  ["from '../../../features/dashboard/services/", "from '@/admin/features/dashboard/services/"],
  ['from "../../../features/dashboard/services/', 'from "@/admin/features/dashboard/services/'],
  ["from '../../pages/authen/services/auth.service'", "from '@/admin/features/auth/services/auth.service'"],
  ['from "../../pages/authen/services/auth.service"', 'from "@/admin/features/auth/services/auth.service"'],
  [
    "from '../../../../pages/authen/services/auth.service'",
    "from '@/admin/features/auth/services/auth.service'",
  ],
  [
    'from "../../../../pages/authen/services/auth.service"',
    'from "@/admin/features/auth/services/auth.service"',
  ],
  ["from '../../pages/authen/types/auth.type'", "from '@/admin/features/auth/types/auth.type'"],
  ['from "../../pages/authen/types/auth.type"', 'from "@/admin/features/auth/types/auth.type"'],
  ["from '../../../../pages/authen/types/auth.type'", "from '@/admin/features/auth/types/auth.type'"],
  ['from "../../../../pages/authen/types/auth.type"', 'from "@/admin/features/auth/types/auth.type"'],
  ["from '../pages/dashboard/components/", "from '@/admin/features/dashboard/components/"],
  ['from "../pages/dashboard/components/', 'from "@/admin/features/dashboard/components/'],
];

const globalFix = [
  ['../../pages/authen/services/auth.service', '@/admin/features/auth/services/auth.service'],
  ['../../../../pages/authen/services/auth.service', '@/admin/features/auth/services/auth.service'],
  ['../../pages/authen/types/auth.type', '@/admin/features/auth/types/auth.type'],
  ['../../../../pages/authen/types/auth.type', '@/admin/features/auth/types/auth.type'],
];

function walk(dir, cb) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, cb);
    else if (/\.(ts|tsx)$/.test(ent.name)) cb(p);
  }
}

function applyReplacements(file, reps) {
  let content = fs.readFileSync(file, 'utf8');
  const orig = content;
  for (const [from, to] of reps) {
    content = content.split(from).join(to);
  }
  if (content !== orig) {
    fs.writeFileSync(file, content, 'utf8');
    return true;
  }
  return false;
}

let count = 0;
for (const t of targets) {
  walk(t, (file) => {
    if (applyReplacements(file, replacements)) count += 1;
  });
}

for (const extra of ['src/admin/components', 'src/admin/features/users', 'src/admin/layouts']) {
  walk(extra, (file) => {
    if (applyReplacements(file, globalFix)) count += 1;
  });
}

console.log(`Fixed ${count} files`);
