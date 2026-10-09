import { widgets } from "./widgets/registry";
import WidgetFrame from './widgets/WidgetFrame';
import { useLayout } from './store/LayoutContext';
import type IShared from "./data/r3eTypes";

// shared widget placement 

export default function HudLayer({ state, editable = true } : { state: IShared; editable?: boolean }) {

    const { layout, settings } = useLayout();
    const can_edit = editable && !settings.locked;

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Object.entries(widgets).map(([id, w]) => {
                if (!layout[id].visible) return null;
                return(
                    <WidgetFrame key={id} id={id} editable={can_edit} padded={w.padded !== false}>
                        <w.component state={state} config={layout[id].config}/>
                    </WidgetFrame>
                );
            })}
        </div>
    );
};