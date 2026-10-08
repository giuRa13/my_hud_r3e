import { widgets } from "./widgets/registry";
import type IShared from "./data/r3eTypes";
import WidgetFrame from "./widgets/WidgetFrame";

// shared widget placement 

export default function HudLayer({ state, editable = true } : { state: IShared; editable?: boolean }) {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Object.entries(widgets).map(([id, w]) => (
                <WidgetFrame key={id} id={id} editable={editable} padded={w.padded !== false}>
                    <w.component state={state} />
                </WidgetFrame>
            ))}
        </div>
    );
};