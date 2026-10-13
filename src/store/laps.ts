import { useSyncExternalStore } from 'react';
import type IShared from '../data/r3eTypes';

// TypeScript tuple is similar to an array, but it has a fixed structure
type Triple = [number, number, number];

export type LapRecord = { 
    lap: number;
    time: number;
    valid: boolean;
    sectors: Triple; // -1 = unknown
};

type Measured = { 
    time: number; 
    sectors: Triple 
};
// completed lap that hasn't yet been committed to the history
// saves several possible sources of the final result. 
// When the game publishes the finished lap time, the code can prefer that result. 
// If it doesn't, it can try our measurement and then the last live timer
type Pending = { 
    valid: boolean;         // preventing the next lap's validity from automatically replacing the previous lap's validity
    timer: number;          // last observed live lap timer, (fallback)
    measured: Measured;     // timing calculated from the physics clock
    old_prev: number;       // prev lap time before the new result arrived
    since: number           // timestamp when the lap became pending
};

const MAX_KEPT = 200;
const STORAGE_KEY = "hud.laps.v2";
const STALE_MS = 30 * 60 * 1000; // saved laps older than this are ignored
const SWITCH_MS = 2000;          // a different track/session must last this long before we wipe
const RESOLVE_MS = 1000;         // how long we wait for the game to publish the finished lap time
const GRACE_MS = 500;            // ignore "invalid" flag right after a lap starts (stale value)
const NO_SECTORS: Triple = [-1, -1, -1];

let laps: LapRecord[] = [];
// read by the sectors widget
let lap_state = { prev_valid: true, s1_done: true };
let demo = false; 

// Set holds callbacks that React has subscribed with. Calling emit() invokes each callback
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

// session
let session_key = "";
let candidate_key = ""; // stores a possible new session key (a different key doesn't immediately trigger a reset)
let candidate_since = 0;

// lap tracking
let last_lap = -1;       // the game's lap counter, as last seen
let lap_valid = true;    // lap currently being driven 
let lap_started = 0;
let cur_time = -1;       // latest live lap timer value (last-resort fallback)
let seen_prev = -1;      // LapTimePreviousSelf as of the previous frame
let boundary_s1 = -1;    // S1 value at the moment the lap started
let lap_start_sim = -1;  // Physics-clock time at the start of the lap
let bounds: number[] = []; // Physics-clock readings at detected sector transitions
let last_sector = -1;
let pending: Pending | null = null;

const ok = (t: number) => Number.isFinite(t) && t > 0;

// updating sector widget (merges the supplied patch into the existing state)(Typescript Partial<>)
function set_lap_state(patch: Partial<typeof lap_state>) {
    // merge the supplied patch into the existing state(Typescript Partial<>)
    const next = { ...lap_state, ...patch };
    // prevents unnecessary notifications when the sector widget's state is already correct
    if (next.prev_valid === lap_state.prev_valid && next.s1_done === lap_state.s1_done) return;
    // if a property did change:
    lap_state = next;
    emit();
}

function save() {
    if (demo) return;
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ saved: Date.now(), key: session_key, laps }),
        );
    } catch {}
}

function load() {
    try {
        const p = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
        if (!p || !Array.isArray(p.laps) || Date.now() - p.saved > STALE_MS) return;
        laps = p.laps;
        session_key = p.key || "";
    } catch {}
}

load();

// lap and sector times measured with the physics clock
function measure(sim: number): Measured {
    if (
        !ok(sim) || 
        !ok(lap_start_sim) || // recorded start time isn't usable
        sim <= lap_start_sim // current clock hasn't advanced beyond the start time
    ) {
        return {
            time: -1,
            sectors: NO_SECTORS
        }; 
    };

    const sectors: Triple = bounds.length === 2
        ? [
            bounds[0] - lap_start_sim,
            bounds[1] - bounds[0],
            sim - bounds[1]
        ]
        : NO_SECTORS;

    return { 
        time: sim - lap_start_sim, 
        sectors 
    };
}

// the game's own sector times for the lap just finished, as individual sectors
// (null if missing, stale, or they don't add up to the lap time)
function game_sectors(s: IShared, time: number): Triple | null {
    const p = s.SectorTimesPreviousSelf;
    if (
        !p || 
        !ok(p.Sector1) || 
        !ok(p.Sector2) || 
        !ok(p.Sector3)
    ) {
        return null;
    }
    const cumulative = Math.abs(p.Sector3 - time) < 0.05;
    const out: Triple = cumulative
        ? [
            p.Sector1, 
            p.Sector2 - p.Sector1, 
            p.Sector3 - p.Sector2
        ]
        : [p.Sector1, p.Sector2, p.Sector3];
    return Math.abs(out[0] + out[1] + out[2] - time) < 0.05 ? out : null;
}

// call on every game state update
export function record_laps(s: IShared) {
    if (demo) return;

    const lap = s.CompletedLaps;
    // N/A (menus, loading) or paused: ignore and keep everything as it is
    if (!Number.isFinite(lap) || lap < 0 || !(s.SessionType >= 0) || s.GamePaused === 1) return;

    // current update snapshots
    const now = Date.now();
    const cur_s1 = s.SectorTimesCurrentSelf?.Sector1 ?? -1;
    const sim = s.Player?.GameSimulationTime ?? -1; 
    const sector = s.TrackSector;
    let new_lap = false;

    // --- session: wipe only for a different track/session that stays different ---
    const key = `${s.TrackId}|${s.LayoutId}|${s.SessionType}`;
    if (session_key === "") {
        session_key = key;
    } else if (key !== session_key) {
        if (key !== candidate_key) { candidate_key = key; candidate_since = now; }
        if (now - candidate_since < SWITCH_MS) return;
        session_key = key;
        candidate_key = "";
        laps = [];
        pending = null;
        last_lap = -1;
        lap_state = { prev_valid: true, s1_done: true };
        save();
        emit();
    } else {
        candidate_key = "";
    }

    // --- lap tracking ---
    if (last_lap < 0) {
        // first frame since the page loaded: we don't know when this lap started
        last_lap = lap;
        lap_valid = true;
        lap_started = now;
        cur_time = -1;
        boundary_s1 = cur_s1;
        lap_start_sim = -1;
        bounds = [];
        new_lap = true;
        set_lap_state({ s1_done: ok(cur_s1) });
    } else if (lap === last_lap + 1) {
        // a lap was completed: measure it now, with the clock as it is at the line
        pending = { 
            valid: lap_valid, 
            timer: cur_time, 
            measured: measure(sim), 
            old_prev: seen_prev, 
            since: now 
        };
        set_lap_state({ prev_valid: lap_valid, s1_done: false });
        last_lap = lap;
        lap_valid = true;
        lap_started = now;
        cur_time = -1;
        boundary_s1 = cur_s1;
        lap_start_sim = sim;
        bounds = [];
        new_lap = true;
    } else if (lap !== last_lap) {
        // counter jumped or went back (garage, pause): re-sync, don't record, don't wipe
        last_lap = lap;
        lap_valid = true;
        lap_started = now;
        cur_time = -1;
        boundary_s1 = cur_s1;
        lap_start_sim = -1;
        bounds = [];
        pending = null;
        new_lap = true;
        set_lap_state({ s1_done: ok(cur_s1) });
    }

    // sector line crossed inside the lap: remember the physics clock
    if (new_lap) {
        last_sector = sector;
    } else if (sector !== last_sector) {
        if (Number.isFinite(sector) && sector >= 0 && ok(sim)) bounds.push(sim);
        last_sector = sector;
    }

    if (s.CurrentLapValid === 0 && now - lap_started > GRACE_MS) lap_valid = false;
    if (ok(s.LapTimeCurrentSelf)) cur_time = s.LapTimeCurrentSelf;

    // new lap's first sector is done once S1 shows a value different from the one at the line
    if (!lap_state.s1_done && ok(cur_s1) && cur_s1 !== boundary_s1) {
        set_lap_state({ s1_done: true });
    }

    // --- store the finished lap once the game publishes its time (or we give up waiting) ---
    if (pending) {
        const t = s.LapTimePreviousSelf;
        const fresh = ok(t) && t !== pending.old_prev;
        if (fresh || now - pending.since > RESOLVE_MS) {
            const valid = pending.valid && fresh; // no fresh time from the game = invalid lap
            const m = pending.measured;
            // game's exact time if it has one, else our measurement, else the old timer reading
            const time = fresh ? t : ok(m.time) ? m.time : pending.timer;
            const sectors = (fresh ? game_sectors(s, t) : null) ?? m.sectors;
            const number = (laps.length ? laps[laps.length - 1].lap : 0) + 1; // our own continuous count
            laps = [...laps, { lap: number, time: ok(time) ? time : -1, valid, sectors }].slice(-MAX_KEPT);
            pending = null;
            set_lap_state({ prev_valid: valid });
            save();
            emit();
        }
    }

    seen_prev = s.LapTimePreviousSelf;
}

// fake laps for design mode
export function seed_demo_laps() {
    demo = true;
    const offsets = [1.2, 0.35, 0.0, 0.8, 0.5, 0.12, 0.9, 0.02, 1.4, 0.25, 0.6, 0.1];
    laps = offsets.map((o, i) => {
        const time = 98.4 + o;
        const s1 = time * 0.31;
        const s2 = time * 0.4;
        return { lap: i + 1, time, valid: i !== 7 && i !== 4, sectors: [s1, s2, time - s1 - s2] as Triple };
    });
    lap_state = { prev_valid: true, s1_done: true };
    emit();
}

const subscribe = (l : () => void) => {
    listeners.add(l);
    return () => { listeners.delete(l); }
};

// call "useSyncExternalStore" at the top level of your component to read a value from an external data store
// It returns the snapshot of the data in the store. You need to pass two functions as arguments:
// 1-The subscribe function should subscribe to the store and return a function that unsubscribes.
// 2-The getSnapshot function should read a snapshot of the data from the store.
export const useLaps = () => useSyncExternalStore(subscribe, () => laps);
export const useLapState = () => useSyncExternalStore(subscribe, () => lap_state);