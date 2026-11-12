"use client";

import { useOrganizationList, useAuth } from "@clerk/nextjs";
import { useEffect } from "react";

/**
 * Ensures that if a user has an organization membership but no active
 * organization selected (e.g. freshly signed in when membership is optional),
 * their first organization is automatically activated without requiring a manual click.
 */
export function OrgAutoActivator() {
  const { orgId } = useAuth();
  const { isLoaded, setActive, userMemberships } = useOrganizationList({
    userMemberships: { infinite: true },
  });

  useEffect(() => {
    if (!isLoaded || !setActive || orgId) return;

    if (userMemberships.data && userMemberships.data.length > 0) {
      const firstOrgId = userMemberships.data[0].organization.id;
      setActive({ organization: firstOrgId });
    }
  }, [isLoaded, setActive, orgId, userMemberships.data]);

  return null;
}

