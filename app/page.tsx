import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PublicLandingPage } from "./_components/landing-page";

interface PageProps {
  searchParams?: Promise<{ view?: string }>;
}

async function LandingContent({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const { userId } = await auth();

  // If already authenticated and not explicitly viewing the public landing page,
  // route to user workspace dashboard.
  if (userId && params?.view !== "landing") {
    redirect("/dashboard");
  }

  return <PublicLandingPage isAuthenticated={Boolean(userId)} />;
}

export default function Home(props: PageProps) {
  return (
    <Suspense>
      <LandingContent {...props} />
    </Suspense>
  );
}
