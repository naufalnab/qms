import { requireRouteRoles } from '@/lib/route-access';
import NewSubmissionClient from './new-submission-client';

export default async function NewSubmissionPage() {
  await requireRouteRoles(['admin', 'qms']);
  return <NewSubmissionClient />;
}
