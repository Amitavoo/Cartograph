import { RoleEvaluationSample } from "../types";

/**
 * Curated Evaluation Dataset for File Role Classification
 *
 * Ground truth roles are strictly convention-based and MUST BE HIDDEN
 * from the model during evaluation to guarantee fair, unbiased testing.
 */
export const ROLE_EVALUATION_DATASET: RoleEvaluationSample[] = [
  // NestJS & Clean Architecture Services
  {
    filePath: "src/users/users.service.ts",
    groundTruthRole: "service",
    lines: 145,
    incomingNeighbors: ["src/users/users.controller.ts", "src/auth/auth.service.ts"],
    outgoingNeighbors: ["src/users/users.repository.ts", "src/users/user.entity.ts"],
  },
  {
    filePath: "src/billing/stripe.service.ts",
    groundTruthRole: "service",
    lines: 210,
    incomingNeighbors: ["src/billing/billing.controller.ts"],
    outgoingNeighbors: ["src/billing/billing.types.ts", "src/config/stripe.ts"],
  },

  // Repositories & Data Access
  {
    filePath: "src/users/users.repository.ts",
    groundTruthRole: "repository",
    lines: 95,
    incomingNeighbors: ["src/users/users.service.ts"],
    outgoingNeighbors: ["src/database/schema.ts", "src/users/user.entity.ts"],
  },
  {
    filePath: "src/analytics/events.repository.ts",
    groundTruthRole: "repository",
    lines: 130,
    incomingNeighbors: ["src/analytics/analytics.service.ts"],
    outgoingNeighbors: ["src/database/client.ts"],
  },

  // Models & Entities
  {
    filePath: "src/users/user.model.ts",
    groundTruthRole: "model",
    lines: 65,
    incomingNeighbors: ["src/users/users.service.ts", "src/users/users.repository.ts"],
    outgoingNeighbors: ["src/common/base.model.ts"],
  },
  {
    filePath: "src/orders/order.entity.ts",
    groundTruthRole: "model",
    lines: 80,
    incomingNeighbors: ["src/orders/orders.repository.ts"],
    outgoingNeighbors: [],
  },

  // Utilities & Helpers
  {
    filePath: "src/utils/date-formatter.ts",
    groundTruthRole: "util",
    lines: 40,
    incomingNeighbors: ["src/users/user-card.tsx", "src/billing/invoice.ts"],
    outgoingNeighbors: [],
  },
  {
    filePath: "src/common/crypto-helper.ts",
    groundTruthRole: "util",
    lines: 55,
    incomingNeighbors: ["src/auth/auth.service.ts"],
    outgoingNeighbors: ["crypto"],
  },

  // Configuration Files
  {
    filePath: "src/config/database.config.ts",
    groundTruthRole: "config",
    lines: 35,
    incomingNeighbors: ["src/database/client.ts"],
    outgoingNeighbors: [],
  },
  {
    filePath: "src/config/auth-options.ts",
    groundTruthRole: "config",
    lines: 70,
    incomingNeighbors: ["src/auth/auth.service.ts"],
    outgoingNeighbors: [],
  },

  // React Components
  {
    filePath: "src/components/navigation-bar.tsx",
    groundTruthRole: "component",
    lines: 110,
    incomingNeighbors: ["src/app/layout.tsx"],
    outgoingNeighbors: ["src/components/user-menu.tsx", "src/utils/date-formatter.ts"],
  },
  {
    filePath: "src/components/badge.tsx",
    groundTruthRole: "component",
    lines: 45,
    incomingNeighbors: ["src/components/user-card.tsx", "src/components/status-indicator.tsx"],
    outgoingNeighbors: [],
  },

  // Custom Hooks
  {
    filePath: "src/hooks/use-debounce.ts",
    groundTruthRole: "hook",
    lines: 30,
    incomingNeighbors: ["src/components/search-input.tsx"],
    outgoingNeighbors: [],
  },
  {
    filePath: "src/hooks/use-local-storage.ts",
    groundTruthRole: "hook",
    lines: 50,
    incomingNeighbors: ["src/components/theme-toggle.tsx"],
    outgoingNeighbors: [],
  },
];
