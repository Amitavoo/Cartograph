import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { startPipeline } from "@/src/pipeline";

export async function POST(req: NextRequest) {
  try {
    const authState = await auth();
    let orgId = authState.orgId;

    // If orgId is not directly in auth state, get/create user's active workspace
    if (!orgId) {
      if (!authState.userId) {
        return NextResponse.json(
          { error: "Unauthorized. Please sign in to analyze a repository." },
          { status: 401 }
        );
      }

      const client = await clerkClient();
      const memberships = await client.users.getOrganizationMembershipList({
        userId: authState.userId,
      });

      if (memberships.data.length > 0) {
        orgId = memberships.data[0].organization.id;
      } else {
        const user = await currentUser();
        const displayName =
          user?.firstName ||
          user?.username ||
          user?.emailAddresses[0]?.emailAddress?.split("@")[0] ||
          "Team";

        const newOrg = await client.organizations.createOrganization({
          name: `${displayName}'s Workspace`,
          createdBy: authState.userId,
        });
        orgId = newOrg.id;
      }
    }

    const body = await req.json();
    const { repositoryUrl, forceRerun } = body as {
      repositoryUrl?: string;
      forceRerun?: boolean;
    };

    if (!repositoryUrl || typeof repositoryUrl !== "string") {
      return NextResponse.json(
        { error: "A valid repository URL is required." },
        { status: 400 }
      );
    }

    const result = await startPipeline({
      repositoryUrl: repositoryUrl.trim(),
      organizationId: orgId,
      forceRerun: Boolean(forceRerun),
    });

    return NextResponse.json({
      success: true,
      analysisId: result.analysis.id,
      projectId: result.project.id,
      isExisting: result.isExisting,
      status: result.analysis.status,
      stage: result.analysis.stage,
      redirectUrl: result.isExisting && result.analysis.status === "completed"
        ? `/analysis/${result.analysis.id}`
        : `/analysis/${result.analysis.id}`,
    });
  } catch (err: any) {
    console.error("POST /api/analyze error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to submit repository for analysis." },
      { status: 500 }
    );
  }
}
