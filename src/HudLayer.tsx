import { useEffect } from 'react';
import { widgets } from "./widgets/registry";
import WidgetFrame from './widgets/WidgetFrame';
import { useLayout } from './store/LayoutContext';
import type IShared from "./data/r3eTypes";
import { record_laps } from './store/laps';

// shared widget placement 

export default function HudLayer({ state, editable = true } : { state: IShared; editable?: boolean }) {

    const { layout, settings } = useLayout();
    const can_edit = editable && !settings.locked;

    useEffect(() => { record_laps(state); }, [state]);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Object.entries(widgets).map(([id, w]) => {
                if (!layout[id].visible) return null;
                const config = layout[id].config;
                const shape = typeof w.shape === "function" ? w.shape(config) : w.shape;
                return(
                    <WidgetFrame key={id} id={id} editable={can_edit} padded={w.padded !== false} shape={shape}>
                        <w.component state={state} config={layout[id].config}/>
                    </WidgetFrame>
                );
            })}
        </div>
    );
};