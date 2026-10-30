import {
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedMesh,
  Material,
  Matrix4,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  RingGeometry,
  Scene,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import type { SpaceGraph } from '../SpaceGraph';

export const GEOMETRY_FAMILIES = {
  SPHERE: 'sphere',
  BOX: 'box',
  CYLINDER: 'cylinder',
  PLANE: 'plane',
  CONE: 'cone',
  TORUS: 'torus',
  RING: 'ring',
  CIRCLE: 'circle',
} as const;

export type GeometryFamily = (typeof GEOMETRY_FAMILIES)[keyof typeof GEOMETRY_FAMILIES];

const DEFAULT_CAPACITY = 1024;

interface InstanceSlot {
  nodeId: string;
  inUse: boolean;
}

interface GeometryFamilyState {
  mesh: InstancedMesh;
  slots: InstanceSlot[];
  freeSlots: number[];
  activeCount: number;
  needsMatrixUpdate: boolean;
  needsColorUpdate: boolean;
}

const tempMatrix = new Matrix4();
const tempColor = new Color();

const GEOMETRY_FACTORIES: Record<GeometryFamily, () => BufferGeometry> = {
  [GEOMETRY_FAMILIES.SPHERE]: () => new SphereGeometry(20, 16, 16),
  [GEOMETRY_FAMILIES.BOX]: () => new BoxGeometry(40, 40, 40),
  [GEOMETRY_FAMILIES.CYLINDER]: () => new CylinderGeometry(20, 20, 40, 16),
  [GEOMETRY_FAMILIES.PLANE]: () => new PlaneGeometry(40, 40),
  [GEOMETRY_FAMILIES.CONE]: () => new ConeGeometry(20, 40, 16),
  [GEOMETRY_FAMILIES.TORUS]: () => new TorusGeometry(15, 5, 8, 16),
  [GEOMETRY_FAMILIES.RING]: () => new RingGeometry(10, 20, 16),
  [GEOMETRY_FAMILIES.CIRCLE]: () => new CircleGeometry(20, 32),
};

export class InstancedNodeRenderer {
  private scene: Scene;
  private familyStates: Map<GeometryFamily, GeometryFamilyState> = new Map();
  private nodeToSlot: Map<string, { family: GeometryFamily; slot: number }> = new Map();

  constructor(_sg: SpaceGraph, scene: Scene) {
    this.scene = scene;
    this.initializeGeometries();
  }

  public update() {
    for (const [, state] of this.familyStates) {
      if (state.needsMatrixUpdate) {
        state.mesh.instanceMatrix.needsUpdate = true;
        state.needsMatrixUpdate = false;
      }

      if (state.needsColorUpdate && state.mesh.instanceColor) {
        state.mesh.instanceColor.needsUpdate = true;
        state.needsColorUpdate = false;
      }
    }
  }

  public getMesh(family: GeometryFamily): InstancedMesh | undefined {
    return this.familyStates.get(family)?.mesh;
  }

  public getNextAvailableSlot(family: GeometryFamily): number {
    const state = this.familyStates.get(family);
    if (!state) return -1;

    if (state.freeSlots.length === 0) {
      this.expandFamily(family);
      const expandedState = this.familyStates.get(family);
      if (expandedState && expandedState.freeSlots.length > 0) {
        return expandedState.freeSlots.pop()!;
      }
      return -1;
    }

    const slot = state.freeSlots.pop()!;
    state.activeCount++;
    state.mesh.count = state.activeCount;
    return slot;
  }

  public registerNode(nodeId: string, family: GeometryFamily, slot: number) {
    const state = this.familyStates.get(family);
    if (!state || slot < 0 || slot >= state.slots.length) return;

    state.slots[slot].nodeId = nodeId;
    state.slots[slot].inUse = true;
    this.nodeToSlot.set(nodeId, { family, slot });
  }

  public updateInstanceAt(
    family: GeometryFamily,
    slot: number,
    position: Vector3,
    quaternion: Quaternion,
    scale: Vector3,
    color: number
  ) {
    const state = this.familyStates.get(family);
    if (!state || slot < 0 || slot >= state.slots.length) return;

    tempMatrix.compose(position, quaternion, scale);
    state.mesh.setMatrixAt(slot, tempMatrix);

    tempColor.setHex(color);
    state.mesh.setColorAt(slot, tempColor);

    state.needsMatrixUpdate = true;
    state.needsColorUpdate = true;
  }

  public releaseSlot(family: GeometryFamily, slot: number) {
    const state = this.familyStates.get(family);
    if (!state || slot < 0 || slot >= state.slots.length) return;

    const nodeId = state.slots[slot].nodeId;
    state.slots[slot].nodeId = '';
    state.slots[slot].inUse = false;
    state.freeSlots.push(slot);
    state.activeCount--;
    state.mesh.count = state.activeCount;
    state.needsMatrixUpdate = true;

    this.nodeToSlot.delete(nodeId);
  }

  public dispose() {
    for (const state of this.familyStates.values()) {
      this.scene.remove(state.mesh);
      state.mesh.geometry.dispose();
      (state.mesh.material as Material).dispose();
      state.mesh.dispose();
    }
    this.familyStates.clear();
    this.nodeToSlot.clear();
  }

  public isNodeInstanced(nodeId: string): boolean {
    return this.nodeToSlot.has(nodeId);
  }

  public getStats(): Map<GeometryFamily, { active: number; capacity: number }> {
    const stats = new Map<GeometryFamily, { active: number; capacity: number }>();
    for (const [family, state] of this.familyStates) {
      stats.set(family, { active: state.activeCount, capacity: state.slots.length });
    }
    return stats;
  }

  private initializeGeometries() {
    const families: GeometryFamily[] = [
      GEOMETRY_FAMILIES.SPHERE,
      GEOMETRY_FAMILIES.BOX,
      GEOMETRY_FAMILIES.CYLINDER,
      GEOMETRY_FAMILIES.PLANE,
      GEOMETRY_FAMILIES.CONE,
      GEOMETRY_FAMILIES.TORUS,
      GEOMETRY_FAMILIES.RING,
      GEOMETRY_FAMILIES.CIRCLE,
    ];

    for (const family of families) {
      const { geometry, material } = this.createGeometryAndMaterial(family);
      const mesh = new InstancedMesh(geometry, material, DEFAULT_CAPACITY);
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      mesh.count = 0;
      mesh.frustumCulled = false;

      if (!mesh.instanceColor) {
        mesh.instanceColor = new InstancedBufferAttribute(
          new Float32Array(DEFAULT_CAPACITY * 3),
          3
        );
      }
      mesh.instanceColor.setUsage(DynamicDrawUsage);

      const state: GeometryFamilyState = {
        mesh,
        slots: [],
        freeSlots: [],
        activeCount: 0,
        needsMatrixUpdate: false,
        needsColorUpdate: false,
      };

      for (let i = 0; i < DEFAULT_CAPACITY; i++) {
        state.slots.push({ nodeId: '', inUse: false });
        state.freeSlots.push(i);
      }

      this.familyStates.set(family, state);
      this.scene.add(mesh);
    }
  }

  private createGeometryAndMaterial(family: GeometryFamily): {
    geometry: BufferGeometry;
    material: Material;
  } {
    const geometry =
      GEOMETRY_FACTORIES[family]?.() ?? GEOMETRY_FACTORIES[GEOMETRY_FAMILIES.SPHERE]();

    const material = new MeshBasicMaterial({ color: 0xffffff });

    return { geometry, material };
  }

  private expandFamily(family: GeometryFamily) {
    const oldState = this.familyStates.get(family);
    if (!oldState) return;

    const newCapacity = oldState.slots.length * 2;
    const oldMesh = oldState.mesh;

    const { geometry, material } = this.createGeometryAndMaterial(family);
    const newMesh = new InstancedMesh(geometry, material, newCapacity);
    newMesh.instanceMatrix.setUsage(DynamicDrawUsage);
    newMesh.count = oldMesh.count;
    newMesh.frustumCulled = false;

    if (!newMesh.instanceColor) {
      newMesh.instanceColor = new InstancedBufferAttribute(
        new Float32Array(newCapacity * 3),
        3
      );
    }
    newMesh.instanceColor.setUsage(DynamicDrawUsage);

    const matrix = new Matrix4();
    const color = new Color();

    for (let i = 0; i < oldMesh.count; i++) {
      oldMesh.getMatrixAt(i, matrix);
      newMesh.setMatrixAt(i, matrix);

      if (oldMesh.instanceColor) {
        oldMesh.getColorAt(i, color);
        newMesh.setColorAt(i, color);
      }
    }

    newMesh.instanceMatrix.needsUpdate = true;
    if (newMesh.instanceColor) {
      newMesh.instanceColor.needsUpdate = true;
    }

    const newSlots: InstanceSlot[] = [];
    const newFreeSlots: number[] = [];

    for (let i = 0; i < newCapacity; i++) {
      if (i < oldState.slots.length) {
        newSlots.push({ ...oldState.slots[i] });
      } else {
        newSlots.push({ nodeId: '', inUse: false });
        newFreeSlots.push(i);
      }
    }

    const newState: GeometryFamilyState = {
      mesh: newMesh,
      slots: newSlots,
      freeSlots: [...oldState.freeSlots, ...newFreeSlots],
      activeCount: oldState.activeCount,
      needsMatrixUpdate: true,
      needsColorUpdate: true,
    };

    this.scene.remove(oldMesh);
    oldMesh.geometry.dispose();
    (oldMesh.material as Material).dispose();
    oldMesh.dispose();

    this.familyStates.set(family, newState);
    this.scene.add(newMesh);
  }
}
