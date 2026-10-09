import type { ComponentType } from 'react';
import type IShared from '../data/r3eTypes';

export type Config = Record<string, any>;
export type WidgetProps = { state: IShared; config: Config };

type FieldBase = { key: string; label: string };

export type SettingField = FieldBase &
  (
    | { type: "number"; default: number; min: number; max: number; step?: number; suffix?: string }
    | { type: "boolean"; default: boolean }
    | { type: "color"; default: string }
    | { type: "select"; default: string; options: { value: string; label: string }[] }
  );

export type WidgetDef = {
    label: string;
    component: ComponentType<WidgetProps>;
    pos: { x: number; y: number };
    padded?: boolean;
    settings?: SettingField[]; // Fields shown in the widget's settings modal
};

export const defaultsOf = (fields: SettingField[] = []): Config =>
    fields.reduce<Config>((acc, f) => {
        acc[f.key] = f.default;
        return acc;
}, {});