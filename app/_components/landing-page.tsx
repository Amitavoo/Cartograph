"use client";

import React from "react";
import { Navigation } from "./landing/navigation";
import { HeroSection } from "./landing/hero-section";
import { VisualizationSection } from "./landing/visualization-section";
import { AIAssistantSection } from "./landing/ai-assistant-section";
import { FrameworkSection } from "./landing/framework-section";
import { WorkflowSection } from "./landing/workflow-section";
import { FinalCTA } from "./landing/final-cta";
import { Footer } from "./landing/footer";
import { validateGitHubUrl, RepoValidationResult } from "./landing/types";

export { validateGitHubUrl };
export type { RepoValidationResult };

interface PublicLandingPageProps {
  isAuthenticated?: boolean;
}

export function PublicLandingPage({ isAuthenticated = false }: PublicLandingPageProps) {
  return (
    <div className="min-h-screen bg-[#090B10] text-[#F1F5F9] selection:bg-[#EF3340]/25 selection:text-white font-sans relative overflow-x-hidden">
      {/* Background ambient red glow at top */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[450px] bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(239,51,64,0.12),transparent_70%)]"
        aria-hidden="true"
      />

      {/* Navigation */}
      <Navigation isAuthenticated={isAuthenticated} />

      {/* Main Content Sections */}
      <main>
        {/* Section 01: Hero with Video Media Container */}
        <HeroSection isAuthenticated={isAuthenticated} />

        {/* Section 02: Architecture Visualization */}
        <VisualizationSection />

        {/* Section 03: AI Repository Assistant & 6 Tools */}
        <AIAssistantSection />

        {/* Section 04: Framework Ecosystem */}
        <FrameworkSection />

        {/* Section 05: Workflow Timeline */}
        <WorkflowSection />

        {/* Closing Call to Action with Crimson Waveforms */}
        <FinalCTA isAuthenticated={isAuthenticated} />
      </main>

      {/* Typographic Footer */}
      <Footer />
    </div>
  );
}
