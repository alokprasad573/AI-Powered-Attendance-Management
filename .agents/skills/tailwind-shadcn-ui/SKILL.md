---
name: tailwind-shadcn-ui
description: Builds accessible, consistent, responsive interfaces using Tailwind CSS, shadcn/ui, and project design tokens for Haziri.AI.
---

# Tailwind CSS and shadcn/ui

## When to use

Use when building or updating pages, forms, dialogs, tables, navigation, dashboard cards, and responsive layouts.

## Procedure

1. Inspect the existing Tailwind configuration, CSS variables, shadcn/ui setup, and installed component versions.
2. Reuse existing components and design tokens before adding new primitives.
3. Use semantic HTML and accessible shadcn/ui primitives; preserve keyboard navigation and focus visibility.
4. Design mobile-first and verify narrow, medium, and wide viewports.
5. Provide visible labels, descriptions, validation feedback, loading states, disabled states, and accessible dialog titles.
6. Use consistent spacing, typography, color, radius, and elevation tokens.
7. Keep interactive state in the smallest component that needs it.
8. Use Framer Motion sparingly and respect reduced-motion preferences.
9. Avoid arbitrary one-off values when a token or shared variant exists.
10. Check contrast and do not communicate status using color alone.

## Haziri.AI UI expectations

- Teacher and Student experiences must be visually distinct where their tasks differ but share a coherent design system.
- Attendance review must make detected identity, confidence/uncertainty, source photo, Present/Absent status, and manual correction clear.
- Destructive actions such as discard or removal require clear labeling and appropriate confirmation.
- Tables and history views need empty, loading, error, and pagination states.

## Verification

Test keyboard-only operation, screen-reader labels where relevant, responsive overflow, reduced motion, focus management, and contrast. Do not add a component library without checking the current shadcn/ui setup.
