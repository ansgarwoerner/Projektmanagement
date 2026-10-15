import { spawn } from "node:child_process";
import http from "node:http";

const appPort = 3000;
const requestedPort = Number(process.env.PORT || appPort);
const proxyPorts = [...new Set([80, requestedPort])].filter((port) => port !== appPort && port > 0);

function createProxy() {
  return http.createServer((request, response) => {
    const upstream = http.request(
      {
        host: "127.0.0.1",
        port: appPort,
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
}

function listen(server, port) {
  return new Promise((resolve) => {
    server.once("error", (error) => {
      console.error(`Port ${port} konnte nicht geöffnet werden: ${error.message}`);
      resolve(false);
    });
    server.listen(port, "0.0.0.0", () => {
      console.log(`Lauscht auf 0.0.0.0:${port}`);
      resolve(true);
    });
  });
}

function dropPrivileges() {
  if (typeof process.getuid !== "function" || process.getuid() !== 0) return;
  process.setgroups([1001]);
  process.setgid(1001);
  process.setuid(1001);
}

for (const port of proxyPorts) {
  await listen(createProxy(), port);
}

dropPrivileges();

const migrate = spawn(process.execPath, ["scripts/migrate.mjs"], { stdio: "inherit" });
const migrateCode = await new Promise((resolve) => {
  migrate.on("exit", (code) => resolve(code ?? 1));
});

if (migrateCode !== 0) {
  const message =
    "Die Datenbank ist nicht erreichbar. In Coolify muss DATABASE_URL die interne Postgres-Adresse sein, nicht localhost.\n";
  await listen(
    http.createServer((request, response) => {
      if ((request.url ?? "").startsWith("/api/health")) {
        response.writeHead(503, { "content-type": "application/json" });
        response.end(JSON.stringify({ ok: false }));
        return;
      }
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end(message);
    }),
    appPort,
  );
  await new Promise(() => {});
}

const child = spawn(process.execPath, ["server.js"], {
  stdio: "inherit",
  env: { ...process.env, HOSTNAME: "0.0.0.0", PORT: String(appPort) },
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
