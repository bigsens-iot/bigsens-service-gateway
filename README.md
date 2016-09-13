# Service Gateway
Implementation of message pattern for microservices communication. Based on pure TCP sockets.

<p align="center">
  <img src="/resources/images/message-pattern.png">
</p>

## Routing principes

Service address format is `remote_address : remote_port`. After connection the root service assigns the port to a new service and puts new record to the routing table. Below is the example of the routing table and a few possible services...

| # | Service address | Endpoint name    | Message cache         |
|---|-----------------|------------------|-----------------------|
| 1 | 0.0.0.0:1000    | [root](https://github.com/bigsens-iot/bigsens-service-gateway/tree/master/lib/services/root-service) | `[ msg1, msg2, ... ]` |
| 2 | 0.0.0.0:1001    | [zigbee.cc2530/31](https://github.com/bigsens-iot/zigbee-service) | `[ msg1, msg2, ... ]` |
| 3 | 0.0.0.0:1002    | belkin.wemo      | `[ msg1, msg2, ... ]` |
| 4 | 0.0.0.0:1003    | lg.smarttv       | `[ msg1, msg2, ... ]` |
| 5 | 0.0.0.0:1004    | [proxy.ws](https://github.com/bigsens-iot/bigsens-service-gateway/tree/master/lib/services/root-service) | `[ msg1, msg2, ... ]` |
| 6 | 0.0.0.0:1005    | goog.voicectrl   | `[ msg1, msg2, ... ]` |
| 7 | 0.0.0.0:1006    | usb.3gmod        | `[ msg1, msg2, ... ]` |
| 8 | 0.0.0.0:1007    | ui.base          | `[ msg1, msg2, ... ]` |
| . | ...             | ...              | ...                   |
