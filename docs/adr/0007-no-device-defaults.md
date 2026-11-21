# ADR 0007 — Sensory seams are host-registered and report-only

- Status: Accepted
- Date: 2026-11-21
- Source: `TODO3.md` §11; `docs/not-decided.md`; `docs/world.md`

## Context

WebXR, sound, haptics and gamepads are device-dependent. Shipping a default assumes hardware most
users do not have and couples the engine to a platform.

## Decision

Sensory and motion seams are host-registered, gated by capability and report-only. No WebXR, sound,
haptic or gamepad default ships. Registration returns a disposer; the host owns the hardware.

## Consequences

The engine stays device-agnostic. A host adopts a device deliberately. No speculative seam becomes
a library API without a second consumer.
