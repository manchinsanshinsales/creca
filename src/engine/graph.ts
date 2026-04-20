import type { PaymentMethod, Store, UserWallet } from "@/schemas";
import type { Hop } from "./types";

// Recursive path enumeration over the payment graph.
// Nodes = PaymentMethods. Edges:
//   - charge edge: c -> m when m.chargeableFrom contains c (user owns both)
//   - pay edge:    m -> Store when store.acceptedMethodIds contains m && m.canPayDirectly && user owns m
// Paths are sequences [c0, c1, ..., mk] where the last hop is a pay at the store.
// `viaMethodId` on bonus rules is NOT modeled as a path node itself — it's a side-condition checked on the pay hop.
// We do include `via` methods (like iD/QUICPay) as explicit graph nodes too, because their canPayDirectly is true
// at accepting stores and they forward points from the underlying credit card — that "forward" is data on the
// chargeableFrom edge (earnsPoints: true for the underlying card).

export type PathEnumerationOptions = {
  maxHops: number; // 1 = direct only, 2 = card->pay, 3 = card->emoney->pay, etc.
};

export type EnumeratedPath = Hop[];

export function enumeratePaths(
  methods: Map<string, PaymentMethod>,
  store: Store,
  wallet: UserWallet,
  opts: PathEnumerationOptions,
): EnumeratedPath[] {
  const owned = new Set(wallet.ownedMethodIds);
  const accepted = new Set(store.acceptedMethodIds);
  const out: EnumeratedPath[] = [];

  const dfs = (
    currentMethodId: string,
    prefix: Hop[],
    visitedCharge: Set<string>,
    depth: number,
  ) => {
    const m = methods.get(currentMethodId);
    if (!m) return;

    // Option A: terminate with a pay hop at the store (if method accepted & can pay)
    if (accepted.has(m.id) && m.canPayDirectly) {
      // `viaMethod` for the pay hop is the LAST charge edge's `to` — i.e. the method
      // through which the pay is physically made. For a pay hop the "via" concept maps
      // to the underlying method if the payment method is a post-pay wrapper (iD/QUICPay).
      // We leave it undefined here; bonus-rule's `viaMethodId` is evaluated against
      // the last-hop method id plus upstream chain during compute.
      out.push([...prefix, { kind: "pay", method: m }]);
    }

    if (depth >= opts.maxHops - 1) return;

    // Option B: extend with a charge edge m' -> m (so m was the "to", now we look for next "from")
    // We're walking BACKWARDS from a payment leaf; but to keep prefix[0] = source card,
    // we invert: start DFS from source cards, extend forward via chargeableFrom inverse.
    // The inversion is handled in the caller (startNodes). Here we extend forward: find all
    // methods m' such that m' has a chargeableFrom referencing the current method.
    for (const [, candidate] of methods) {
      if (!owned.has(candidate.id)) continue;
      if (candidate.id === m.id) continue;
      const edge = candidate.chargeableFrom.find((e) => e.fromMethodId === m.id);
      if (!edge) continue;
      if (visitedCharge.has(candidate.id)) continue;
      const nextVisited = new Set(visitedCharge);
      nextVisited.add(candidate.id);
      dfs(
        candidate.id,
        [...prefix, { kind: "charge", from: m, to: candidate }],
        nextVisited,
        depth + 1,
      );
    }
  };

  // Start DFS from every owned method (they are potential "source" cards / cash points).
  for (const id of owned) {
    const m = methods.get(id);
    if (!m) continue;
    dfs(id, [], new Set([id]), 0);
  }

  return out;
}
