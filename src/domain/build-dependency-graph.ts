import type {
  CareDependency,
  CareDependencyGraph,
  CareObligation,
} from "./models";

export function buildDependencyGraph(
  obligations: CareObligation[],
  edges: CareDependency[],
): CareDependencyGraph {
  const nodes = obligations.map((item) => item.id);
  const indegree = new Map(nodes.map((node) => [node, 0]));
  const outgoing = new Map(nodes.map((node) => [node, [] as string[]]));

  for (const edge of edges) {
    if (!indegree.has(edge.predecessorObligationId) || !indegree.has(edge.successorObligationId)) {
      throw new Error(`Dependency ${edge.id} references an unknown obligation.`);
    }
    indegree.set(
      edge.successorObligationId,
      (indegree.get(edge.successorObligationId) ?? 0) + 1,
    );
    outgoing.get(edge.predecessorObligationId)?.push(edge.successorObligationId);
  }

  const queue = nodes.filter((node) => indegree.get(node) === 0).sort();
  const topologicalOrder: string[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    topologicalOrder.push(node);
    for (const successor of outgoing.get(node) ?? []) {
      indegree.set(successor, (indegree.get(successor) ?? 1) - 1);
      if (indegree.get(successor) === 0) queue.push(successor);
    }
    queue.sort();
  }

  const cyclicNodes = nodes.filter((node) => !topologicalOrder.includes(node));
  return {
    nodes,
    edges,
    topologicalOrder,
    cycles: cyclicNodes.length > 0 ? [cyclicNodes] : [],
  };
}
