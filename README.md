# Marketing-Wochenplaner

Der Wochenplaner hilft einem Marketingteam, den Funnel für **KMU** und **Startup** zu pflegen und die nächsten vier Kalenderwochen im Kanban zu planen. Jede Person hat zusätzlich eine private Aufgabenliste, die sie in diese Wochen ziehen kann.

## Lokal mit Docker

```bash
docker compose up --build
```

Die App läuft danach auf [http://localhost:3000](http://localhost:3000). Postgres liegt im Compose-Netz und behält die Daten im Volume `pgdata`.

## Lokal ohne App-Image

```bash
docker compose up db
cp .env.example .env.local
npm install
npm run dev
```

Die Datenbank ist dann auf dem Host unter Port `5433` erreichbar. Im Container bleibt es Port `5432`.

`npm run dev` legt das Schema beim Start an. Demo-Nutzer entstehen nur, solange die Nutzertabelle leer ist.

## Demo-Zugang

Passwort für alle drei Personen: `demo`

- Anna Berger · `anna@wochenplaner.local`
- Ben Krüger · `ben@wochenplaner.local`
- Chris Novak · `chris@wochenplaner.local`

## Coolify

Zwei Ressourcen im selben Coolify-Projekt:

1. **PostgreSQL** über die Datenbankvorlage anlegen. Die interne URL verwenden, die im Docker-Netz von Coolify erreichbar ist.
2. **Application** aus diesem Git-Repo, Build Pack **Dockerfile**. Unter **Ports Exposes** `3000` eintragen.

Umgebungsvariablen der Anwendung:

| Variable | Inhalt |
| --- | --- |
| `DATABASE_URL` | Interne Postgres-URL aus Schritt 1, nicht `localhost` |
| `SESSION_SECRET` | Langer Zufallswert |

Health Check: Pfad `/api/health`, der Container antwortet mit 200, sobald die Datenbank erreichbar ist. Domain und HTTPS über den Coolify-Proxy zuweisen.

Die App lauscht auf `0.0.0.0` und `PORT` (Standard 3000) und zusätzlich auf Port **80**. Ohne den Port 80 zeigt Coolify beim Aufruf der Domain nur `404 page not found`, weil der Proxy standardmäßig Port 80 im Container anspricht. In der Domain-Angabe von Coolify beides möglich: `https://deine-domain` oder `https://deine-domain:3000`. Nach dieser Änderung neu deployen.

Beim Start führt die App die Drizzle-Migration aus `drizzle/` aus und legt die Demo-Nutzer nur an, wenn noch niemand existiert. Ein Redeploy behält damit Wochenpläne und Funnel. Ein Volume an der App ist nicht nötig, weil alle Daten in Postgres liegen.

Hinter dem Coolify-Proxy wird das Anmelde-Cookie als `Secure` gesetzt, sobald `X-Forwarded-Proto` den Wert `https` hat. Lokal über HTTP bleibt das Cookie ohne dieses Flag, damit die Anmeldung auf `localhost` funktioniert.
