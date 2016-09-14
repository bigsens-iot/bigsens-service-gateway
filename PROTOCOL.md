# Message protocol

All payloads and reply are in `json` format. The column `R` in the tables means mandatory `M` or optional `O` property. 

### SERVICE_ANNCE
Must be sent after connection to the `Root Service`.

**Event payload:**

* (_Object_): An object that contains information about the service. Properties in this object are given in the following table.  

    | Property     | R | Type   | Description                                            |
    |--------------|---|--------|--------------------------------------------------------|
    | guid         | M | string | 128-bit integer number used to identify service        |
    | name         | M | string | An service name recommended to be unique               |
    | version      | M | string | Verison in the format `major.minor[.build[.revision]]` |
    | description  | O | string | Service description                                    |
    | keywords     | O | string | Keyword can be used for further search                 | 

**Reply payload:**

* none

### DEVICE_STATE
Emit when a device state is changing.

**Event payload:**

* (_Object_): An object that contains information about the device state. Properties in this object are given in the following table.  

    | Property     | R | Type   | Description                                                   |
    |--------------|---|--------|---------------------------------------------------------------|
    | state        | M | uint8  | `0x00` new device discovered by service<br>`0x01` device is removed from service<br>`0x02`<br>`0x03`<br>`0x04`<br>`0xff`|
    | device       | M | object | An device object                                              |

**Reply payload:**

* none
