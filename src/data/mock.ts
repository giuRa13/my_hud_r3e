import type IShared from "./r3eTypes";

const tires = <T,>(v: T) => ({ 
    FrontLeft: v, 
    FrontRight: v, 
    RearLeft: v, 
    RearRight: v 
});

const sectors = (a: number, b: number, c: number) => ({ 
    Sector1: a, 
    Sector2: b, 
    Sector3: c 
});

export const mock_state: any = {
    GamePaused: 0, 
    GameInMenus: 0, 
    GameInReplay: 0,

    TrackName: 'Nürburgring', LayoutName: 'GP',
    SessionType: 2,          // Race
    SessionPhase: 5,         // Green
    NumberOfLaps: 10,
    SessionTimeRemaining: -1,

    Position: 3, 
    PositionClass: 3,

    CompletedLaps: 4,
    LapDistanceFraction: 0.42,
    LapTimeCurrentSelf: 52.3, 
    LapTimeBestSelf: 98.4, 
    LapTimePreviousSelf: 99.1,
    SectorTimesCurrentSelf: sectors(30.1, 22.2, -1),

    TimeDeltaFront: 1.2, 
    TimeDeltaBehind: 0.8, 
    TimeDeltaBestSelf: -0.15,

    CarSpeed: 50,            // m/s
    EngineRps: 500,          // rad/s
    MaxEngineRps: 780,
    UpshiftRps: 740,
    Gear: 3, 
    NumGears: 6,

    Throttle: 0.8, 
    Brake: 0, 
    Clutch: 0, 
    SteerInputRaw: 0.1,
    
    BrakeBias: 0.56,

    FuelLeft: 42, 
    FuelCapacity: 80, 
    FuelPerLap: 2.9,

    TireWear: tires(0.95),
    TireGrip: tires(0.98),
    TirePressure: tires(165),
    TireTemp: tires({
        CurrentTemp: { Left: 80, Center: 85, Right: 82 },
        OptimalTemp: 85, 
        ColdTemp: 70, 
        HotTemp: 100,
    }),

    BrakeTemp: tires({ 
        CurrentTemp: 450, 
        OptimalTemp: 500, 
        ColdTemp: 300, 
        HotTemp: 800 
    }),

    Flags: { Yellow: 0, Blue: 0, Black: 0, Green: 0, Checkered: 0, White: 0 },

    NumCars: 3,

    DriverData: [
        { DriverInfo: { Name: 'Driver One', CarNumber: 7, ClassId: 1 }, Place: 1, LapDistance: 2100, TimeDeltaFront: 0, InPitlane: 0 },
        { DriverInfo: { Name: 'Driver Two', CarNumber: 12, ClassId: 1 }, Place: 2, LapDistance: 2050, TimeDeltaFront: 1.1, InPitlane: 0 },
        { DriverInfo: { Name: 'You', CarNumber: 33, ClassId: 1 }, Place: 3, LapDistance: 2000, TimeDeltaFront: 1.2, InPitlane: 0 },
    ],

} as unknown as IShared; // partial mock, to be expanded