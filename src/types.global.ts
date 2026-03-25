// SpaceGraphJS v7.0 - Global Type Definitions

/**
 * Disposable interface for cleanup
 */
interface Disposable {
  dispose(): void;
}

/**
 * Make all properties writable (opposite of Readonly)
 */
type Writable<T> = {
  -readonly [P in keyof T]: T[P];
};
