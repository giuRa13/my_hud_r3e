import GearWidget, { gear_settings } from './GearWidget';
import PedalsWidget, {pedals_settings} from './PedalsWidget';
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
};