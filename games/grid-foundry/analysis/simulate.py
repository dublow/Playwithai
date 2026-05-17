#!/usr/bin/env python3
"""
Grid Foundry Simulator
Simulates runs for each of the 3 axes (Métal, Bio, Énergie).

Rules:
- RATE = 0.4 tick/s (1 tick = 2.5s real)
- A building produces only if it has enough resources to cover consumption this tick
- Diminishing returns: Nth building of same type has factor EFF[min(N-1, 4)]
- No adjacency bonuses (baseline)
- Grid expansion is a hard constraint:
  - 4x4 (max 16) unlockable only after centreville built AND produced bois>=100, pierre>=50, brique>=20, ouvrier>=10
    cost: brique:30, ouvrier:20, metal:10
  - 5x5 (max 25) unlockable only after hub built AND produced metal>=1, energie>=1, outil>=1
    cost: brique:50, ouvrier:30, energie:30, machine:20
- Greedy policy: at each tick, if stock allows, build the next building in queue
- Victory condition: produce at least 1 unit of the axis's final resource
"""

import json
import copy
from collections import defaultdict

# Load game data
with open("/home/ndelfour/projects/github/Playwithai/games/grid-foundry/game-data.json") as f:
    DATA = json.load(f)

BUILDINGS = DATA["BUILDINGS"]
EFF = DATA["EFF"]
EXPAND = DATA["EXPAND"]
RATE = 0.4  # ticks per second (but simulation runs in ticks; 1 tick = 2.5s real)

# Victory conditions per axis
VICTORY = {
    "metal": "ordinateur",
    "bio": "conscience",
    "energie": "reacteurStellaire",
}

# BUILD_ORDER: common prefix + axis-specific suffix
COMMON_BUILDINGS = [
    "scierie", "carriere", "puits", "ferme", "fourneau", "briqueterie", "cantine", "centreville",
    "forge", "generateur", "atelier", "hub",
    "usine",
]

AXIS_BUILDINGS = {
    "metal": ["fonderie", "circuiterie", "labquantique", "centrecalcul"],
    "bio": ["bioreacteur", "labadn", "incubateur", "chambreevo", "nexus"],
    "energie": ["fonderie", "stabilisateur", "reacteurplasma", "cristalliseur", "chambreantimatiere", "reacteurstellaire"],
}

def get_build_order(axis):
    return COMMON_BUILDINGS + AXIS_BUILDINGS[axis]

def simulate(axis, max_ticks=500000):
    """Run simulation for given axis. Returns dict with results."""
    build_queue = get_build_queue(axis)

    # Stock of resources (float)
    stock = defaultdict(float)
    # Total produced (for unlock conditions)
    total_produced = defaultdict(float)
    # Buildings built (list of building ids)
    built = []
    # Count per building type (for diminishing returns)
    type_count = defaultdict(int)
    # Grid capacity
    grid_capacity = 9  # 3x3 = 9
    # Build queue index
    build_idx = 0
    # Grid expanded flags
    expanded_4 = False
    expanded_5 = False
    # Expansion pending (tried to expand but couldn't afford yet)
    # Track when each building was queued vs built

    # Victory tracking
    victory_tick = None

    # Blocking tracker: for each (resource, building_waiting), count ticks blocked
    build_wait_start = {}   # build_idx -> tick when we started waiting
    blocking_ticks = defaultdict(int)  # resource -> ticks blocked

    # State for expansion attempts
    can_try_expand_4 = False   # set True once centreville built + produced conditions met
    can_try_expand_5 = False   # set True once hub built + produced conditions met
    hub_built = False
    centreville_built = False

    # Track current queue item being waited on
    current_wait_info = None  # (tick_started, building_id)

    for tick in range(max_ticks):
        # --- Production phase ---
        # Each active building produces if it can consume
        for bldg_id in built:
            bdef = BUILDINGS[bldg_id]
            consume = bdef.get("consume", {})
            produce = bdef.get("produce", {})

            # How many instances of this building type? (already built)
            # We need to know the index of this specific building instance
            # We'll apply EFF globally per type: all instances of a type share average?
            # No: "the Nth building of same type has factor EFF[min(N-1, 4)]"
            # We'll handle this by tracking each instance separately
            # Actually built is a list of bldg_ids (with duplicates), so we need instance index
            pass

        # Better: track instances as list of (bldg_id, instance_idx, eff)
        # Let me restructure: built is a list of (bldg_id, eff_factor)

        # [Restart with better structure - see below]
        break

    # --- Proper simulation ---
    # built_instances: list of (bldg_id, eff)
    built_instances = []
    stock = defaultdict(float)
    total_produced = defaultdict(float)
    type_count = defaultdict(int)
    grid_capacity = 9
    expanded_4 = False
    expanded_5 = False
    hub_built = False
    centreville_built = False
    victory_tick = None

    build_queue = get_build_queue(axis)
    build_idx = 0

    # Blocking tracker
    # For each tick we're waiting on a build, track which resource is missing
    blocking_ticks = defaultdict(int)  # resource -> ticks
    current_wait_building = None  # building_id currently being waited on

    # Grid expansion state
    produced_enough_for_4 = False
    produced_enough_for_5 = False
    grid4_unlocked = False  # conditions met but not yet paid
    grid5_unlocked = False

    # Initial stock from script.js (line 414: stock:{bois:60, pierre:40, eau:20})
    stock["bois"] = 60
    stock["pierre"] = 40
    stock["eau"] = 20

    for tick in range(max_ticks):
        # --- Production phase ---
        for (bldg_id, eff) in built_instances:
            bdef = BUILDINGS[bldg_id]
            consume = bdef.get("consume", {})
            produce = bdef.get("produce", {})

            if not produce:
                continue

            # Check if we can consume
            can_produce = True
            for res, amt in consume.items():
                needed = amt / RATE * eff
                if stock[res] < needed:
                    can_produce = False
                    break

            if can_produce:
                # Consume
                for res, amt in consume.items():
                    stock[res] -= amt / RATE * eff
                # Produce
                for res, amt in produce.items():
                    produced = amt / RATE * eff
                    stock[res] += produced
                    total_produced[res] += produced

        # --- Victory check ---
        if victory_tick is None:
            win_res = VICTORY[axis]
            if total_produced[win_res] >= 1.0:
                victory_tick = tick
                break

        # --- Check expansion conditions ---
        # 4x4 expansion
        if not expanded_4:
            if (centreville_built and
                total_produced["bois"] >= 100 and
                total_produced["pierre"] >= 50 and
                total_produced["brique"] >= 20 and
                total_produced["ouvrier"] >= 10):
                produced_enough_for_4 = True

            if produced_enough_for_4:
                # Try to pay for expansion
                cost4 = EXPAND["4"]["cost"]
                if (stock["brique"] >= cost4["brique"] and
                    stock["ouvrier"] >= cost4["ouvrier"] and
                    stock["metal"] >= cost4["metal"]):
                    stock["brique"] -= cost4["brique"]
                    stock["ouvrier"] -= cost4["ouvrier"]
                    stock["metal"] -= cost4["metal"]
                    grid_capacity = 16
                    expanded_4 = True

        # 5x5 expansion
        if not expanded_5:
            if (hub_built and
                total_produced["metal"] >= 1 and
                total_produced["energie"] >= 1 and
                total_produced["outil"] >= 1):
                produced_enough_for_5 = True

            if produced_enough_for_5:
                cost5 = EXPAND["5"]["cost"]
                if (stock["brique"] >= cost5["brique"] and
                    stock["ouvrier"] >= cost5["ouvrier"] and
                    stock["energie"] >= cost5["energie"] and
                    stock["machine"] >= cost5["machine"]):
                    stock["brique"] -= cost5["brique"]
                    stock["ouvrier"] -= cost5["ouvrier"]
                    stock["energie"] -= cost5["energie"]
                    stock["machine"] -= cost5["machine"]
                    grid_capacity = 25
                    expanded_5 = True

        # --- Build phase (greedy) ---
        while build_idx < len(build_queue):
            next_bldg = build_queue[build_idx]
            bdef = BUILDINGS[next_bldg]
            cost = bdef.get("cost", {})

            # Check grid capacity
            if len(built_instances) >= grid_capacity:
                # Can't build yet - grid full
                if current_wait_building != next_bldg:
                    current_wait_building = next_bldg
                # Track blocking: attribute to "grid_capacity"
                blocking_ticks["grid_capacity"] += 1
                break

            # Check if we can afford
            can_build = all(stock[res] >= amt for res, amt in cost.items())

            if can_build:
                # Pay cost
                for res, amt in cost.items():
                    stock[res] -= amt
                # Build it
                n = type_count[next_bldg]
                eff = EFF[min(n, 4)]
                type_count[next_bldg] += 1
                built_instances.append((next_bldg, eff))

                if next_bldg == "centreville":
                    centreville_built = True
                if next_bldg == "hub":
                    hub_built = True

                current_wait_building = None
                build_idx += 1
                # Continue loop to try building next one too
            else:
                # Can't afford - track blocking resource
                if current_wait_building != next_bldg:
                    current_wait_building = next_bldg

                # Which resource is the most limiting?
                most_blocking = None
                max_deficit = 0
                for res, amt in cost.items():
                    deficit = amt - stock[res]
                    if deficit > max_deficit:
                        max_deficit = deficit
                        most_blocking = res
                if most_blocking:
                    blocking_ticks[most_blocking] += 1
                break

    # Compute results
    if victory_tick is None:
        victory_tick = max_ticks

    real_time_min = victory_tick * 2.5 / 60  # 1 tick = 2.5s

    # Top 3 blocking resources (excluding grid_capacity)
    resource_blocks = {k: v for k, v in blocking_ticks.items() if k != "grid_capacity"}
    top_blocking = sorted(resource_blocks.items(), key=lambda x: -x[1])[:3]

    return {
        "axis": axis,
        "victory_tick": victory_tick,
        "real_time_min": real_time_min,
        "buildings_built": len(built_instances),
        "buildings_list": [b for b, _ in built_instances],
        "top_blocking": top_blocking,
        "grid_capacity_blocked_ticks": blocking_ticks.get("grid_capacity", 0),
    }


def get_build_queue(axis):
    return COMMON_BUILDINGS + AXIS_BUILDINGS[axis]


def main():
    results = {}
    for axis in ["metal", "bio", "energie"]:
        print(f"Simulating axis: {axis}...")
        r = simulate(axis)
        results[axis] = r
        print(f"  Victory tick: {r['victory_tick']}")
        print(f"  Real time: {r['real_time_min']:.1f} min")
        print(f"  Buildings built: {r['buildings_built']}")
        print(f"  Top blocking resources: {r['top_blocking']}")
        print(f"  Grid capacity blocked ticks: {r['grid_capacity_blocked_ticks']}")
        print()

    return results


if __name__ == "__main__":
    results = main()

    # Print summary table
    print("\n=== SUMMARY TABLE ===")
    print(f"{'Axe':<10} {'Bâtiments':>12} {'Ticks victoire':>16} {'Temps réel':>12} {'Ressource bloquante'}")
    print("-" * 75)
    for axis, r in results.items():
        top_res = r["top_blocking"][0][0] if r["top_blocking"] else "N/A"
        print(f"{axis:<10} {r['buildings_built']:>12} {r['victory_tick']:>16} {r['real_time_min']:>10.1f}m   {top_res}")

    print("\n=== TOP 3 BLOCKING RESOURCES PER AXIS ===")
    for axis, r in results.items():
        print(f"\n{axis}:")
        for res, ticks in r["top_blocking"]:
            print(f"  {res}: {ticks} ticks d'attente")

    print("\n=== VICTORY TIME COMPARISON ===")
    times = {ax: r["real_time_min"] for ax, r in results.items()}
    fastest = min(times, key=times.get)
    slowest = max(times, key=times.get)
    ratio = times[slowest] / times[fastest]
    print(f"Fastest: {fastest} ({times[fastest]:.1f} min)")
    print(f"Slowest: {slowest} ({times[slowest]:.1f} min)")
    print(f"Ratio slowest/fastest: {ratio:.2f}x")
    if ratio > 1.2:
        print(f"=> {fastest} is more than 20% faster than {slowest}")
    else:
        print(f"=> No axis is >20% faster than another")
