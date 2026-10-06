import { requireRouteRoles } from '@/lib/route-access';
import MasterDataClient from './master-data-client';

export default async function MasterDataPage() {
  await requireRouteRoles(['admin']);
  return <MasterDataClient />;
}
