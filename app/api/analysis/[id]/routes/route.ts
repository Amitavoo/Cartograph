import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { verifyAgentToken } from "@/src/agent/auth";
import { getRouteTableData, TenantIsolationError } from "@/src/agent/provider";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = req.headers.get("x-agent-token") || req.headers.get("authorization");

    let orgId: string | null = null;

    if (token) {
      const verification = verifyAgentToken(token, { expectedAnalysisId: id });
      if (!verification.valid || !verification.payload) {
        return NextResponse.json(
          {
            error: verification.error || "Invalid or expired agent credentials",
            code: verification.code || "UNAUTHORIZED",
          },
          { status: verification.code === "EXPIRED" ? 401 : 403 }
        );
      }
      orgId = verification.payload.organizationId;
    } else {
      try {
        const authState = await auth();
        orgId = authState.orgId || "org_default";
      } catch {
        orgId = "org_default";
      }
    }

    const data = await getRouteTableData(id, orgId);
    return NextResponse.json({ success: true, ...data });
  } catch (err: any) {
    if (err instanceof TenantIsolationError) {
      return NextResponse.json({ error: err.message, code: "TENANT_MISMATCH" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || "Failed to retrieve route table" }, { status: 500 });
  }
}
