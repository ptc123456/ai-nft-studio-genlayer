# DESIGN.md: AI NFT Studio Ritual reference

## Source

- URL: https://ai-nft-studio-ritual.vercel.app/app
- Capture date: 2026-07-15
- Evidence: Firecrawl branding, page markdown, source HTML/CSS, and a full-page screenshot

## Reference Screenshot

![Full-page screenshot of the source dashboard](./.firecrawl/ritual-app-reference.png)

Use the screenshot as the visual source of truth for layout, hierarchy, density, and feel. The product language and blockchain behavior are intentionally changed from Ritual to GenLayer.

## Design Summary

A restrained cyberpunk dashboard on an almost-black navy canvas. Content sits in translucent blue-black cards with thin cool borders, soft shadows, compact controls, and a green-to-blue accent gradient. The interface is technical without looking like a terminal: rounded geometry, generous whitespace, and clear status components keep the consensus workflow approachable.

## Design Tokens

### Colors

- Canvas: `#070A13`
- Elevated surface: `rgba(15, 23, 42, 0.75)`
- Card surface: `rgba(20, 30, 54, 0.60)`
- Text: `#E2E8F0`
- Muted text: `#94A3B8`
- Border: `rgba(148, 163, 184, 0.12)`
- Emerald accent: `#10B981`
- Blue accent: `#3B82F6`
- Warning: `#EAB308`
- Danger: `#F43F5E`

### Typography

- Primary: Outfit, Segoe UI, system sans-serif
- Technical values: system monospace
- Body: approximately 15px, relaxed line height
- Card headings: 20-22px, weight 700
- Labels and badges: 12-13px, weight 600-700

### Spacing And Layout

- Maximum container: 1140px
- Base spacing unit: 4px
- Main card radius: 16px; controls: 10-12px
- Desktop dashboard: two columns, `minmax(0, 0.9fr) minmax(0, 1.1fr)`
- Mobile: one column below 900px
- Main shadow: `0 20px 50px rgba(0,0,0,.5)`

## Components

- Navigation: logo left, network/status badges and wallet action right
- Glass card: translucent navy, subtle border, blur, mild hover lift
- Primary button: dark teal/blue gradient with emerald border
- Inputs: inset dark background, cool border, blue focus ring
- Pipeline: three stacked status rows with numbered chips and explicit state labels
- Verdict card: score, decision badge, reasoning, and actionable revision feedback
- Gallery: responsive image cards; click opens a detail modal
- Toasts: compact top-right notifications with semantic left border

## Page Patterns

1. Wallet/network header
2. Connection gate when disconnected
3. Two-column workspace when connected
4. Left: balances, submission form, network/deployment note
5. Right: consensus pipeline, latest verdict, minted collection
6. Footer with GenLayer explorer, Studio, and GitHub links

## Content Style

Short technical labels, plain-language helper text, and explicit transaction states. Avoid generic Web3 hype. Explain what the validator jury is checking and why a submission was approved, rejected, or returned for revision.

## Agent Build Instructions

- Preserve the source layout, spacing rhythm, glass treatment, accent gradient, and card interactions.
- Replace all Ritual-specific names, addresses, credits, precompiles, scheduler language, and mock-success paths.
- The production submit flow must call the GenLayer Intelligent Contract through `genlayer-js`.
- Never show a mint as successful until the transaction is `FINALIZED` and `txExecutionResultName` is `FINISHED_WITH_RETURN`.
- Keep missing contract configuration visible and actionable; never substitute a fake deployment address.
- Ensure keyboard focus, reduced-motion behavior, useful alt text, and responsive stacking.

## Rerun Inputs

```yaml
workflow: firecrawl-website-design-clone
source_url: https://ai-nft-studio-ritual.vercel.app/app
target_stack: Vite + vanilla JavaScript + GenLayerJS + GenLayer Intelligent Contract
output: DESIGN.md
```

