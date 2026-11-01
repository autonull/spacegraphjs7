// Utility types - core type helpers used throughout the codebase

export type MaybePromise<T> = T | Promise<T>;
export type Constructor<T, Args extends unknown[] = unknown[]> = new (...args: Args) => T;
export type Predicate<T> = (value: T) => boolean;
export type Disposer = () => void;
export type Optional<T> = Partial<T>;
export type Awaited<T> = T extends Promise<infer U> ? U : T;
export type ValueOf<T> = T[keyof T];
export type KeysOf<T> = keyof T;

// Common callback types
export type NodeCallback<T = any> = (node: T) => void;
export type EdgeCallback<T = any> = (edge: T) => void;
export type IdCallback = (id: string) => void;
export type AsyncCallback<T = void> = () => Promise<T> | T;

// ============= Geometry Types =============
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

// ============= Ergonomic Type Helpers =============
export type DeepPartial<T> = { [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P] };
export type DeepRequired<T> = { [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P] };

// ============= Shortcut Type Aliases =============
export type Size = { width: number; height: number };
export type Bounds = { min: Point3D; max: Point3D };

// ============= Event Handler Type =============
export type EventHandler<T = unknown> = (event: T) => void;
export type EventUnsubscribe = () => void;

// ============= Alias Types =============
export type NodeType = string;
export type EdgeType = string;
export type GeometryFamily = string;