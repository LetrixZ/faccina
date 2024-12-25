#!/bin/bash
docker buildx build --platform=linux/amd64,linux/arm64 -f ./docker/Dockerfile-compile-linux -o compile . &&
mv compile/linux_amd64/faccina faccina-linux-amd64 &&
mv compile/linux_arm64/faccina faccina-linux-arm64
