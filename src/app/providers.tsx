"use client";

import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  // No ConvexProvider needed - using direct fetch instead of Convex hooks
  return <>{children}</>;
}
