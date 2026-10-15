import { useSyncExternalStore } from 'react';
import type IShared from '../data/r3eTypes';
import { track_laps, reset_tracker, type FinishedLap, type Triple } from './tracker';

export type LapRow = { 
    session: number; 
    lap: number; 
    valid: boolean; 
    time: number; 
    sectors: Triple 
};

export type LapStats = {
    session_best: number;
    all_best: number;
    optimal: number;
    best_sectors: Triple;
    best_lap: LapRow | null;
};

type View = { laps: LapRow[]; stats: LapStats };

const API = 'http://localhost:8071';
const NA_MS = 5000;          // no session data for this long = back in the menus = the game session ended
const RELOAD_MS = 60 * 1000; // after a page reload: seen this recently = same game session
const NOTE_KEY = 'hud.session.v1';

const ok = (t: number) => Number.isFinite(t) && t > 0;

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

let rows: LapRow[] = [];  // every lap of this car + track, all sessions
let session = 1;
let key = '';
let last_type = -1;
let ready = false;
let demo = false;

let na_since = 0;   // when the data became N/A (0 = it is not)
let ended = false;  // N/A lasted long enough: the next usable frame starts a new session
let touched = 0;

let lap_state = { prev_valid: true, s1_done: true };
let status = { game_lap: -1, ignoring: '', online: true, session: 1 };

function compute(): View {
    const good = rows.filter((r) => r.valid && ok(r.time));
    const mine = good.filter((r) => r.session === session);
    const best_lap = good.length ? good.reduce((a, b) => (b.time < a.time ? b : a)) : null;
    const best_sectors = [0, 1, 2].map((i) => {
        const v = good.map((r) => r.sectors[i]).filter(ok);
        return v.length ? Math.min(...v) : -1;
    }) as Triple;
    return {
        laps: rows.filter((r) => r.session === session),
        stats: {
            session_best: mine.length ? Math.min(...mine.map((r) => r.time)) : -1,
            all_best: best_lap ? best_lap.time : -1,
            optimal: best_sectors.every((t) => ok(t)) ? best_sectors[0] + best_sectors[1] + best_sectors[2] : -1,
            best_sectors,
            best_lap,
        },
    };
}

let view = compute();
const refresh = () => { view = compute(); emit(); };

function set_lap_state(next: { prev_valid: boolean; s1_done: boolean }) {
    if (next.prev_valid === lap_state.prev_valid && next.s1_done === lap_state.s1_done) return;
    lap_state = { ...next };
    emit();
}

function set_status(patch: Partial<typeof status>) {
    const next = { ...status, ...patch };
    if (
        next.game_lap === status.game_lap && next.ignoring === status.ignoring &&
        next.online === status.online && next.session === status.session
    ) return;
    status = next;
    emit();
}

// --- small note that lets a reloaded page recognise the same game session ---

function touch() {
    const now = Date.now();
    if (now - touched < 1000) return;
    touched = now;
    try { localStorage.setItem(NOTE_KEY, JSON.stringify({ key, session, seen: now })); } catch {}
}

function read_note(): { key: string; session: number; seen: number } | null {
    try { return JSON.parse(localStorage.getItem(NOTE_KEY) || 'null'); } catch { return null; }
}

// --- CSV --- ////////////////////////////////////////////////////////////////////////////////////////

const csv_line = (r: LapRow) =>
    [r.session, r.lap, r.valid ? 1 : 0, r.time.toFixed(3), ...r.sectors.map((t) => t.toFixed(3))].join(',');

function parse(csv: string): LapRow[] {
    const out: LapRow[] = [];
    for (const line of csv.split('\n')) {
        const p = line.trim().split(',').map(Number);
        if (p.length < 7 || p.some(Number.isNaN)) continue; // header or junk
        out.push({ session: p[0], lap: p[1], valid: p[2] === 1, time: p[3], sectors: [p[4], p[5], p[6]] });
    }
    return out;
}

async function load(k: string) {
    ready = false;
    let loaded: LapRow[] = [];
    let online = true;
    try {
        const j = await (await fetch(`${API}/laps?key=${k}`)).json();
        loaded = parse(j.csv);
    } catch {
        online = false; // no server: keep working in memory only
    }
    if (k !== key) return; // car/track changed while loading

    // same car/track seen a moment ago = the page was reloaded inside the same game session
    const note = read_note();
    const same = !!note && note.key === k && Date.now() - note.seen < RELOAD_MS;
    const last = Math.max(0, ...loaded.map((r) => r.session));

    rows = loaded;
    session = same ? Math.max(note!.session, 1) : last + 1;
    ended = false;
    ready = true;
    set_status({ online, session });
    refresh();
}

function add_lap(l: FinishedLap) {
    const lap = Math.max(0, ...rows.filter((r) => r.session === session).map((r) => r.lap)) + 1;
    const row: LapRow = { session, lap, ...l };
    rows = [...rows, row];
    refresh();
    fetch(`${API}/laps?key=${key}`, { method: 'POST', body: csv_line(row) })
        .then((r) => set_status({ online: r.ok }))
        .catch(() => set_status({ online: false }));
}

function start_session() {
    session = Math.max(0, ...rows.map((r) => r.session)) + 1;
    touched = 0;
    reset_tracker();
    set_status({ session });
    refresh();
}

// --- public API --- ////////////////////////////////////////////////////////////////////////////////////////

// call on every game state update
export function record_laps(s: IShared) {
    if (demo) return;

    const now = Date.now();
    const lap = s.CompletedLaps;
    const model = s.VehicleInfo?.ModelId ?? -1;
    const game_lap = Number.isFinite(lap) ? lap : -1;

    // a pause is not the end of the session
    if (s.GamePaused === 1) {
        na_since = 0;
        set_status({ game_lap, ignoring: 'game paused' });
        return;
    }

    const missing =
        !Number.isFinite(lap) || lap < 0 ? 'no lap data (menu or loading)'
        : !(s.SessionType >= 0) ? 'no session'
        : !(s.TrackId >= 0) || !(model >= 0) ? 'no track or car data'
        : '';
    set_status({ game_lap, ignoring: missing });

    if (missing) {
        if (!na_since) na_since = now;
        if (now - na_since >= NA_MS) ended = true; // we left to the menus: the next session is a new one
        return;
    }
    na_since = 0;

    const k = `${s.TrackId}-${s.LayoutId}-${model}`;
    if (k !== key) {
        key = k;
        last_type = s.SessionType;
        reset_tracker();
        load(k); // also decides the session number
    }
    if (!ready) return;

    // came back from the menus on the same car and track
    if (ended) { ended = false; start_session(); }

    // practice -> qualify -> race = new session number
    if (s.SessionType !== last_type) { last_type = s.SessionType; start_session(); }

    set_lap_state(track_laps(s, add_lap));
    touch();
}

// starts a new session number by hand; old laps stay in the file
export function reset_laps() {
    if (demo) { seed_demo_laps(); return; }
    start_session();
}

// fake laps for design mode
export function seed_demo_laps() {
    demo = true;
    const offsets = [1.2, 0.35, 0.0, 0.8, 0.5, 0.12, 0.9, 0.02, 1.4, 0.25, 0.6, 0.1];
    rows = [
        { session: 0, lap: 1, valid: true, time: 97.2, sectors: [30.0, 39.0, 28.2] }, // an older session
        ...offsets.map((o, i): LapRow => {
            const time = 98.4 + o;
            const s1 = time * 0.31;
            const s2 = time * 0.4;
            return { session: 1, lap: i + 1, valid: i !== 7 && i !== 4, time, sectors: [s1, s2, time - s1 - s2] };
        }),
    ];
    session = 1;
    lap_state = { prev_valid: true, s1_done: true };
    set_status({ session });
    refresh();
}

const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => { listeners.delete(l); };
};

export const useLaps = () => useSyncExternalStore(subscribe, () => view.laps);
export const useLapStats = () => useSyncExternalStore(subscribe, () => view.stats);
export const useLapState = () => useSyncExternalStore(subscribe, () => lap_state);
export const useLapStatus = () => useSyncExternalStore(subscribe, () => status);