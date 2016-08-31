FROM mazzolino/armhf-ubuntu:latest
MAINTAINER Constantin Alexandrov <ca@bigsens.com>

LABEL arch="armv7"
LABEL type="service"

# service section
LABEL service.name="Root Service"
LABEL service.guid="17acd140-ca09-4c73-8c30-a962db066b05"
LABEL service.version="0.1"

COPY bin /root

ENTRYPOINT ["/root/service-gateway.linux.armv7.bin"]

EXPOSE 13777