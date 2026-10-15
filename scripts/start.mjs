import { spawn, spawnSync } from "node:child_process";
import http from "node:http";

const migrate = spawnSync(process.execPath, ["scripts/migrate.mjs"], { stdio: "inherit" });
if (migrate.status !== 0) process.exit(migrate.status ?? 1);

const port = Number(process.env.PORT || 3000);
const child = spawn(process.execPath, ["server.js"], {
  stdio: "inherit",
  env: { ...process.env, HOSTNAME: "0.0.0.0", PORT: String(port) },
});

function stop(signal) {
  child.kill(signal);
}

process.on("SIGTERM", () => stop("SIGTERM"));
process.on("SIGINT", () => stop("SIGINT"));
child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

if (port === 80) {
  console.log("Die App lauscht auf 0.0.0.0:80.");
} else {
  const proxy = http.createServer((request, response) => {
    const upstream = http.request(
      {
        host: "127.0.0.1",
        port,
        path: request.url,
        method: request.method,
        headers: request.headers,
      },
      (upstreamResponse) => {
        response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
        upstreamResponse.pipe(response);
      },
    );
    upstream.on("error", () => {
      if (!response.headersSent) response.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
      response.end("Die Anwendung startet noch.");
    });
    request.pipe(upstream);
  });
  proxy.on("error", (error) => {
    console.error(`Port 80 konnte nicht geöffnet werden: ${error.message}`);
  });
  proxy.listen(80, "0.0.0.0", () => {
    console.log(`Die App lauscht auf 0.0.0.0:${port} und zusätzlich auf 0.0.0.0:80 für den Coolify-Proxy.`);
  });
}
