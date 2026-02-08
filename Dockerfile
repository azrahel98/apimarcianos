FROM denoland/deno:latest

WORKDIR /app
COPY deno.json* import_map.json* ./

RUN deno cache main.ts || true

COPY . .

EXPOSE 8080

CMD ["run", "--allow-net", "--allow-env", "--allow-read", "main.ts"]