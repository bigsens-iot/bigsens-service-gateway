# Service Gateway
Implementation of message pattern for microservices communication. Based on pure TCP sockets.

<p align="center">
  <img src="/resources/images/message-pattern.png">
</p>

## Routing principes

Service address format is `remote_address : remote_port`. After connection the root service assigns the port to a new service and puts new record to the routing table. Below is the example of the routing table.

| # | Service address | Endpoint name   | Message cache         |
|---|-----------------|-----------------|-----------------------|
| 1 | 0.0.0.0:1000    | root            | `[ msg1, msg2, ... ]` |
| 2 | 0.0.0.0:1001    | zigbee          | `[ msg1, msg2, ... ]` |
| 3 | 1.0.0.1:1002    | proxy           | `[ msg1, msg2, ... ]` |
| 4 | 1.0.0.1:1000    | ui              | `[ msg1, msg2, ... ]` |