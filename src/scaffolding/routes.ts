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
 * An optional getFileContent callback can be provided (e.g. during server analysis or testing)
 * to inspect source file contents for explicit HTTP method handlers (GET, POST, etc.)
 */
export function extractRepositoryRoutes(
  files: ParsedFile[],
  getFileContent?: (filePath: string) => string | null
): ExtractedRoute[] {
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
      const content = getFileContent ? getFileContent(file.path) : null;
      const matchedMethods: Array<"GET" | "POST" | "PUT" | "PATCH" | "DELETE"> = [];

      if (content) {
        const methodMatches = content.matchAll(
          /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b/g
        );
        for (const m of methodMatches) {
          if (!matchedMethods.includes(m[1] as any)) {
            matchedMethods.push(m[1] as any);
          }
        }
      }

      if (matchedMethods.length > 0) {
        for (const m of matchedMethods) {
          const key = `${m} ${pattern}`;
          if (!seenPatterns.has(key)) {
            seenPatterns.add(key);
            routes.push({
              id: `route-${m}-${file.path}`,
              method: m,
              pattern,
              role: "API endpoint",
              handlerPath: file.path,
              framework: "Next.js",
            });
          }
        }
      } else {
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
      continue;
    }

    // 8. Express Route Definitions (router.get, app.post, etc.)
    if (norm.endsWith(".ts") || norm.endsWith(".js")) {
      const content = getFileContent ? getFileContent(file.path) : null;
      if (content && (content.includes("express") || content.includes("router.") || content.includes("app."))) {
        const expressMatches = content.matchAll(
          /(?:app|router)\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/gi
        );
        for (const em of expressMatches) {
          const method = em[1].toUpperCase() as "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
          const rawPath = em[2];
          const pattern = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
          const key = `${method} ${pattern} ${file.path}`;
          if (!seenPatterns.has(key)) {
            seenPatterns.add(key);
            routes.push({
              id: `route-express-${method}-${file.path}-${pattern}`,
              method,
              pattern,
              role: "Route handler",
              handlerPath: file.path,
              framework: "Express",
            });
          }
        }
      }
    }

    // 9. FastAPI Route Definitions (@app.get, @router.post, etc.)
    if (norm.endsWith(".py")) {
      const content = getFileContent ? getFileContent(file.path) : null;
      if (content && (content.includes("FastAPI") || content.includes("@app.") || content.includes("@router."))) {
        const fastApiMatches = content.matchAll(
          /@(?:app|router)\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/gi
        );
        for (const fm of fastApiMatches) {
          const method = fm[1].toUpperCase() as "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
          const rawPath = fm[2];
          const pattern = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
          const key = `${method} ${pattern} ${file.path}`;
          if (!seenPatterns.has(key)) {
            seenPatterns.add(key);
            routes.push({
              id: `route-fastapi-${method}-${file.path}-${pattern}`,
              method,
              pattern,
              role: "Route handler",
              handlerPath: file.path,
              framework: "FastAPI",
            });
          }
        }
      }
    }
  }

  // Sort routes deterministically by pattern
  return routes.sort((a, b) => a.pattern.localeCompare(b.pattern));
}

