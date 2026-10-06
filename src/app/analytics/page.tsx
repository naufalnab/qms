import { requireRouteRoles } from '@/lib/route-access';
import AnalyticsClient from './analytics-client';

export default async function AnalyticsPage() {
  await requireRouteRoles(['admin', 'qmsr', 'qms_section_head']);
  return <AnalyticsClient />;
}
