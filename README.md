# Service Gateway
Implementation of message pattern for microservices communication. Based on pure TCP sockets.

<p align="center">
  <img src="/resources/images/message-pattern.png">
</p>

## Microservices principles

The entire platform is based on microservice mechanism. Services can be developed on any programming language. Interaction between services works on pure TCP sockets and messaging pattern. All services are deployed to the host machine e.g. Raspberry Pi or BeagleBone.

Service address format is `remote_address : remote_port`. After connection the root service assigns the port to a new service and puts new record to the routing table. Below is the example of the routing table and a few possible services...

| # | Service address | Endpoint name    | Message cache         |
|---|-----------------|------------------|-----------------------|
| 1 | 0.0.0.0:1000    | [root](https://github.com/bigsens-iot/bigsens-service-gateway/tree/master/lib/services/root-service) | `[ msg1, msg2, ... ]` |
| 2 | 0.0.0.0:1001    | [zigbee.cc2530/31](https://github.com/bigsens-iot/zigbee-service) | `[ msg1, msg2, ... ]` |
| 3 | 0.0.0.0:1002    | belkin.wemo      | `[ msg1, msg2, ... ]` |
| 4 | 0.0.0.0:1003    | lg.smarttv       | `[ msg1, msg2, ... ]` |
| 5 | 0.0.0.0:1004    | [proxy.ws](https://github.com/bigsens-iot/bigsens-service-gateway/tree/master/lib/services/websocket-proxy) | `[ msg1, msg2, ... ]` |
| 6 | 0.0.0.0:1005    | goog.voicectrl   | `[ msg1, msg2, ... ]` |
| 7 | 0.0.0.0:1006    | usb.3gmod        | `[ msg1, msg2, ... ]` |
| 8 | 0.0.0.0:1007    | ui.base          | `[ msg1, msg2, ... ]` |
| . | ...             | ...              | ...                   |

Service identification based on the `Universally Unique IDentifier (UUID)` [RFC4122](https://tools.ietf.org/html/rfc4122) standard. Every service contains mandatory metadata like `UUID` and `Service Name`. Identification goes during connection between service and `Root Service`, it's called the service announcement with the message `SERVICE_ANNCE`. The `SERVICE_ANNCE` is a broadcast message and others services will be notified about new service.
