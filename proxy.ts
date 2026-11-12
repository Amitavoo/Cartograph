import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Routes under /dashboard require a signed-in session.
 *
 * `auth.protect()` returns a 307 redirect to the sign-in page for
 * unauthenticated visitors — the protected page's HTML is never sent.
 */
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
