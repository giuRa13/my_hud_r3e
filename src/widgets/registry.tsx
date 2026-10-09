import GearWidget, { gear_settings } from './GearWidget';
import PedalsWidget, {pedals_settings} from './PedalsWidget';
import WheelWidget, {wheel_settings} from './WheelWidget';
import DeltaWidget, {delta_settings} from './DeltaWidget';
import type { WidgetDef } from './types';

export const widgets : Record<string, WidgetDef> = {
    gear: {
        label: "Gear",
        component: GearWidget,
        pos: { x: 40, y: 40 },
        padded: false,
        settings: gear_settings,
    },
    pedals: {
        label: "Pedals",
        component: PedalsWidget,
        pos: {x: 220, y: 40},
        settings: pedals_settings,
    },
    wheel: { // draggable={false} matters here: without it, dragging the widget can start the browser’s native image drag instead of widget drag
        label: "Steering wheel",
        component: WheelWidget,
        pos: { x: 400, y: 40 },
        //padded: false,
        shape: (config) => (config.circular ? "circle" : "rect"),
        settings: wheel_settings,
    },
        delta: {
        label: "Delta",
        component: DeltaWidget,
        pos: { x: 40, y: 260 },
        settings: delta_settings,
    },
};