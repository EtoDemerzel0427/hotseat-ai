# syntax=docker/dockerfile:1

# ---- whisper.cpp server and a speech model ---------------------------------
FROM debian:bookworm-slim AS whisper
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates git cmake build-essential curl \
    && rm -rf /var/lib/apt/lists/*
ARG WHISPER_REF=v1.9.5
RUN git clone --depth 1 --branch ${WHISPER_REF} https://github.com/ggml-org/whisper.cpp /whisper \
    && cmake -S /whisper -B /whisper/build -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF \
       -DWHISPER_BUILD_TESTS=OFF -DGGML_NATIVE=OFF \
    && cmake --build /whisper/build -j --target whisper-server
# small is a reasonable trade-off on CPU. Build with --build-arg WHISPER_MODEL=ggml-base-q5_1.bin for a faster one.
ARG WHISPER_MODEL=ggml-small-q5_1.bin
RUN mkdir /models && curl -L --fail -o /models/${WHISPER_MODEL} \
    https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${WHISPER_MODEL}

# ---- the app ------------------------------------------------------------------
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends g++ python3 ca-certificates libgomp1 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY bin ./bin
COPY server ./server
COPY scripts ./scripts
COPY public ./public
COPY problems ./problems
COPY prompts ./prompts
COPY --from=whisper /whisper/build/bin/whisper-server /usr/local/bin/whisper-server
COPY --from=whisper /models /opt/models

# Problems, sessions and prompts live in /data so they survive container upgrades.
RUN mkdir /data && chown node:node /data
USER node
ENV HOST=0.0.0.0 \
    PORT=4477 \
    HOTSEAT_HOME=/data \
    NO_OPEN=1
VOLUME /data
EXPOSE 4477
CMD ["sh", "-c", "WHISPER_MODEL=${WHISPER_MODEL:-$(ls /opt/models/*.bin | head -n 1)} exec node bin/cli.mjs --no-open"]
