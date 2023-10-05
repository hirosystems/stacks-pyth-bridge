FROM rust:bullseye as build

WORKDIR /src

RUN apt update && apt install -y ca-certificates pkg-config libssl-dev libclang-11-dev

RUN rustup update 1.72.0 && rustup default 1.72.0

COPY ./relayer /relayer

WORKDIR /relayer

RUN mkdir /out

RUN cargo build --release

RUN cp target/release/stacks-pyth-relayer /out

FROM debian:bullseye-slim

RUN apt update && apt install -y ca-certificates libssl-dev

COPY --from=build /out/ /bin/

WORKDIR /workspace

ENTRYPOINT ["stacks-pyth-relayer"]
