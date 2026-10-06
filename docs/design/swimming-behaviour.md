# Fish swimming behaviour

Each species ID produces a stable individual profile: period T (20–60 seconds), initial phase, depth, drift phase and vertical amplitude A (4–12px). The same fish retains its personality after a refresh. Aquarium membership still comes only from caught species.

Let w = 2πt/T and θ = w + phase + 0.12 sin(0.37w + driftPhase).

- x = leftMargin + availableWidth × (1 + sin θ) / 2
- y = depthPosition + A sin(1.7w + driftPhase) + 0.35A sin(0.61w)
- Horizontal direction follows cos θ × [1 + 0.0444 cos(0.37w + driftPhase)].

The sinusoid slows a fish before it turns; the direction change flips the portrait over 650ms. Different phase/period/depth values keep fish from swimming in lockstep. Vertical positions and travel width are bounded using the measured tank and sprite dimensions, including after a mobile resize.

Time advances only while the aquarium is running. Pause, background tabs and reduced-motion preference preserve the current position. Touch opens the fish tooltip on the first tap; a second tap opens the species page. Keyboard focus exposes the same tooltip.

Implementation: `lib/fish-swimming.ts` and `components/fishlog/swimming-fish.tsx`. Tests sample many turns on desktop, mobile and a tank with no horizontal room; they also verify continuity and agreement between movement and direction.
