// builder/patterns.ts - Pre-built graph patterns
import { GraphBuilder } from './graph';
import { TAU } from '../utils/math';

const Patterns = {
    circle(count: number, radius = 100, labelPrefix = 'Node'): GraphBuilder {
        const builder = new GraphBuilder();
        const step = TAU / count;
        for (let i = 0; i < count; i++) {
            const angle = i * step;
            builder
                .node(`node-${i}`)
                .type('ShapeNode')
                .label(`${labelPrefix} ${i}`)
                .position(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
            if (i > 0) builder.addEdge({ id: `edge-${i}`, source: `node-${i - 1}`, target: `node-${i}` });
        }
        builder.connect(`node-${count - 1}`, 'node-0');
        return builder;
    },

    grid(rows: number, cols: number, spacing = 100): GraphBuilder {
        const builder = new GraphBuilder();
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const id = `node-${row}-${col}`;
                builder.node(id).type('ShapeNode').label(`${row},${col}`).position(col * spacing, 0, row * spacing);
                if (col > 0) builder.addEdge({ id: `h-${row}-${col}`, source: `node-${row}-${col - 1}`, target: id });
                if (row > 0) builder.addEdge({ id: `v-${row}-${col}`, source: `node-${row - 1}-${col}`, target: id });
            }
        }
        return builder;
    },

    hierarchy(levels: number[], spacing = 100): GraphBuilder {
        const builder = new GraphBuilder();
        let nodeId = 0, prevLevelStart = 0;
        levels.forEach((count, levelIndex) => {
            const y = levelIndex * spacing, levelStart = nodeId;
            for (let i = 0; i < count; i++) {
                const id = `node-${nodeId++}`;
                builder.node(id).type('ShapeNode').label(id).position(((i - (count - 1) / 2) * spacing) / 2, y, 0);
                if (levelIndex > 0 && prevLevelStart < nodeId) {
                    const prevCount = levels[levelIndex - 1] || 0;
                    const parentIndex = prevLevelStart + Math.floor((i * prevCount) / count);
                    if (parentIndex >= prevLevelStart && parentIndex < nodeId) {
                        builder.addEdge({ id: `edge-${nodeId}-${parentIndex}`, source: `node-${parentIndex}`, target: id });
                    }
                }
            }
            prevLevelStart = levelStart;
        });
        return builder;
    },

    chain(count: number, spacing = 100): GraphBuilder {
        const builder = new GraphBuilder();
        for (let i = 0; i < count; i++) {
            builder.node(`node-${i}`).type('ShapeNode').label(`Node ${i}`).position(i * spacing, 0, 0);
            if (i > 0) builder.addEdge({ id: `edge-${i}`, source: `node-${i - 1}`, target: `node-${i}` });
        }
        return builder;
    },

    star(spokes: number, radius = 100): GraphBuilder {
        const builder = new GraphBuilder();
        const step = TAU / spokes;
        builder.node('center').type('ShapeNode').label('Center').position(0, 0, 0);
        for (let i = 0; i < spokes; i++) {
            const angle = i * step;
            builder.node(`spoke-${i}`).type('ShapeNode').label(`Spoke ${i}`).position(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
            builder.addEdge({ id: `edge-${i}`, source: 'center', target: `spoke-${i}` });
        }
        return builder;
    },

    binaryTree(depth: number, spacing = 100): GraphBuilder {
        const builder = new GraphBuilder();
        const addNode = (level: number, index: number): string => {
            const id = `node-${level}-${index}`;
            const x = (index - (2 ** level - 1) / 2) * spacing;
            const y = level * spacing;
            builder.node(id).type('ShapeNode').label(id).position(x, 0, -y);
            if (level > 0) {
                const parentIndex = Math.floor((index - 1) / 2);
                builder.addEdge({ id: `e-${id}-p`, source: `node-${level - 1}-${parentIndex}`, target: id });
            }
            return id;
        };
        for (let l = 0; l < depth; l++) for (let i = 0; i < 2 ** l; i++) addNode(l, i);
        return builder;
    },

    mesh(width: number, height: number, spacing = 100): GraphBuilder {
        return Patterns.grid(height, width, spacing);
    },

    torus(count: number, majorRadius = 200, minorRadius = 50): GraphBuilder {
        const builder = new GraphBuilder();
        const step = TAU / count;
        for (let i = 0; i < count; i++) {
            const majorAngle = i * step;
            const x = (majorRadius + minorRadius * Math.cos(i * 3)) * Math.cos(majorAngle);
            const z = (majorRadius + minorRadius * Math.cos(i * 3)) * Math.sin(majorAngle);
            const y = minorRadius * Math.sin(i * 3);
            builder.node(`node-${i}`).type('ShapeNode').label(`Node ${i}`).position(x, y, z);
            if (i > 0) builder.addEdge({ id: `e-${i}`, source: `node-${i - 1}`, target: `node-${i}` });
        }
        builder.connect(`node-${count - 1}`, 'node-0');
        return builder;
    },

    random(count: number, spread = 500): GraphBuilder {
        const builder = new GraphBuilder();
        for (let i = 0; i < count; i++) {
            builder.node(`node-${i}`).type('ShapeNode').label(`Node ${i}`).position(
                Math.random() * spread - spread / 2,
                Math.random() * spread - spread / 2,
                Math.random() * spread - spread / 2,
            );
        }
        return builder;
    },

    spiral(turns: number, pointsPerTurn = 10, spacing = 50): GraphBuilder {
        const builder = new GraphBuilder();
        const totalPoints = turns * pointsPerTurn;
        for (let i = 0; i < totalPoints; i++) {
            const angle = (i / pointsPerTurn) * TAU;
            const radius = i * (spacing / pointsPerTurn);
            builder.node(`node-${i}`).type('ShapeNode').label(`Node ${i}`).position(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
        }
        return builder;
    },

    honeycomb(rings: number, spacing = 80): GraphBuilder {
        const builder = new GraphBuilder();
        const hexPositions: [number, number][] = [];
        for (let q = -rings; q <= rings; q++) {
            const r1 = Math.max(-rings, -q - rings);
            const r2 = Math.min(rings, -q + rings);
            for (let r = r1; r <= r2; r++) {
                const x = spacing * (3 / 2 * q);
                const z = spacing * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
                hexPositions.push([x, z]);
            }
        }
        hexPositions.forEach(([x, z], i) => {
            builder.node(`node-${i}`).type('ShapeNode').label(`Node ${i}`).position(x, 0, z);
        });
        for (let i = 0; i < hexPositions.length; i++) {
            for (let j = i + 1; j < hexPositions.length; j++) {
                const [x1, z1] = hexPositions[i];
                const [x2, z2] = hexPositions[j];
                const dist = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
                if (dist < spacing * 1.1) builder.addEdge({ id: `e-${i}-${j}`, source: `node-${i}`, target: `node-${j}` });
            }
        }
        return builder;
    },

    tree(children: number[], spacingX = 80, spacingY = 100): GraphBuilder {
        const builder = new GraphBuilder();
        let nodeId = 0;
        const bfs = (level: number, startIdx: number, count: number) => {
            const y = level * spacingY;
            const width = count * spacingX;
            for (let i = 0; i < count; i++) {
                const x = (i - (count - 1) / 2) * spacingX - width / 2;
                const id = `node-${nodeId++}`;
                builder.node(id).type('ShapeNode').label(id).position(x, 0, y);
                if (level > 0) {
                    const parentIdx = startIdx + Math.floor(i * children[level - 1] / count);
                    builder.addEdge({ id: `e-${id}-parent`, source: `node-${parentIdx}`, target: id });
                }
            }
        };
        children.forEach((count, level) => bfs(level, 0, count));
        return builder;
    },

    clusters(count: number, nodesPerCluster: number, spread = 300): GraphBuilder {
        const builder = new GraphBuilder();
        for (let c = 0; c < count; c++) {
            const cx = (c % 3) * spread - spread;
            const cz = Math.floor(c / 3) * spread - spread;
            for (let i = 0; i < nodesPerCluster; i++) {
                const id = `node-${c}-${i}`;
                builder.node(id).type('ShapeNode').label(`C${c}-${i}`).position(
                    cx + Math.random() * 100 - 50,
                    Math.random() * 100 - 50,
                    cz + Math.random() * 100 - 50,
                );
                if (i > 0) builder.addEdge({ id: `e-${c}-${i}`, source: `node-${c}-${i - 1}`, target: id });
            }
        }
        return builder;
    },

    dag(levels: number[], connectProbability = 0.5): GraphBuilder {
        const builder = new GraphBuilder();
        let nodeId = 0;
        const levelNodes: string[][] = [];
        levels.forEach((count, levelIndex) => {
            const nodesAtLevel: string[] = [];
            for (let i = 0; i < count; i++) {
                const id = `node-${nodeId++}`;
                builder.node(id).type('ShapeNode').label(id).position(i * 100, 0, levelIndex * 100);
                nodesAtLevel.push(id);
            }
            levelNodes.push(nodesAtLevel);
        });
        for (let l = 0; l < levelNodes.length - 1; l++) {
            for (const source of levelNodes[l]) {
                for (const target of levelNodes[l + 1]) {
                    if (Math.random() < connectProbability) builder.addEdge({ id: `e-${source}-${target}`, source, target });
                }
            }
        }
        return builder;
    },

    petersen(): GraphBuilder {
        const builder = new GraphBuilder();
        const n = 5;
        const outerR = 100, innerR = 50;
        for (let i = 0; i < n; i++) {
            const angle = (i / n) * TAU - TAU / 4;
            builder.node(`outer-${i}`).position(Math.cos(angle) * outerR, 0, Math.sin(angle) * outerR);
        }
        for (let i = 0; i < n; i++) {
            const angle = (i / n) * TAU + TAU / 10 - TAU / 4;
            builder.node(`inner-${i}`).position(Math.cos(angle) * innerR, 0, Math.sin(angle) * innerR);
        }
        for (let i = 0; i < n; i++) builder.connect(`outer-${i}`, `outer-${(i + 1) % n}`);
        for (let i = 0; i < n; i++) builder.connect(`inner-${i}`, `inner-${(i + 2) % n}`);
        for (let i = 0; i < n; i++) builder.connect(`outer-${i}`, `inner-${i}`);
        return builder;
    },

    fromAdjacencyMatrix(matrix: number[][]): GraphBuilder {
        const builder = new GraphBuilder();
        const n = matrix.length;
        for (let i = 0; i < n; i++) builder.node(`node-${i}`).label(`Node ${i}`);
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (matrix[i][j] > 0) builder.addEdge({ id: `e-${i}-${j}`, source: `node-${i}`, target: `node-${j}`, data: { weight: matrix[i][j] } });
            }
        }
        return builder;
    },

    erdosRenyi(n: number, probability: number): GraphBuilder {
        const builder = new GraphBuilder();
        for (let i = 0; i < n; i++) builder.node(`node-${i}`).label(`Node ${i}`).position(Math.random() * 200 - 100, 0, Math.random() * 200 - 100);
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                if (Math.random() < probability) builder.connect(`node-${i}`, `node-${j}`);
            }
        }
        return builder;
    },

    barbell(cliqueSize: number, bridgeLength = 1): GraphBuilder {
        const builder = new GraphBuilder();
        for (let i = 0; i < cliqueSize; i++) builder.node(`left-${i}`).position(-(cliqueSize - i) * 50 - 100, 0, 0);
        for (let i = 0; i < cliqueSize; i++) {
            for (let j = i + 1; j < cliqueSize; j++) builder.connect(`left-${i}`, `left-${j}`);
        }
        for (let i = 0; i < bridgeLength; i++) builder.node(`bridge-${i}`).position(i * 50 + 50, 0, 0);
        builder.connect(`left-${cliqueSize - 1}`, 'bridge-0');
        if (bridgeLength > 1) {
            for (let i = 0; i < bridgeLength - 1; i++) builder.connect(`bridge-${i}`, `bridge-${i + 1}`);
            builder.connect(`bridge-${bridgeLength - 1}`, `right-0`);
        }
        for (let i = 0; i < cliqueSize; i++) builder.node(`right-${i}`).position(bridgeLength * 50 + 50 + i * 50 + 50, 0, 0);
        for (let i = 0; i < cliqueSize; i++) {
            for (let j = i + 1; j < cliqueSize; j++) builder.connect(`right-${i}`, `right-${j}`);
        }
        return builder;
    },
};

export { Patterns };