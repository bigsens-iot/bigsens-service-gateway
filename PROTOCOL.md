# Message protocol

All `Events` and `Request-Reply` payloads are in `json` format. The column `R` in the tables means mandatory `M` or optional `O` property.

## Entity

* [Message](#)
* [Machine](#)
* [Service](#SERVICE_OBJECT)
* [Device](#DEVICE_OBJECT)

## Messages 

* [SERVICE_ANNCE](#SERVICE_ANNCE)
* [SERVICE_INFO](#)
* [SERVICE_READY](#)
* [SERVICE_LIST](#SERVICE_LIST)
* [MESSAGE_REGISTER](#MESSAGE_REGISTER)
* [MESSAGE_DISCOVER](#)
* [MACHINE_INFO](#MACHINE_INFO)
* [DEVICE_LIST](#DEVICE_LIST)
* [DEVICE_STATE](#DEVICE_STATE)
* [DEVICE_GET_INFO_BY_ID](#)
* [DEVICE_GET_EXTENDED_INFO_BY_ID](#)
* [DEVICE_READ_ATTRIBUTE](#)
* [DEVICE_WRITE_ATTRIBUTE](#)
* [PAIRING_MODE](#)

## Devices

* [DT_SMART_PLUG : 81](#)
* [DT_TEMPERATURE_SENSOR : 770](#DT_TEMPERATURE_SENSOR)
* [DT_IAS_ANCILLARY_CONTROL_EQUIPMENT : 1025](#)
* [DT_MOTION_SENSOR : 1029](#DT_IAS_ZONE_DEVICE)
* [DT_CONTACT_SWITCH : 1030](#DT_IAS_ZONE_DEVICE)
* [DT_FIRE_SENSOR : 1031](#DT_IAS_ZONE_DEVICE)
* [DT_WATER_SENSOR : 1032](#DT_IAS_ZONE_DEVICE)
* [DT_GAS_SENSOR : 1033](#DT_IAS_ZONE_DEVICE)

## Entity description

<a name="SERVICE_OBJECT"></a>
### Service object

| Property     | R | Type   | Description                                            |
|--------------|---|--------|--------------------------------------------------------|
| guid         | M | string | 128-bit integer number used to identify service; e.g. `a567e912-7ac9-471c-83ab-e8e22f992d8a` |
| name         | M | string | An service name recommended to be unique               |
| version      | M | string | Verison in the format `major.minor[.build[.revision]]` |
| description  | O | string | Service description                                    |
| keywords     | O | string | Keyword can be used for further search                 |

<a name="DEVICE_OBJECT"></a>
### Device object

| Property     | R | Type   | Description                                            |
|--------------|---|--------|--------------------------------------------------------|
| guid         | M | string | 128-bit integer number used to identify device         |
| type         | M | int    | An device type. All types are listed in the protocol.js |
| status       | M | string | Current device status `unknown`, `online`, `offline`|
| attributes   | M | object | Device attributes depended on the [device type](#DEVICE_TYPES) |
| methods      | O | object | Device methods e.g. `on/off`, `change level`                 |
| spec         | O | object | Specific device information depends on manufacturer, protocol, etc. |

## Messages description

<a name="SERVICE_ANNCE"></a>
### SERVICE_ANNCE
Service announcement. Must be sent after connection to the `Root Service`.

**Event payload:**

* (_Object_): An [objects](#SERVICE_OBJECT) that contains information about the service.  

<a name="SERVICE_LIST"></a>
### SERVICE_LIST
Collecting information about active services on the host machine.

**Request payload:**

* none

**Reply payload:**

* (_Array_): An array that contains [objects](#SERVICE_OBJECT) with information about services.

<a name="MESSAGE_REGISTER"></a>
### MESSAGE_REGISTER
Add messages to the endpoint registry. `Root Service` will to use that information for message routing. Other services can to discover messages associated with the target service. 

**Event payload:**

* (_Object_): An object that contains messages for storing to the message registry.
```js
{
	DEVICE_STATE : '*',
	PERMIT_JOIN : '*',
	DEVICE_READ_ATTRIBUTE : '*',
	DEVICE_LIST : '*',
	DEVICE_GET_INFO_BY_ID : '*',
    ...
}
```

<a name="MACHINE_INFO"></a>
### MACHINE_INFO
Information about host machine with resources info.

**Event payload:**

* (_Object_): An object that contains information about host machine. Properties in this object are given in the following table.

    | Property    | R | Type   | Description                                                   |
    |-------------|---|--------|---------------------------------------------------------------|
    | guid        | M | string | 128-bit integer number used to identify host machine          |
    | hostname    | M | string | Name of the host machine                                      |
    | cpuinfo     | M | object | Machine CPU information                                               |  
    | meminfo     | M | object | ```{ totalMem : 1002.16796875, freeMem : 708.671875, free : 70.71 }``` |
    | nwkifaces   | M | object | List of network interfaces on the machine<br>```{ eth0 : [{ address : '192.168.0.100', netmask : '255.255.255.0', family : 'IPv4', mac : '22:c1:82:c1:60:be', internal : false }, ... ]}``` |

**Example**
```js
{
	guid : 'a567e912-7ac9-471c-83ab-e8e22f992d8a',
	hostname : 'bigsens',
	cpuinfo : { ... },
	meminfo : {
		totalMem : 1002.16796875,
		freeMem : 708.671875,
		free : 70.71
	},
	nwkifaces : {
		eth0 : [{
			address : '192.168.0.100',
			netmask : '255.255.255.0',
			family : 'IPv4',
			mac : '22:c1:82:c1:60:be',
			internal : false
		}, ... ]
	},
	...
}
```


<a name="DEVICE_LIST"></a>
### DEVICE_LIST
This message is used to collecting information about all devices from services. 

**Request payload:**

* none

**Reply payload:**

* (_Array_): An array that contains [device objects](#DEVICE_OBJECT) with information about device.

<a name="DEVICE_STATE"></a>
### DEVICE_STATE
Emit when a device state is changing.

**Event payload:**

* (_Object_): An object that contains information about the device state. Properties in this object are given in the following table. 


    | Property     | R | Type   | Description                                                   |
    |--------------|---|--------|---------------------------------------------------------------|
    | state        | M | uint8  | `DS_JOIN : 0x00` New device discovered by service<br>`DS_LEAVE : 0x01` Device is removed from service<br>`DS_ONLINE : 0x02` Device is online<br>`DS_OFFLINE : 0x03` Device is offline<br>`DS_CHANGE_VALUE : 0x04`<br> Device property has changed or event occurred<br>`DS_UNKNOWN : 0xff`                                           |
    | device       | M | object | An [device object](#DEVICE_OBJECT)                                       |


<a name="DEVICE_TYPES"></a>
## Devices description

<a name="DT_TEMPERATURE_SENSOR"></a>
### Temperature sensor

| Attribute    | R | Type | Description                                            |
|--------------|---|------|--------------------------------------------------------|
| Temperature  | M | int  | Represents the temperature in degrees Celsius. Range from -273.15°C to 327.67°C. |
| Humidity     | O | uint | Represents the relative humidity in %. Range from 0% to 100%. |
| Battery   | O | bool | `true` - Low battery, `false` - Battery OK |

**Example**
```js
{
	guid: '45016b7d-87af-4ded-8965-f28145a05dc9',
	type: 770, // DT_TEMPERATURE_SENSOR
	status: 'online',
	attributes: {
		Temperature: 27.45,
		Humidity: 53.99,
		Battery : false
	}
}
```
<a name="DT_IAS_ZONE_DEVICE"></a>
### Intruder Alarm System (IAS) device

| Attribute    | R | Type | Description                                            |
|--------------|---|------|--------------------------------------------------------|
| Alarm1         | M | bool |  `true` - Opened or alarmed, `false` - Closed or not alarmed         |
| Alarm2         | M | bool | `true` - Opened or alarmed, `false` - Closed or not alarmed |
| Tamper       | M | bool | `true` - Tampered, `false` - Not tampered|
| Battery   | M | bool | `true` - Low battery, `false` - Battery OK |
| SupervisionReports      | M | bool | `true` - Reports, `false` - Does not report |
| RestoreReports         | M | bool | `true` - Reports restore, `false` - Does not report restore |
| Trouble         | M | bool | `true` - Trouble/Failure, `false` - OK |
| AC         | M | bool |  `true` - AC/Mains fault, `false` - AC/Mains OK |

**Example**
```js
{
	guid : '0ef99605-9d37-4e45-8df7-91d4942cfc75',
	type : 1030, // DT_CONTACT_SWITCH
	status : 'online',
	attributes : {
		Alarm1 : false,
		Alarm2 : false,
		Tamper : false,
		Battery : false,
		SupervisionReports : false,
		RestoreReports : true,
		Trouble : null,
		AC : null
	}
}
```
