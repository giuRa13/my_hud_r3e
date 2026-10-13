import type { WidgetProps, SettingField } from './types';
import { useLaps } from '../store/laps';

export const laps_settings: SettingField[] = [
    { key: 'rows', label: 'Laps shown', type: 'number', min: 3, max: 20, default: 10 },
    { key: 'font_size', label: 'Font size', type: 'number', min: 10, max: 32, default: 14, suffix: 'px' },
    { key: 'width', label: 'Width', type: 'number', min: 180, max: 500, default: 300, suffix: 'px' },
    { key: 'show_header', label: 'Show header', type: 'boolean', default: true },
    { key: 'newest_first', label: 'Newest lap on top', type: 'boolean', default: true },
    { key: 'show_borders', label: 'Inner borders', type: 'boolean', default: true },
    { key: 'striped', label: 'Alternate row colours', type: 'boolean', default: true },
    { key: 'best_color', label: 'Best lap colour', type: 'color', default: '#f40bf0' },
    { key: 'invalid_color', label: 'Invalid lap colour', type: 'color', default: '#e52249' },
];

const fmt_time = (t: number) => {
    if (!(t > 0)) return '--:--.---';
    const m = Math.floor(t / 60);
    return `${m}:${(t - m * 60).toFixed(3).padStart(6, '0')}`;
};

const fmt_sector = (t: number) => (t > 0 ? t.toFixed(3) : '—');

const BORDER = '1px solid rgba(255,255,255,0.15)';

export default function LapsWidget({ config }: WidgetProps) {
    const laps = useLaps();

    const valid_times = laps.filter((l) => l.valid && l.time > 0).map((l) => l.time);
    const best = valid_times.length ? Math.min(...valid_times) : -1;

    const shown = laps.slice(-config.rows);
    if (config.newest_first) shown.reverse();

    const columns = [
        { label: 'Lap', align: 'left' as const, width: '2.8em' },
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
                            <th key={ci} style={{ ...head_style(ci), textAlign: c.align }}>{c.label}</th>
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

                {shown.map((l, i) => {
                    const is_best = l.valid && best > 0 && l.time - best < 0.0005;
                    const delta = l.time - best;
                    const color = !l.valid ? config.invalid_color : is_best ? config.best_color : undefined;
                    const opacity = l.valid ? 1 : 1;
                    const row_bg = config.striped && i % 2 === 1 ? 'rgba(255,255,255,0.07)' : undefined;
                    
                    const values = [
                        String(l.lap),
                        ...(config.show_sectors ? [0, 1, 2].map((k) => fmt_sector(l.sectors?.[k] ?? -1)) : []),
                        fmt_time(l.time),
                        is_best || best < 0 || !(l.time > 0) ? '—' : `+${delta.toFixed(3)}`,
                    ];

                    return (
                        <tr key={l.lap} style={{ backgroundColor: row_bg }}>
                            {values.map((v, ci) => (
                                <td
                                    key={ci}
                                    style={{ ...cell_style(i, ci), color, opacity, textAlign: columns[ci].align }}
                                >
                                    {v}
                                </td>
                            ))}
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
};