#!/usr/bin/env python3
"""
Grid Foundry Simulator — reactive smart greedy policy

Policy: build the next building in the queue. If blocked on a resource whose
net production is ≤ 0, insert an extra copy of its producer before retrying.

Game data fixes (applied in script.js):
  carriere produce:3, puits produce:4, fourneau produce:2
These ensure net production stays positive on pierre, eau, charbon as more
buildings are added — the reactive policy then handles cascade deadlocks.
"""

import json
from collections import defaultdict

with open("/home/ndelfour/projects/github/Playwithai/games/grid-foundry/game-data.json") as f:
    DATA = json.load(f)

BUILDINGS = DATA["BUILDINGS"]
EFF = DATA["EFF"]
EXPAND = DATA["EXPAND"]
RATE = 0.4  # ticks/s — 1 tick = 2.5 s real

VICTORY = {
    "metal":   "ordinateur",
    "bio":     "conscience",
    "energie": "reacteurStellaire",
}

PRODUCERS = {
    "bois":             "scierie",
    "pierre":           "carriere",
    "eau":              "puits",
    "nourriture":       "ferme",
    "charbon":          "fourneau",
    "brique":           "briqueterie",
    "ouvrier":          "cantine",
    "metal":            "forge",
    "energie":          "generateur",
    "outil":            "atelier",
    "machine":          "usine",
    "alliage":          "fonderie",
    "circuit":          "circuiterie",
    "calcul":           "labquantique",
    "ordinateur":       "centrecalcul",
    "biomasse":         "bioreacteur",
    "adn":              "labadn",
    "cellule":          "incubateur",
    "organisme":        "chambreevo",
    "conscience":       "nexus",
    "energieStable":    "stabilisateur",
    "plasma":           "reacteurplasma",
    "cristal":          "cristalliseur",
    "antimatiere":      "chambreantimatiere",
    "reacteurStellaire":"reacteurstellaire",
}

# Common path: 9 buildings for 3×3, then extra extractors before advanced buildings
# to prevent net-zero deadlocks in the 4×4 phase.
COMMON_BUILDINGS = [
    # 3×3 grid (9 slots)
    "scierie", "carriere", "puits", "ferme", "fourneau", "briqueterie",
    "cantine", "centreville", "forge",
    # 4×4 grid: extra extractors first, then converters
    "carriere",   # pierre net: 3+3−1−1 = +4
    "fourneau",   # charbon net: 2+2−1−1 = +2 (with generateur)
    "generateur",
    "atelier",
    "forge",      # metal net: 1+1−1(atelier) = +1 before usine
    "hub",
    "usine",
]

AXIS_BUILDINGS = {
    "metal":   ["fonderie", "circuiterie", "labquantique", "centrecalcul"],
    "bio":     ["bioreacteur", "labadn", "incubateur", "chambreevo", "nexus"],
    "energie": ["fonderie", "stabilisateur", "reacteurplasma", "cristalliseur",
                "chambreantimatiere", "reacteurstellaire"],
}

MAX_COPIES = 15


def net_production(built_instances):
    net = defaultdict(float)
    for bldg_id, eff in built_instances:
        bdef = BUILDINGS[bldg_id]
        for r, v in bdef.get("produce", {}).items():
            net[r] += v * eff
        for r, v in bdef.get("consume", {}).items():
            net[r] -= v * eff
    return net


def simulate(axis, max_ticks=5_000_000):
    build_target = COMMON_BUILDINGS + AXIS_BUILDINGS[axis]

    stock = defaultdict(float, {"bois": 60, "pierre": 40, "eau": 20})
    total_produced = defaultdict(float)
    built_instances = []
    type_count = defaultdict(int)
    grid_capacity = 9
    expanded_4 = False
    expanded_5 = False
    centreville_built = False
    hub_built = False
    victory_tick = None

    main_idx = 0
    extra_queue = []

    blocking_ticks = defaultdict(int)
    produced_enough_for_4 = False
    produced_enough_for_5 = False

    for tick in range(max_ticks):

        # ── Production ──────────────────────────────────────────────────────
        for bldg_id, eff in built_instances:
            bdef = BUILDINGS[bldg_id]
            consume = bdef.get("consume", {})
            produce = bdef.get("produce", {})
            if not produce:
                continue
            can = all(stock[r] >= v / RATE * eff for r, v in consume.items())
            if can:
                for r, v in consume.items():
                    stock[r] -= v / RATE * eff
                for r, v in produce.items():
                    gained = v / RATE * eff
                    stock[r] += gained
                    total_produced[r] += gained

        # ── Victory ─────────────────────────────────────────────────────────
        if total_produced[VICTORY[axis]] >= 1.0:
            victory_tick = tick
            break

        # ── Grid expansion ───────────────────────────────────────────────────
        if not expanded_4:
            if (centreville_built
                    and total_produced["bois"] >= 100
                    and total_produced["pierre"] >= 50
                    and total_produced["brique"] >= 20
                    and total_produced["ouvrier"] >= 10):
                produced_enough_for_4 = True
            if produced_enough_for_4:
                c = EXPAND["4"]["cost"]
                if all(stock[r] >= c[r] for r in c):
                    for r, v in c.items():
                        stock[r] -= v
                    grid_capacity = 16
                    expanded_4 = True

        if not expanded_5:
            if (hub_built
                    and total_produced["metal"] >= 1
                    and total_produced["energie"] >= 1
                    and total_produced["outil"] >= 1):
                produced_enough_for_5 = True
            if produced_enough_for_5:
                c = EXPAND["5"]["cost"]
                if all(stock[r] >= c[r] for r in c):
                    for r, v in c.items():
                        stock[r] -= v
                    grid_capacity = 25
                    expanded_5 = True

        # ── Build phase ──────────────────────────────────────────────────────
        if len(built_instances) >= grid_capacity:
            continue

        # Pick next building
        if extra_queue:
            next_bldg = extra_queue[0]
            from_extra = True
        elif main_idx < len(build_target):
            next_bldg = build_target[main_idx]
            from_extra = False
        else:
            continue

        bdef = BUILDINGS[next_bldg]
        cost = bdef.get("cost", {})
        can_build = all(stock[r] >= cost.get(r, 0) for r in cost)

        if can_build:
            for r, v in cost.items():
                stock[r] -= v
            n = type_count[next_bldg]
            built_instances.append((next_bldg, EFF[min(n, 4)]))
            type_count[next_bldg] += 1
            if next_bldg == "centreville":
                centreville_built = True
            if next_bldg == "hub":
                hub_built = True
            if from_extra:
                extra_queue.pop(0)
            else:
                main_idx += 1
        else:
            # Blocked: if net production of the blocking resource is ≤ 0,
            # insert an extra producer ahead of current target.
            net = net_production(built_instances)
            blocked_res = max(
                ((r, cost[r] - stock[r]) for r in cost if stock[r] < cost[r]),
                key=lambda x: x[1], default=(None, 0),
            )
            if blocked_res[0]:
                blocking_ticks[blocked_res[0]] += 1
                r = blocked_res[0]
                if net.get(r, 0) <= 0 and r in PRODUCERS:
                    producer = PRODUCERS[r]
                    if (producer != next_bldg
                            and type_count.get(producer, 0) < MAX_COPIES
                            and (not extra_queue or extra_queue[0] != producer)):
                        extra_queue.insert(0, producer)

    if victory_tick is None:
        victory_tick = max_ticks

    real_time_min = victory_tick * 2.5 / 60
    top_blocking = sorted(blocking_ticks.items(), key=lambda x: -x[1])[:3]

    return {
        "axis": axis,
        "victory_tick": victory_tick,
        "real_time_min": real_time_min,
        "buildings_built": len(built_instances),
        "buildings_list": [b for b, _ in built_instances],
        "type_counts": dict(type_count),
        "top_blocking": top_blocking,
        "hit_cap": victory_tick == max_ticks,
    }


def main():
    results = {}
    for axis in ["metal", "bio", "energie"]:
        print(f"Simulating axis: {axis}...")
        r = simulate(axis)
        results[axis] = r
        status = "CAP HIT" if r["hit_cap"] else f"victory at tick {r['victory_tick']}"
        print(f"  Status        : {status}")
        print(f"  Real time     : {r['real_time_min']:.1f} min")
        print(f"  Buildings     : {r['buildings_built']}")
        print(f"  Top blocking  : {r['top_blocking']}")
        counts = sorted(r["type_counts"].items(), key=lambda x: -x[1])
        multiples = [(b, n) for b, n in counts if n > 1]
        if multiples:
            print("  Multi-copy    : " + ", ".join(f"{b}×{n}" for b, n in multiples))
        print()

    print("\n=== SUMMARY TABLE ===")
    print(f"{'Axe':<10} {'Bâtiments':>12} {'Ticks':>12} {'Temps réel':>12} {'Bloquant'}")
    print("-" * 65)
    for axis, r in results.items():
        top_res = r["top_blocking"][0][0] if r["top_blocking"] else "—"
        cap = " (cap)" if r["hit_cap"] else ""
        print(f"{axis:<10} {r['buildings_built']:>12} {r['victory_tick']:>12}{cap:6} "
              f"{r['real_time_min']:>10.1f}m   {top_res}")

    print("\n=== VICTORY TIME COMPARISON ===")
    finished = {ax: r["real_time_min"] for ax, r in results.items() if not r["hit_cap"]}
    if len(finished) >= 2:
        fastest = min(finished, key=finished.get)
        slowest = max(finished, key=finished.get)
        ratio = finished[slowest] / finished[fastest]
        print(f"Fastest : {fastest} ({finished[fastest]:.1f} min)")
        print(f"Slowest : {slowest} ({finished[slowest]:.1f} min)")
        print(f"Ratio   : {ratio:.2f}x — "
              f"{'one axis >20% faster' if ratio > 1.2 else 'axes balanced (<20% spread)'}")
    elif len(finished) == 1:
        ax = list(finished.keys())[0]
        print(f"Only {ax} reached victory ({finished[ax]:.1f} min). Others hit cap.")
    else:
        print("No axis reached victory within cap.")

    return results


if __name__ == "__main__":
    main()
