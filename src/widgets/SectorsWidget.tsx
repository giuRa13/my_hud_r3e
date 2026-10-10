import type { WidgetProps, SettingField, Config } from './types';
import { useRef } from 'react';
import type { ISectors } from '../data/r3eTypes';

export const sectors_settings: SettingField[] = [
    { key: 'width', label: 'Quad width', type: 'number', min: 30, max: 288, default: 144, suffix: 'px' },
    { key: 'height', label: 'Quad height', type: 'number', min: 18, max: 96, default: 20, suffix: 'px' },
    { key: 'show_time', label: 'Show sector times', type: 'boolean', default: false },
    { key: 'show_previous', label: 'Keep last valid lap until S1 is done', type: 'boolean', default: true },
    { key: 'cumulative', label: 'Game sector times are cumulative', type: 'boolean', default: true },
    { key: 'best_color', label: 'Fastest colour', type: 'color', default: '#f40bf0' },
    { key: 'good_color', label: 'Green colour', type: 'color', default: '#05e701' },
    { key: 'good_limit', label: 'Green if slower by less than', type: 'number', min: 0.01, max: 0.5, step: 0.01, default: 0.1, suffix: ' s' },
    { key: 'ok_color', label: 'Orange colour', type: 'color', default: '#eca40c' },
    { key: 'slow_limit', label: 'Orange if slower by less than', type: 'number', min: 0.5, max: 5, step: 0.1, default: 1, suffix: ' s' },
    { key: 'slow_color', label: 'Gray colour', type: 'color', default: '#464646' },
];

type Triple = [number, number, number];
const NONE: Triple = [-1, -1, -1];
const EPS = 0.0005;

const valid = (v: number) => Number.isFinite(v) && v > 0;

// turns the game's three values into the time of each sector on its own
function per_sector(s: ISectors | undefined, cumulative: boolean): Triple {
    if (!s) return NONE;
    const { Sector1: a, Sector2: b, Sector3: c } = s;
    if (!cumulative) return [a, b, c];
    return [a, valid(a) && valid(b) ? b - a : -1, valid(b) && valid(c) ? c - b : -1];
};

// undefined = empty (border only)
function sector_color(time: number, best: number, c: Config): string | undefined {
    if (!valid(time)) return undefined;
    if (!valid(best)) return c.best_color; // nothing to compare with yet
    const delta = time - best;             // positive = slower
    if (delta <= EPS) return c.best_color;
    if (delta < c.good_limit) return c.good_color;
    if (delta < c.slow_limit) return c.ok_color;
    return c.slow_color;
};

export default function SectorsWidget({ state, config }: WidgetProps) {
    const cum = !!config.cumulative;
    const cur = per_sector(state.SectorTimesCurrentSelf, cum);
    const prev = per_sector(state.SectorTimesPreviousSelf, cum);

    // Remember whether the lap that just ended was valid
    const track = useRef({ lap: -1, valid: true, prev_valid: true });
    const t = track.current;
    const lap = state.CompletedLaps;
    const lap_ok = state.CurrentLapValid !== 0; // 0 = invalid; -1 (N/A) counts as valid

    if (lap !== t.lap) {
        // new lap started: the lap that just ended is valid if it never went invalid
        t.prev_valid = lap === t.lap + 1 ? t.valid : true;
        t.valid = lap_ok;
        t.lap = lap;
    } 
    else if (!lap_ok) {
        t.valid = false; // once a lap is invalid it stays invalid
    }

    // New lap: show last lap only if it was valid; otherwise empty until S1 is done
    const show_prev = config.show_previous && t.prev_valid;
    const times = valid(cur[0]) ? cur : show_prev ? prev : NONE;

    const b = state.BestIndividualSectorTimeSelf;
    const best: Triple = b ? [b.Sector1, b.Sector2, b.Sector3] : NONE;

    const w: number = config.width;
    const h: number = config.height;

    return (
        <div className="flex gap-1">
            {[0, 1, 2].map((i) => {
                const bg = sector_color(times[i], best[i], config);
                const has_time = config.show_time && valid(times[i]);
                return (
                    <div
                        key={i}
                        className="flex items-center justify-center border font-semibold leading-none"
                        style={{
                            width: w,
                            height: h,
                            backgroundColor: bg,
                            borderColor: 'rgba(255,255,255,0.4)',
                            color: bg ? '#fff' : 'rgba(255,255,255,0.6)',
                            /*textShadow: bg ? '0 1px 2px rgba(0,0,0,0.7)' : undefined,*/
                        }} 
                    >
                        {!has_time &&  <span style={{ fontSize: h * 0.5 }}>S{i + 1}</span>}
                        {has_time && (
                            <div className='flex justify-between gap-4'>
                                <span style={{ fontSize: h * 0.5 }}>S{i + 1}</span>
                                <span className="font-semibold tabular-nums" style={{ fontSize: h * 0.5 }}>
                                    {times[i].toFixed(3)}
                                </span>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );

};