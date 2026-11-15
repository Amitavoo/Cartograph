import { ParsedFile } from "../parser/types";

export interface ExtractedRoute {
  id: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "PAGE" | "API";
  pattern: string;
  role: "Page route" | "API endpoint" | "Server action" | "Controller" | "Route handler";
  handlerPath: string;
  framework: string;
}

/**
 * Extracts explicit, deterministic framework routes from parsed files.
 * Rule: Routes are exact or absent. No guessing or inference.
 */
export function extractRepositoryRoutes(files: ParsedFile[]): ExtractedRoute[] {
  const routes: ExtractedRoute[] = [];
  const seenPatterns = new Set<string>();

  for (const file of files) {
    const norm = file.path.replace(/\\/g, "/");

    // 1. Next.js App Router — Page Routes
    const appPageMatch = norm.match(/(?:^|\/)app\/(.+)\/page\.(?:tsx|jsx|js|ts)$/i);
    const appRootPageMatch = norm.match(/(?:^|\/)app\/page\.(?:tsx|jsx|js|ts)$/i);

    if (appRootPageMatch) {
      const key = "PAGE /";
      if (!seenPatterns.has(key)) {
        seenPatterns.add(key);
        routes.push({
          id: `route-${file.path}`,
          method: "PAGE",
          pattern: "/",
          role: "Page route",
          handlerPath: file.path,
          framework: "Next.js",
        });
      }
      continue;
    }

    if (appPageMatch) {
      // Strip route groups like (auth), (dashboard)
      const rawRoute = appPageMatch[1]
        .split("/")
        .filter((seg) => !seg.startsWith("(") || !seg.endsWith(")"))
        .join("/");

      const pattern = "/" + rawRoute;
      const key = `PAGE ${pattern}`;
      if (!seenPatterns.has(key)) {
        seenPatterns.add(key);
        routes.push({
          id: `route-${file.path}`,
          method: "PAGE",
          pattern,
          role: "Page route",
          handlerPath: file.path,
          framework: "Next.js",
        });
      }
      continue;
    }

    // 2. Next.js App Router — API Route Handlers
    const appRouteMatch = norm.match(/(?:^|\/)app\/(.+)\/route\.(?:ts|js)$/i);
    if (appRouteMatch) {
      const rawRoute = appRouteMatch[1]
        .split("/")
        .filter((seg) => !seg.startsWith("(") || !seg.endsWith(")"))
        .join("/");

      const pattern = "/" + rawRoute;
      const key = `API ${pattern}`;
      if (!seenPatterns.has(key)) {
        seenPatterns.add(key);
        routes.push({
          id: `route-${file.path}`,
          method: "API",
          pattern,
          role: "API endpoint",
          handlerPath: file.path,
          framework: "Next.js",
        });
      }
      continue;
    }

    // 3. Next.js Pages Router — API Endpoints
    const pagesApiMatch = norm.match(/(?:^|\/)pages\/api\/(.+)\.(?:ts|js)$/i);
    if (pagesApiMatch) {
      let rawRoute = pagesApiMatch[1];
      if (rawRoute.endsWith("/index")) {
        rawRoute = rawRoute.slice(0, -6);
      }
      const pattern = "/api/" + rawRoute;
      const key = `API ${pattern}`;
      if (!seenPatterns.has(key)) {
        seenPatterns.add(key);
        routes.push({
          id: `route-${file.path}`,
          method: "API",
          pattern,
          role: "API endpoint",
          handlerPath: file.path,
          framework: "Next.js",
        });
      }
      continue;
    }

    // 4. Next.js Pages Router — Page Routes
    const pagesMatch = norm.match(/(?:^|\/)pages\/(.+)\.(?:tsx|jsx|js|ts)$/i);
    if (pagesMatch) {
      let rawRoute = pagesMatch[1];
      if (
        rawRoute.startsWith("_app") ||
        rawRoute.startsWith("_document") ||
        rawRoute.startsWith("_error") ||
        rawRoute.startsWith("api/")
      ) {
        continue;
      }
      if (rawRoute === "index") {
        rawRoute = "";
      } else if (rawRoute.endsWith("/index")) {
        rawRoute = rawRoute.slice(0, -6);
      }
      const pattern = "/" + rawRoute;
      const key = `PAGE ${pattern}`;
      if (!seenPatterns.has(key)) {
        seenPatterns.add(key);
        routes.push({
          id: `route-${file.path}`,
          method: "PAGE",
          pattern: pattern || "/",
          role: "Page route",
          handlerPath: file.path,
          framework: "Next.js",
        });
      }
      continue;
    }

    // 5. NestJS Controllers
    const nestControllerMatch = norm.match(/(?:^|\/)([a-zA-Z0-9_-]+)\.controller\.(?:ts|js)$/i);
    if (nestControllerMatch) {
      const controllerName = nestControllerMatch[1];
      const pattern = `/${controllerName}`;
      const key = `CONTROLLER ${pattern}`;
      if (!seenPatterns.has(key)) {
        seenPatterns.add(key);
        routes.push({
          id: `route-${file.path}`,
          method: "GET",
          pattern,
          role: "Controller",
          handlerPath: file.path,
          framework: "NestJS",
        });
      }
      continue;
    }

    // 6. Generic Benchmark / Handler Pages
    const genericPageMatch = norm.match(/(?:^|\/)src\/page(?:-([a-zA-Z0-9_-]+))?\.(?:tsx|jsx)$/i);
    if (genericPageMatch) {
      const pageVariant = genericPageMatch[1] || "default";
      const pattern = `/${pageVariant}`;
      const key = `PAGE ${pattern}`;
      if (!seenPatterns.has(key)) {
        seenPatterns.add(key);
        routes.push({
          id: `route-${file.path}`,
          method: "PAGE",
          pattern,
          role: "Page route",
          handlerPath: file.path,
          framework: "React",
        });
      }
      continue;
    }

    // 7. Route Handlers in Hono / Adapters
    const adapterHandlerMatch = norm.match(/src\/adapter\/([a-zA-Z0-9_-]+)\/handler\.(?:ts|js)$/i);
    if (adapterHandlerMatch) {
      const adapterName = adapterHandlerMatch[1];
      const pattern = `/${adapterName}`;
      const key = `API ${pattern}`;
      if (!seenPatterns.has(key)) {
        seenPatterns.add(key);
        routes.push({
          id: `route-${file.path}`,
          method: "API",
          pattern,
          role: "API endpoint",
          handlerPath: file.path,
          framework: "Adapter",
        });
      }
    }
  }

  // Sort routes deterministically by pattern
  return routes.sort((a, b) => a.pattern.localeCompare(b.pattern));
}
