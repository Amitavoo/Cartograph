import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await auth.protect();

    const supabase = await createServerSupabaseClient();
    const { data: analysis, error } = await supabase
      .from("analyses")
      .select(`
        id,
        status,
        stage,
        stage_message,
        failed_at_stage,
        file_count,
        edge_count,
        coverage_percentage,
        error_message,
        completed_at,
        updated_at
      `)
      .eq("id", id)
      .single();

    if (error || !analysis) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch analysis status" },
      { status: 500 }
    );
  }
}
