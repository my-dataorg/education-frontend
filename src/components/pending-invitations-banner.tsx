import { auth } from "@/auth";
import { fetchPendingInvitations } from "@/lib/fetch-invitations";

import {
  PendingInvitationsBannerClient,
  type PendingInvitation,
} from "@/components/pending-invitations-banner-client";

export async function PendingInvitationsBanner() {
  const session = await auth();
  if (!session?.accessToken) return null;

  const invites: PendingInvitation[] = await fetchPendingInvitations(session);
  if (invites.length === 0) return null;

  return <PendingInvitationsBannerClient invites={invites} />;
}
