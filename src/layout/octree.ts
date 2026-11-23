/**
 * Octree spatial index for 3D force-directed layout (Barnes-Hut algorithm).
 * 
 * Reduces repulsion force calculation from O(n²) to O(n log n) by grouping
 * distant nodes into cells and treating them as single bodies with aggregated
 * mass and center of mass.
 */

export interface OctreeNode {
    /** Bounds of this cell */
    minX: number;
    minY: number;
    minZ: number;
    maxX: number;
    maxY: number;
    maxZ: number;
    /** Center of this cell */
    centerX: number;
    centerY: number;
    centerZ: number;
    /** Half-size of this cell */
    halfSize: number;
    /** Total mass (sum of node radii/masses) in this cell */
    mass: number;
    /** Center of mass of all nodes in this cell */
    comX: number;
    comY: number;
    comZ: number;
    /** Child cells (8 for octree) */
    children: OctreeNode[] | null;
    /** Leaf node: the actual node stored here (if leaf) */
    leaf?: { x: number; y: number; z: number; mass: number; id: string } | null;
}

/** Configuration for Barnes-Hut approximation */
export interface BarnesHutConfig {
    /** Theta threshold: if cell size / distance < theta, treat as single body.
     *  Lower = more accurate, higher = faster. Typical: 0.5-1.0. */
    theta: number;
    /** Maximum depth of the tree */
    maxDepth: number;
    /** Minimum cell size before stopping subdivision */
    minCellSize: number;
}

const DEFAULT_BH_CONFIG: BarnesHutConfig = {
    theta: 0.5,
    maxDepth: 20,
    minCellSize: 1,
};

/**
 * Build an octree from a set of nodes for Barnes-Hut force approximation.
 */
export function buildOctree<P extends { id: string; position: { x: number; y: number; z: number } }>(
    nodes: P[],
    getMass: (node: P) => number,
    config: Partial<BarnesHutConfig> = {},
): OctreeNode {
    const { maxDepth, minCellSize } = { ...DEFAULT_BH_CONFIG, ...config };

    // Find bounds
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const node of nodes) {
        const { x, y, z } = node.position;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (z < minZ) minZ = z;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        if (z > maxZ) maxZ = z;
    }

    // Add padding
    const padding = Math.max(maxX - minX, maxY - minY, maxZ - minZ) * 0.1 + 10;
    minX -= padding; minY -= padding; minZ -= padding;
    maxX += padding; maxY += padding; maxZ += padding;

    // Ensure cubic bounds
    const size = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;
    minX = centerX - size / 2;
    minY = centerY - size / 2;
    minZ = centerZ - size / 2;
    maxX = centerX + size / 2;
    maxY = centerY + size / 2;
    maxZ = centerZ + size / 2;

    const root: OctreeNode = {
        minX, minY, minZ,
        maxX, maxY, maxZ,
        centerX, centerY, centerZ,
        halfSize: size / 2,
        mass: 0,
        comX: 0, comY: 0, comZ: 0,
        children: null,
        leaf: null,
    };

    // Insert all nodes
    for (const node of nodes) {
        insertIntoOctree(root, node, getMass(node), node.id, 0, maxDepth, minCellSize);
    }

    return root;
}

function insertIntoOctree<P extends { position: { x: number; y: number; z: number } }>(
    cell: OctreeNode,
    node: P,
    mass: number,
    id: string,
    depth: number,
    maxDepth: number,
    minCellSize: number,
): void {
    const { x, y, z } = node.position;

    // Update center of mass
    const newMass = cell.mass + mass;
    cell.comX = (cell.comX * cell.mass + x * mass) / newMass;
    cell.comY = (cell.comY * cell.mass + y * mass) / newMass;
    cell.comZ = (cell.comZ * cell.mass + z * mass) / newMass;
    cell.mass = newMass;

    // If leaf and empty, store here
    if (!cell.children && cell.leaf === null) {
        cell.leaf = { x, y, z, mass, id };
        return;
    }

    // If leaf with existing node, subdivide
    if (!cell.children && cell.leaf) {
        if (depth >= maxDepth || cell.halfSize <= minCellSize) {
            // Can't subdivide further - combine masses
            cell.leaf = null;
            // We'll treat as combined mass at center of mass
            return;
        }
        subdivide(cell);
        // Re-insert existing leaf
        const existing = cell.leaf!;
        insertIntoOctree(cell, { position: { x: existing.x, y: existing.y, z: existing.z } } as P, existing.mass, existing.id, depth + 1, maxDepth, minCellSize);
        cell.leaf = null;
    }

    // Insert into appropriate child
    if (cell.children) {
        const childIndex = getChildIndex(cell, x, y, z);
        insertIntoOctree(cell.children[childIndex], node, mass, id, depth + 1, maxDepth, minCellSize);
    }
}

function subdivide(cell: OctreeNode): void {
    const h = cell.halfSize / 2;
    const cx = cell.centerX;
    const cy = cell.centerY;
    const cz = cell.centerZ;

    cell.children = [];
    for (let i = 0; i < 8; i++) {
        const dx = (i & 1) ? h : -h;
        const dy = (i & 2) ? h : -h;
        const dz = (i & 4) ? h : -h;
        const child: OctreeNode = {
            minX: cx + dx - h,
            maxX: cx + dx + h,
            minY: cy + dy - h,
            maxY: cy + dy + h,
            minZ: cz + dz - h,
            maxZ: cz + dz + h,
            centerX: cx + dx,
            centerY: cy + dy,
            centerZ: cz + dz,
            halfSize: h,
            mass: 0,
            comX: 0, comY: 0, comZ: 0,
            children: null,
            leaf: null,
        };
        cell.children.push(child);
    }
}

function getChildIndex(cell: OctreeNode, x: number, y: number, z: number): number {
    let index = 0;
    if (x > cell.centerX) index |= 1;
    if (y > cell.centerY) index |= 2;
    if (z > cell.centerZ) index |= 4;
    return index;
}

const addRepulsion = (
    force: { x: number; y: number; z: number },
    dx: number,
    dy: number,
    dz: number,
    distSq: number,
    dist: number,
    strength: number,
    minDistance: number,
    maxForce: number,
): void => {
    const capped = Math.min(strength / Math.max(distSq, minDistance * minDistance), maxForce);
    force.x += (dx / dist) * capped;
    force.y += (dy / dist) * capped;
    force.z += (dz / dist) * capped;
};

/**
 * Compute repulsion force on a node using Barnes-Hut approximation.
 *
 * @param node The node to compute force for
 * @param octree The root of the octree
 * @param theta Opening angle threshold (cell size / distance)
 * @param repulsion Repulsion strength constant
 * @param minDistance Minimum distance for force calculation
 * @param maxForce Maximum force cap
 * @returns Force vector { x, y, z }
 */
export function computeBarnesHutForce(
    node: { position: { x: number; y: number; z: number }; id: string },
    octree: OctreeNode,
    theta: number,
    repulsion: number,
    minDistance: number,
    maxForce: number,
): { x: number; y: number; z: number } {
    const force = { x: 0, y: 0, z: 0 };

    const stack: OctreeNode[] = [octree];

    while (stack.length > 0) {
        const cell = stack.pop()!;

        // Skip empty cells
        if (cell.mass === 0) continue;

        // If leaf node, compute direct force
        if (cell.leaf) {
            const leaf = cell.leaf;
            if (leaf.id === node.id) continue; // Skip self

            const dx = node.position.x - leaf.x;
            const dy = node.position.y - leaf.y;
            const dz = node.position.z - leaf.z;
            const distSq = dx * dx + dy * dy + dz * dz;
            addRepulsion(
                force, dx, dy, dz, distSq,
                Math.sqrt(distSq) || 0.001, repulsion, minDistance, maxForce,
            );
            continue;
        }

        // Check if we can approximate this cell as a single body
        const dx = node.position.x - cell.comX;
        const dy = node.position.y - cell.comY;
        const dz = node.position.z - cell.comZ;
        const distSq = dx * dx + dy * dy + dz * dz;
        const dist = Math.sqrt(distSq) || 0.001;

        // Cell size / distance ratio
        const cellSize = cell.halfSize * 2;
        if (cellSize / dist < theta) {
            addRepulsion(
                force, dx, dy, dz, distSq, dist,
                repulsion * cell.mass, minDistance, maxForce,
            );
        } else {
            // Recurse into children
            if (cell.children) {
                for (const child of cell.children) {
                    if (child.mass > 0) stack.push(child);
                }
            }
        }
    }

    return force;
}