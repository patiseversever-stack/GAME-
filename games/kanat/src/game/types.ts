// Shared integrator contracts: the active mode plugged into the platform loop.
import type { FlightSession } from './FlightSession.ts';

export interface ActiveMode {
  readonly kind: string;
  /** Fixed sim step (60 Hz flight, 30 Hz SÜRÜ). Only called while the FSM is in 'game' and not paused. */
  step(): void;
  /** Per rendered frame: update cameras / scene objects (the game renders afterwards). */
  render(alpha: number, dt: number): void;
  dispose(): void;
  testState(): Record<string, unknown>;
  /** The flight session when this is a flight mode. */
  readonly session?: FlightSession | null;
  /** Mode-specific Android back handling; return true when consumed. */
  back?(): boolean;
  /** Renders its own scene (SÜRÜ.io) — the game skips the world render. */
  readonly ownsRender?: boolean;
  /** Test API passthroughs. */
  hash?(): number;
  stepN?(n: number): void;
  input?(cmd: unknown): void;
  bot?(policy: string | null): void;
}
