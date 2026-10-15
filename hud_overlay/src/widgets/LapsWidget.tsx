import type { WidgetProps, SettingField } from './types';
import { useLaps, useLapStats } from '../store/laps';

export const laps_settings: SettingField[] = [
    { key: 'rows', label: 'Laps shown', type: 'number', min: 3, max: 20, default: 10 },
    { key: 'font_size', label: 'Font size', type: 'number', min: 10, max: 32, default: 16, suffix: 'px' },
    { key: 'width', label: 'Width', type: 'number', min: 180, max: 600, default: 260, suffix: 'px' },
    { key: 'show_sectors', label: 'Show sector times (widen the table)', type: 'boolean', default: false },
    {
        key: 'delta_ref', label: 'Delta compared to', type: 'select', default: 'session',
        options: [
            { value: 'session', label: 'Session best' },
            { value: 'all', label: 'All-time best' },
            { value: 'optimal', label: 'Optimal lap' },
        ],
    },
    { key: 'show_summary', label: 'Show all-time best and optimal rows', type: 'boolean', default: true },
    { key: 'show_header', label: 'Show header', type: 'boolean', default: true },
    { key: 'newest_first', label: 'Newest lap on top', type: 'boolean', default: true },
    { key: 'show_borders', label: 'Inner borders', type: 'boolean', default: true },
    { key: 'striped', label: 'Alternate row colours', type: 'boolean', default: true },
    { key: 'best_color', label: 'Best lap colour', type: 'color', default: '#f40bf0' },
    { key: 'invalid_color', label: 'Invalid lap colour', type: 'color', default: '#e52249' },
    { key: 'summary_color', label: 'Summary colour', type: 'color', default: '#05e701' },
];

const BORDER = '1px solid rgba(255,255,255,0.15)';
const STRIPE = 'rgba(255,255,255,0.07)';

const fmt_time = (t: number) => {
    if (!(t > 0)) return '--:--.---';
    const m = Math.floor(t / 60);
    return `${m}:${(t - m * 60).toFixed(3).padStart(6, '0')}`;
};

const fmt_sector = (t: number) => (t > 0 ? t.toFixed(3) : '—');

const fmt_delta = (time: number, ref: number) => {
    if (!(time > 0) || !(ref > 0) || Math.abs(time - ref) < 0.0005) return '—';
    const d = time - ref;
    return `${d > 0 ? '+' : ''}${d.toFixed(3)}`;
};

type Line = { 
    key: string; 
    cells: string[]; 
    color?: string; 
    opacity?: number; 
    bg?: string 
};


export default function LapsWidget({ config }: WidgetProps) {
    const laps = useLaps();
    const stats = useLapStats();

    const ref =
        config.delta_ref === "all" ? stats.all_best
        : config.delta_ref === "optimal" ? stats.optimal
        : stats.session_best;

    const sectors = (v: number[]) => (config.show_sectors ? v.map(fmt_sector) : []);

    const shown = laps.slice(-config.rows);
    if (config.newest_first) shown.reverse();

    const lines: Line[] = shown.map((l, i) => {
        const is_best = l.valid && stats.session_best > 0 && l.time - stats.session_best < 0.0005;
        return {
            key: `${l.session}-${l.lap}`,
            cells: [String(l.lap), ...sectors(l.sectors), fmt_time(l.time), fmt_delta(l.time, ref)],
            color: !l.valid ? config.invalid_color : is_best ? config.best_color : undefined,
            opacity: l.valid ? 1 : 1,
            bg: config.striped && i % 2 === 1 ? STRIPE : undefined,
        };
    });

    if (config.show_summary && stats.best_lap) {
        lines.push({
            key: 'best',
            cells: ['Best', ...sectors(stats.best_lap.sectors), fmt_time(stats.all_best), '—'],
            color: config.summary_color,
        });
        if (stats.optimal > 0) {
            lines.push({
                key: 'opt',
                cells: ['Opt', ...sectors(stats.best_sectors), fmt_time(stats.optimal), fmt_delta(stats.optimal, stats.all_best)],
                color: config.summary_color,
            });
        }
    }

    const columns = [
        { label: 'Lap', align: 'left' as const, width: '3em' },
        ...(config.show_sectors
            ? ['S1', 'S2', 'S3'].map((label) => ({ label, align: 'right' as const, width: undefined }))
            : []),
        { label: 'Time', align: 'right' as const, width: undefined },
        { label: 'Delta', align: 'right' as const, width: undefined },
    ];

    const cell_style = (row: number, col: number): React.CSSProperties => ({
        padding: '0.2em 0.5em',
        borderTop: config.show_borders && row > 0 ? BORDER : undefined,
        borderLeft: config.show_borders && col > 0 ? BORDER : undefined,
    });

    const head_style = (col: number): React.CSSProperties => ({
        ...cell_style(0, col),
        borderBottom: config.show_borders ? BORDER : undefined,
        color: '#a1a1aa',
        fontWeight: 500,
    });

    return (
        <table className='text-white tabular-nums'
            style={{
                width: config.width,
                fontSize: config.font_size,
                borderCollapse: 'collapse',
                tableLayout: 'fixed',
                border: BORDER,
            }}
        >
            <colgroup>
                {columns.map((c, ci) => <col key={ci} style={{ width: c.width }} />)}
            </colgroup>

            {config.show_header && (
                <thead>
                    <tr>
                        {columns.map((c, ci) => (
                            <th
                                key={ci}
                                style={{
                                    ...cell_style(0, ci),
                                    borderBottom: config.show_borders ? BORDER : undefined,
                                    color: '#a1a1aa',
                                    fontWeight: 500,
                                    textAlign: c.align,
                                }}
                            >
                                {c.label}
                            </th>
                        ))}
                    </tr>
                </thead>
            )}

            <tbody>
                {shown.length === 0 && (
                    <tr>
                        <td colSpan={columns.length} style={{ padding: '0.5em', textAlign: 'center', color: '#71717a' }}>
                            No laps yet
                        </td>
                    </tr>
                )}

                {lines.map((ln, i) => (
                    <tr key={ln.key} style={{ backgroundColor: ln.bg }}>
                        {ln.cells.map((v, ci) => (
                            <td
                                key={ci}
                                style={{ ...cell_style(i, ci), color: ln.color, opacity: ln.opacity, textAlign: columns[ci].align }}
                            >
                                {v}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
};