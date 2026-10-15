import type IShared from '../data/r3eTypes';

export type Triple = [number, number, number];
export type FinishedLap = { valid: boolean; time: number; sectors: Triple };

const RESOLVE_MS = 1000; // how long to wait for the game to publish the finished lap's time
const GRACE_MS = 500;    // ignore a stale "invalid" flag right after the line
const GUARD_MS = 1000;   // a sector can't be shorter, so a change right after the line is the line itself
const NONE: Triple = [-1, -1, -1];

const ok = (t: number) => Number.isFinite(t) && t > 0;

let last_lap = -1;          // the game's lap counter as last seen (-1 = not started)
let valid = true;           // current lap stayed valid so far?
let started = 0;            // wall clock at the start of the lap
let start_sim = -1;         // physics clock at the line that started this lap (-1 = unknown)
let marks: number[] = [];   // physics clock at each sector line crossed in this lap
let last_sector = -1;
let boundary_s1 = -1;
let old_prev = -1;
let prev_valid = true;
let s1_done = true;
let wait: { 
    valid: boolean; 
    time: number; 
    sectors: Triple; 
    old_prev: number; 
    since: number 
} | null = null;

export function reset_tracker() {
    last_lap = -1;
    wait = null;
    prev_valid = true;
    s1_done = true;
}

function start(s: IShared, lap: number, sim: number, now: number) {
    last_lap = lap;
    valid = true;
    started = now;
    start_sim = sim;
    marks = [];
    last_sector = s.TrackSector;
    boundary_s1 = s.SectorTimesCurrentSelf?.Sector1 ?? -1;
}

// lap and sector times measured with the physics clock (works for invalid laps too)
function measure(sim: number): { time: number; sectors: Triple } {
    if (!ok(sim) || !ok(start_sim) || sim <= start_sim) return { time: -1, sectors: NONE };
    const sectors: Triple = marks.length >= 2
        ? [marks[0] - start_sim, marks[1] - marks[0], sim - marks[1]]
        : NONE;
    return { 
        time: sim - start_sim, 
        sectors 
    };
}

// game's own sector times for the lap just finished, as individual sectors
// (null if missing, stale, or they don't add up to the lap time)
function game_sectors(s: IShared, time: number): Triple | null {
    const p = s.SectorTimesPreviousSelf;
    if (!p || !ok(p.Sector1) || !ok(p.Sector2) || !ok(p.Sector3)) return null;
    const cumulative = Math.abs(p.Sector3 - time) < 0.05;
    const out: Triple = cumulative
        ? [p.Sector1, p.Sector2 - p.Sector1, p.Sector3 - p.Sector2]
        : [p.Sector1, p.Sector2, p.Sector3];
    return Math.abs(out[0] + out[1] + out[2] - time) < 0.05 ? out : null;
}

// call on every usable frame; on_lap fires once for each finished lap
export function track_laps(s: IShared, on_lap: (l: FinishedLap) => void) {
    const now = Date.now();
    const lap = s.CompletedLaps;
    const sim = s.Player?.GameSimulationTime ?? -1;
    const s1 = s.SectorTimesCurrentSelf?.Sector1 ?? -1;

    if (last_lap < 0 || lap < last_lap) {
        // first frame, or the counter went back (garage re-entry): we don't know when this lap started
        start(s, lap, -1, now);
        wait = null;
        s1_done = ok(s1);
    } else if (lap > last_lap) {
        // lap line crossed (a bigger jump means we missed a frame)
        const m = measure(sim);
        wait = { valid, time: m.time, sectors: m.sectors, old_prev, since: now };
        prev_valid = valid;
        s1_done = false;
        start(s, lap, sim, now);
    }

    // sector line crossed inside the lap
    if (s.TrackSector !== last_sector) {
        if (s.TrackSector >= 0 && ok(sim) && now - started > GUARD_MS) marks.push(sim);
        last_sector = s.TrackSector;
    }
    if (s.CurrentLapValid === 0 && now - started > GRACE_MS) valid = false;
    if (!s1_done && (marks.length > 0 || (ok(s1) && s1 !== boundary_s1))) s1_done = true;

    // finish the lap once the game publishes its time, or we give up waiting
    if (wait) {
        const t = s.LapTimePreviousSelf;
        const fresh = ok(t) && t !== wait.old_prev;
        if (fresh || now - wait.since > RESOLVE_MS) {
            const w = wait;
            wait = null;
            prev_valid = w.valid && fresh; // no fresh time from the game = invalid lap
            on_lap({
                valid: prev_valid,
                time: fresh ? t : w.time,
                sectors: (fresh ? game_sectors(s, t) : null) ?? w.sectors,
            });
        }
    }
    old_prev = s.LapTimePreviousSelf;

    return { prev_valid, s1_done };
}