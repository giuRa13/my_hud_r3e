import { useState, useEffect } from 'react';
import HudLayer from './HudLayer';
import ControlPanel, { type Mock } from './ControlPanel';
import { mock_state } from './data/mock';
import type IShared from './data/r3eTypes';

// the whole page stands in for the game screen
const checker: React.CSSProperties = {
    backgroundColor: '#222',
    backgroundImage: 'repeating-conic-gradient(#2a2a2e 0% 25%, #222 0% 50%)',
    backgroundSize: '16px 16px',
};

export default function DesignMode() {
    const [base, setBase] = useState<IShared>(mock_state);
    const [mock, setMock] = useState<Mock>({ 
      kmh: 180, rpm_pct: 70, gear: 3,
      throttle: 80, brake: 20, clutch: 0, ffb: 40, 
      steer: 0, delta: -35,
    });

    // Ctrl+V a game state dumped with Shift+D in game
    useEffect(() => {
        const onPaste = (e: ClipboardEvent) => {
        try {
            const d = JSON.parse(e.clipboardData!.getData('Text'));
            if (d.DriverData) setBase(d);
        } 
        catch {}
        };
        document.addEventListener('paste', onPaste);
        return () => document.removeEventListener('paste', onPaste);
    }, []);

    const state = {
        ...base,
        CarSpeed: mock.kmh / 3.6,
        EngineRps: (mock.rpm_pct / 100) * base.MaxEngineRps,
        Gear: mock.gear,
        Throttle: mock.throttle / 100,
        Brake: mock.brake / 100,
        Clutch: mock.clutch / 100,
        Player: { ...(base.Player ?? {}), SteeringForcePercentage: mock.ffb / 100 },
        SteerInputRaw: mock.steer / 100,
        SteerWheelRangeDegrees: 900,
        SteerLockDegrees: 270,
        TimeDeltaBestSelf: mock.delta / 100,
    } as IShared;

    return (
        <div className='relative h-screen w-screen overflow-hidden' style={checker}>
            <HudLayer state={state}/>
            <ControlPanel title="Design mode" mock={mock} onMockChange={setMock}/>
        </div>
  );
}


/*
!!! The official sample lets you paste a JSON dump (Shift+d in-game copies it) 
so mock data becomes a real race snapshot !!!

in game, press Shift+d, open http://localhost:4000/?design and press Ctrl+V. 
All widgets then show that real data, and the sliders still override speed, RPM and gear.

// inside the component, replace the use of mockState with `base`:
const [base, setBase] = useState<IShared>(mockState);

useEffect(() => {
  const onPaste = (e: ClipboardEvent) => {
    try {
      const d = JSON.parse(e.clipboardData!.getData('Text'));
      if (d.DriverData) setBase(d);
    } catch {}
  };
  document.addEventListener('paste', onPaste);
  return () => document.removeEventListener('paste', onPaste);
}, []);

const state = {
  ...base,
  CarSpeed: kmh / 3.6,
  EngineRps: (rpmPct / 100) * base.MaxEngineRps,
  Gear: gear,
} as IShared;
*/