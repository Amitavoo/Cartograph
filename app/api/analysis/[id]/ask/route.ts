import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAgentToken } from "@/src/agent/auth";
import { runRepositoryAgent } from "@/src/agent/runner";
import { ConversationMessage } from "@/src/agent/types";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let orgId: string = "org_default";
    try {
      const authState = await auth();
      if (authState.orgId) {
        orgId = authState.orgId;
      }
    } catch {
      // In preview or unauthenticated development mode, fallback to default
      orgId = "org_default";
    }

    const body = await req.json().catch(() => ({}));
    const question = String(body.question || "").trim();
    const history: ConversationMessage[] = Array.isArray(body.history) ? body.history : [];
    const clientSessionId = String(body.clientSessionId || `session-${Date.now()}`);

    if (!question) {
      return NextResponse.json({ error: "Missing required 'question' in request body" }, { status: 400 });
    }

    // Generate short-lived signed credential scoped to this exact analysis and organization
    const agentToken = createAgentToken({
      analysisId: id,
      organizationId: orgId,
      sessionId: clientSessionId,
      expiresInSeconds: 300, // 5 minutes
    });

    // Derive absolute origin / base URL for HTTP tool invocations
    const host = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
    const baseUrl = `${protocol}://${host}`;

    // Create SSE streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          await runRepositoryAgent({
            question,
            history,
            context: {
              baseUrl,
              analysisId: id,
              agentToken,
            },
            onEvent: (event) => {
              sendEvent(event);
            },
          });
        } catch (err: any) {
          sendEvent({
            type: "error",
            error: err.message || "An unexpected error occurred during agent execution",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "x-agent-session-id": clientSessionId,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to initialize agent conversation" },
      { status: 500 }
    );
  }
}
