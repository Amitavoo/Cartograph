import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { verifyAgentToken } from "@/src/agent/auth";
import { traverseDependenciesData, TenantIsolationError } from "@/src/agent/provider";
import { TraversalDirection } from "@/src/agent/types";

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

    const { searchParams } = new URL(req.url);
    const file = searchParams.get("file") || searchParams.get("filePath") || "";
    const dirParam = searchParams.get("direction") || searchParams.get("dir") || "downstream";
    const depthParam = searchParams.get("depth");

    if (!file) {
      return NextResponse.json({ error: "Missing required 'file' parameter" }, { status: 400 });
    }

    const direction: TraversalDirection =
      dirParam === "upstream" || dirParam === "blast" ? "upstream" : "downstream";
    const depth = depthParam ? parseInt(depthParam, 10) : 3;

    const data = await traverseDependenciesData(id, orgId, file, direction, depth);
    return NextResponse.json({ success: true, ...data });
  } catch (err: any) {
    if (err instanceof TenantIsolationError) {
      return NextResponse.json({ error: err.message, code: "TENANT_MISMATCH" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || "Failed to perform traversal" }, { status: 500 });
  }
}
