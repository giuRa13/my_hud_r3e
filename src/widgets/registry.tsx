import type { ComponentType } from 'react';
import type IShared from '../data/r3eTypes';
import Gear from './Gear';

export type WidgetDef = {
    label: string;
    component: ComponentType<{ state: IShared }>;
    pos: { x: number; y: number };
    padded?: boolean;
};

export const widgets : Record<string, WidgetDef> = {
    gear: { label: 'Gear', component: Gear, pos: { x: 40, y: 40 }, padded: false },
};