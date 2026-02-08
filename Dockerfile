FROM denoland/deno:alpine

WORKDIR /app

COPY deno.json* import_map.json* ./
RUN deno cache main.ts || true


COPY . .

EXPOSE 8000

CMD ["run", "--allow-net", "--allow-env", "--env", "main.ts"]