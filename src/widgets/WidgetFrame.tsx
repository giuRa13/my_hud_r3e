import { useEffect, useRef, type ReactNode } from 'react';
import { useLayout } from '../store/LayoutContext';
import { hex_to_rgba } from '../utils';

const MIN_SCALE = 0.3;
const MAX_SCALE = 4;
// if v < min, return min; if v > max, return max; otherwise return v.
const clamp = (v: number, min: number, max: number) =>  Math.min(max, Math.max(min, v));

type Props = { 
    id: string; 
    editable?: boolean; 
    padded?: boolean;
    shape?: "rect" | "circle";
    children: ReactNode 
};

export default function WidgetFrame({ id, editable = true, padded = true, shape = "rect", children }: Props) {

    const { layout, settings, set_pos, set_scale } = useLayout();
    const l = layout[id];

    const ref = useRef<HTMLDivElement>(null);
    const scale_ref = useRef(l.scale);
    scale_ref.current = l.scale;
    const drag = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null); 

    // Wheel = scale. Needs a non-passive listener to be able to preventDefault
    useEffect(() => {
        const el = ref.current;
        if (!el || !editable) return;

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.05 : 1 / 1.05;
            set_scale(id, clamp(scale_ref.current * factor, MIN_SCALE, MAX_SCALE));
        };

        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);

    }, [id, editable, set_scale]);

    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!editable || e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { sx: e.clientX, sy: e.clientY, ox: l.x, oy: l.y };
    };

    const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        const d = drag.current;
        if (!d) return;
        set_pos(
            id,
            clamp(d.ox + e.clientX - d.sx, 0, window.innerWidth - 40),
            clamp(d.oy + e.clientY - d.sy, 0, window.innerHeight - 40),
        );
    };

    const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        drag.current = null;
        e.currentTarget.releasePointerCapture?.(e.pointerId);
    };

    return (
        <div
            ref={ref}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className={`absolute ${padded ? "p-3" : "overflow-hidden"} ${shape === 'circle' ? "rounded-full" : ""} ${
                editable 
                    ? "pointer-events-auto cursor-move select-none touch-none hover:ring-1 hover:ring-(--accent)"
                    : ""
            }`}
            style={{
                left: l.x, 
                top: l.y,
                transform: `scale(${l.scale})`,
                transformOrigin: "top left",
                backgroundColor: hex_to_rgba(settings.bg_color, settings.bg_alpha),
            }}
        >
            {children}
        </div>
    );
}