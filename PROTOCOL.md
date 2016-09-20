# Message protocol

All `Events` and `Request-Reply` payloads are in `json` format. The column `R` in the tables means mandatory `M` or optional `O` property.

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

## Entity structs

<a name="SERVICE_OBJECT"></a>
### Service object

| Property     | R | Type   | Description                                            |
|--------------|---|--------|--------------------------------------------------------|
| guid         | M | string | 128-bit integer number used to identify service; e.g. `a567e912-7ac9-471c-83ab-e8e22f992d8a` |
| name         | M | string | An service name recommended to be unique               |
| version      | M | string | Verison in the format `major.minor[.build[.revision]]` |
| description  | O | string | Service description                                    |
| keywords     | O | string | Keyword can be used for further search                 |

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

* (_Array_): An array that contains `device objects` with information about device.

<a name="DEVICE_STATE"></a>
### DEVICE_STATE
Emit when a device state is changing.

**Event payload:**

* (_Object_): An object that contains information about the device state. Properties in this object are given in the following table. 


    | Property     | R | Type   | Description                                                   |
    |--------------|---|--------|---------------------------------------------------------------|
    | state        | M | uint8  | `DS_JOIN : 0x00` New device discovered by service<br>`DS_LEAVE : 0x01` Device is removed from service<br>`DS_ONLINE : 0x02` Device is online<br>`DS_OFFLINE : 0x03` Device is offline<br>`DS_CHANGE_VALUE : 0x04`<br> Device property has changed or event occurred<br>`DS_UNKNOWN : 0xff`                                           |
    | device       | M | object | An `device object`                                              |

