import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import { Suspense } from "react";

async function LandingContent() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-surface)] p-6">
      <header className="absolute right-6 top-6">
        <div className="flex items-center gap-4">
          <SignInButton mode="modal">
            <button className="rounded-md bg-[var(--color-surface-raised)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-surface-sunken)] transition-colors">
              Sign In
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-colors">
              Sign Up
            </button>
          </SignUpButton>
        </div>
      </header>

      <h1 className="text-5xl font-bold">Cartograph</h1>
      <p className="mt-4 text-[var(--color-text-muted)]">
        See the shape of your codebase.
      </p>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense>
      <LandingContent />
    </Suspense>
  );
}
