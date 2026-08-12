/**
 * Local/dev shows Phase badges + incomplete locked cards for testing.
 * Production: set NEXT_PUBLIC_STREET_AGENT_SHOW_PHASES=false (default when NODE_ENV=production)
 * to hide badges and unreleased Phase 3/4 sections without redesigning the form.
 */
const envOverride = process.env.NEXT_PUBLIC_STREET_AGENT_SHOW_PHASES;

export const STREET_AGENT_PHASE_UI = {
    enabled:
        envOverride === "true" ||
        (envOverride !== "false" && process.env.NODE_ENV !== "production"),
    /** Phase 2 allocation eligibility — released */
    phase2Released: true,
    /** Phase 3 settlement — released */
    phase3Released: true,
    /** Phase 4 confidence engine — released */
    phase4Released: true,
} as const;
