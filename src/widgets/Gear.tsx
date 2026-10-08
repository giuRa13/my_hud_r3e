import type IShared from '../data/r3eTypes';

const REDLINE = 0.91;
const OPTIMAL = 0.95;
const OVERREV = 0.98;

const gear_label = (g: number) =>
    g === -2 ? "-" : g === -1 ? "R" : g === 0 ? "N" : String(g);

function level_color(ratio: number): string | undefined {
    if (ratio >= OVERREV) return "var(--gear_overrev_color)";
    if (ratio >= OPTIMAL) return "var(--gear_optimal_color)";
    if (ratio >= REDLINE) return "var(--gear_redline_color)";
    return undefined; 
};

const rpm_value = (rps: number) => Math.round(rps * 9.549);

export default function Gear({ state }: { state: IShared }) {

    const max = state.MaxEngineRps;
    const ref = state.UpshiftRps > 0 ? state.UpshiftRps : max;

    const rps = Math.max(0, state.EngineRps);
    const shift_ratio = ref > 0 ? rps / ref : 0;      
    const bar_pct = max > 0 ? Math.min(100, (rps / max) * 100) : 0;

    const kmh = Math.max(0, Math.round(state.CarSpeed * 3.6));

  return (
    <div className="relative flex h-[170px] w-[150px] flex-col items-center justify-center pb-[28px] text-white"
        style={{ backgroundColor: level_color(shift_ratio) }}
    >

        <div className="text-[104px] font-bold leading-none">{gear_label(state.Gear)}</div>

        <div className="mt-1 flex items-baseline gap-1 ">
            <span className="text-xl font-semibold tabular-nums">{kmh}</span>
            <span className="text-xs opacity-70">km/h</span>
        </div>

        <div className='absolute bottom-0 left-0 h-[18px] w-full bg-white/20'>
            <div className='h-full bg-white' style={{ width: `${bar_pct}%` }} />
            <div
                className="absolute inset-0 flex items-center justify-center text-[10px] leading-none tabular-nums text-black font-semibold"
            >
                {rpm_value(rps)} rpm
            </div>
        </div>
    </div>
  )
}

