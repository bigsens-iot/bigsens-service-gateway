# Properties

| UUID | Property           | Type   | Description                                            |
|------|--------------------|--------|--------------------------------------------------------|
|      | State              | bool   | `true` - Device is ON, `false` - Device is OFF |
|      | Temperature        | int    | Represents the temperature in degrees Celsius |
|      | Humidity           | uint   | Represents the relative humidity in % |
|      | Alarm1             | bool   | `true` - Opened or alarmed, `false` - Closed or not alarmed         |
|      | Alarm2             | bool   | `true` - Opened or alarmed, `false` - Closed or not alarmed |
|      | Tamper             | bool   | `true` - Tampered, `false` - Not tampered |
|      | Battery            | bool   | `true` - Low battery, `false` - Battery OK |
|      | BatteryLevel       | uint   | Battery charge level in % |
|      | SupervisionReports | bool   | `true` - Reports, `false` - Does not report |
|      | RestoreReports     | bool   | `true` - Reports restore, `false` - Does not report restore |
|      | Trouble            | bool   | `true` - Trouble/Failure, `false` - OK |
|      | AC                 | bool   | `true` - AC/Mains fault, `false` - AC/Mains OK |
|      | Voltage            | uint   | Represents the L1 voltage in Volts (V) |
|      | Current            | uint   | Represents the L1 current in Amps (A) |
|      | ActivePower        | uint   | Represents the L1 active power in Watts (W) |
|      | On                 | method | Switch on device |
|      | Off                | method | Switch off device |
|      | Toggle             | method | Device toggling |
|      | ArmMode            | event  | `0x00` - Disarm<br>`0x01` - Arm Day/Home Zones Only<br>`0x02` - Arm Night/Sleep Zones Only<br>`0x03` - Arm All Zones |
|      | Emergency          | event  | `true` - Emergency situation, `false` - Everything is fine |
