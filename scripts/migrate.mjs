import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { join } from "node:path";
import postgres from "postgres";

const encoder = new TextEncoder();
const ITERATIONS = 210_000;

const AUDIENCES = [
  {
    id: "aud_kmu",
    slug: "kmu",
    name: "KMU",
    description: "Kleine und mittlere Unternehmen, meist mit festem Entscheiderkreis.",
    phases: [
      {
        id: "phase_kmu_1",
        name: "Aufmerksamkeit",
        goal: "KMU-Entscheider nehmen die Marke wahr und verstehen das Angebot in einem Satz.",
        channels: "LinkedIn, Fachnewsletter, Google Ads",
        message: "Weniger Aufwand im Tagesgeschäft, messbar ab der ersten Woche.",
      },
      {
        id: "phase_kmu_2",
        name: "Überlegung",
        goal: "Interessierte vergleichen das Angebot und sehen den Nutzen für ihren Betrieb.",
        channels: "Webinare, Fallstudien, E-Mail-Serie",
        message: "So setzen Betriebe mit 10 bis 200 Mitarbeitenden das in 30 Tagen um.",
      },
      {
        id: "phase_kmu_3",
        name: "Entscheidung",
        goal: "Kaufbereite KMU buchen ein Gespräch oder fordern ein Angebot an.",
        channels: "Landingpage, Vertrieb, Retargeting",
        message: "Festes Angebot, klare Einführung, ein Ansprechpartner im Unternehmen.",
      },
    ],
  },
  {
    id: "aud_startup",
    slug: "startup",
    name: "Startup",
    description: "Gründerteams, die schnell prüfen und schlank starten wollen.",
    phases: [
      {
        id: "phase_startup_1",
        name: "Aufmerksamkeit",
        goal: "Gründerteams entdecken das Angebot im richtigen Moment.",
        channels: "LinkedIn, Community-Posts, Product Hunt",
        message: "Vom ersten Nutzer bis zur wiederholbaren Akquise.",
      },
      {
        id: "phase_startup_2",
        name: "Überlegung",
        goal: "Teams prüfen, ob das Produkt zu ihrer Wachstumsphase passt.",
        channels: "Demo-Videos, Founder-Newsletter, Vergleiche",
        message: "Schlank starten, ohne zuerst ein Marketingteam aufzubauen.",
      },
      {
        id: "phase_startup_3",
        name: "Entscheidung",
        goal: "Teams starten eine Testphase oder buchen eine Demo.",
        channels: "Demo-Formular, Onboarding-Mail, Partner",
        message: "In einer Woche live, ohne eigenes Setup-Projekt.",
      },
    ],
  },
];

const DEMO_USERS = [
  { id: "user_anna", name: "Anna Berger", email: "anna@wochenplaner.local" },
  { id: "user_ben", name: "Ben Krüger", email: "ben@wochenplaner.local" },
  { id: "user_chris", name: "Chris Novak", email: "chris@wochenplaner.local" },
];

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL fehlt");
  process.exit(1);
}

const client = postgres(url, { max: 1 });

try {
  await waitForDatabase(client);
  await migrate(drizzle(client), { migrationsFolder: join(process.cwd(), "drizzle") });
  await seed(client);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.end({ timeout: 5 });
}

async function waitForDatabase(sql) {
  let lastError;
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      await sql`select 1`;
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw lastError;
}

async function seed(sql) {
  const passwordHash = await hashPassword("demo");
  await sql.begin(async (tx) => {
    const existing = await tx`select id from users limit 1`;
    if (existing.length > 0) return;

    for (const user of DEMO_USERS) {
      await tx`insert into users (id, name, email, password_hash) values (${user.id}, ${user.name}, ${user.email}, ${passwordHash})`;
    }
    for (const audience of AUDIENCES) {
      await tx`insert into audiences (id, slug, name, description) values (${audience.id}, ${audience.slug}, ${audience.name}, ${audience.description})`;
      for (const [index, phase] of audience.phases.entries()) {
        await tx`insert into funnel_phases (id, audience_id, sort_order, name, goal, channels, message) values (${phase.id}, ${audience.id}, ${index + 1}, ${phase.name}, ${phase.goal}, ${phase.channels}, ${phase.message})`;
      }
    }
  });
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength),
      iterations: ITERATIONS,
    },
    key,
    256,
  );
  return `pbkdf2$${toHex(salt)}$${toHex(new Uint8Array(bits))}`;
}

function toHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
