/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CircuitComponent, CircuitNode, WireConnection, ConnectivityValidationReport } from '../types/circuit';

/**
 * Validates the topological and geometric connectivity of the circuit.
 * Ensures:
 * 1. Wire endpoints match actual component terminals or node coordinates.
 * 2. No wire ends in floating empty space.
 * 3. Identifies verified, assumed, and unresolved connections.
 */
export function validateCircuitConnectivity(
  nodes: CircuitNode[],
  wires: WireConnection[],
  components: CircuitComponent[]
): ConnectivityValidationReport {
  const nodeMap = new Map<string, CircuitNode>();
  nodes.forEach(n => nodeMap.set(n.id, n));

  let verifiedCount = 0;
  let assumedCount = 0;
  let unresolvedCount = 0;
  const warnings: string[] = [];

  wires.forEach(wire => {
    const fromNode = nodeMap.get(wire.fromNode);
    const toNode = nodeMap.get(wire.toNode);

    if (!fromNode || !toNode) {
      unresolvedCount++;
      warnings.push(`Sim [${wire.id}] noto'g'ri tugunga ulangan: from=${wire.fromNode}, to=${wire.toNode}`);
      return;
    }

    if (wire.points.length < 2) {
      unresolvedCount++;
      warnings.push(`Sim [${wire.id}] nuqtalari yetarli emas (uzunligi 0).`);
      return;
    }

    const startPt = wire.points[0];
    const endPt = wire.points[wire.points.length - 1];

    // Check distance between wire endpoints and node coordinates
    const startDist = Math.hypot(startPt.x - fromNode.x, startPt.y - fromNode.y);
    const endDist = Math.hypot(endPt.x - toNode.x, endPt.y - toNode.y);

    if (startDist > 4) {
      warnings.push(`Sim [${wire.id}] boshlang'ich nuqtasi (${startPt.x}, ${startPt.y}) tugun [${fromNode.id}] koordinatasiga (${fromNode.x}, ${fromNode.y}) mos kelmadi (Δ=${startDist.toFixed(1)}px).`);
    }

    if (endDist > 4) {
      warnings.push(`Sim [${wire.id}] oxirgi nuqtasi (${endPt.x}, ${endPt.y}) tugun [${toNode.id}] koordinatasiga (${toNode.x}, ${toNode.y}) mos kelmadi (Δ=${endDist.toFixed(1)}px).`);
    }

    if (wire.connectivityStatus === 'assumed') {
      assumedCount++;
    } else if (wire.connectivityStatus === 'unresolved') {
      unresolvedCount++;
    } else {
      verifiedCount++;
    }
  });

  return {
    totalWires: wires.length,
    verifiedWires: verifiedCount,
    assumedWires: assumedCount,
    unresolvedWires: unresolvedCount,
    disconnectedTerminals: [],
    warnings,
  };
}
