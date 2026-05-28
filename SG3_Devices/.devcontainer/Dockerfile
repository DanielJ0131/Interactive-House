FROM rust:slim-trixie

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        build-essential \
        ca-certificates \
        curl \
        git \
        pkg-config \
        cmake \
        ninja-build \
        make \
        python3 \
        python3-pip \
        libssl-dev \
        libudev-dev \
        avr-libc \
        gcc-avr \
        binutils-avr \
        avrdude \
    && rm -rf /var/lib/apt/lists/*

ENV CARGO_HOME=/root/.cargo
ENV RUSTUP_HOME=/root/.rustup
ENV PATH=${CARGO_HOME}/bin:${PATH}

RUN if ! command -v rustup >/dev/null 2>&1; then \
        curl https://sh.rustup.rs -sSf | sh -s -- -y --profile minimal; \
        . "$CARGO_HOME/env"; \
    fi; \
    rustup toolchain install stable; \
    rustup toolchain install nightly; \
    rustup default stable; \
    rustup component add rustfmt clippy; \
    rustup +nightly component add rust-src llvm-tools-preview; \
    rustup +nightly target add avr-none; \
    cargo install cargo-binutils --locked

RUN chmod +x /workspaces/*/arduino-rust/scripts/*.sh 2>/dev/null || true
