# Antnäs Hockeyrink

En fristående webbtjänst för att sköta byns hockeyrink i Antnäs. Visar rinkstatus
(plogad/spolad), veckans plog- och spoljour, kontaktpersoner, bokning av rinken
eller zoner, och en gemensam anslagstavla/chatt. Helt självhostad — ingen extern
plattform krävs utöver en MySQL-databas och (valfritt) Resend för e-post.

## Funktioner

- **Rinkstatus** – stora färgkodade kort för *plogad* och *spolad* med tidsstämpel
  och namn på den som senast utförde åtgärden, plus aktuell utomhustemperatur
  (Open-Meteo, kräver ingen nyckel) som beslutsstöd för spolning.
- **Jourschema** – veckovis *plogjour* och *spoljour* med kontaktuppgifter, synligt
  för alla. Tilldelade jourhavare kan anmäla förhinder direkt.
- **Kontaktpersoner** – lista med roller och telefon/e-post.
- **Bokning** – boka *hela rinken*, *ena änden* eller *halva rinken* för tidsluckor,
  med 7-dagarsöversikt och krockkontroll per zon.
- **Anslagstavla** – gemensam tråd, alla kan läsa, inloggade kan skriva
  (uppdateras nära realtid via polling).
- **Tre behörighetsnivåer** – besökare (läser allt), inloggad (uppdatera status,
  boka, chatta, anmäla förhinder) och admin (hanterar scheman, kontakter,
  användare och bokningar).
- **E-postnotiser** – automatisk veckopåminnelse till jourhavare och konfliktlarm
  till admin via Resend.

## Teknik

- Frontend: React 19, Vite, Tailwind 4, tRPC.
- Backend: Express + tRPC, Drizzle ORM mot MySQL.
- Auth: egen e-post + lösenord (bcrypt) med JWT-sessionscookie.
- Schemaläggning: self-hosted `node-cron` i samma process.
- Allt körs som **en enda Node-process** i en Docker-container.

## Köra lokalt

```bash
pnpm install
cp env.sample.txt .env   # fyll i värden
pnpm db:push             # skapar tabeller i din MySQL
pnpm dev                 # startar på http://localhost:3000
```

Det **första kontot som registreras blir automatiskt administratör** (ägare).

## Miljövariabler

| Variabel | Krävs | Beskrivning |
|---|---|---|
| `DATABASE_URL` | Ja | MySQL-anslutning, t.ex. `mysql://user:pass@host:3306/antnas` |
| `JWT_SECRET` | Ja | Hemlighet för sessionscookies. Generera: `openssl rand -hex 32` |
| `NODE_ENV` | Ja | Sätt till `production` i drift |
| `PORT` | Nej | Standard 3000 (Coolify sätter ofta detta automatiskt) |
| `RESEND_API_KEY` | Nej* | Resend API-nyckel för e-post. Utan denna loggas notiser i stället för att skickas |
| `MAIL_FROM` | Nej | Avsändaradress, t.ex. `Antnäs Hockeyrink <noreply@dindomän.se>` |
| `PUBLIC_BASE_URL` | Nej | Publik URL till sajten (för e-postlänkar) |
| `DUTY_REMINDER_CRON` | Nej | Cron (5-fält, serverns tidszon) för jourpåminnelse. Standard `0 7 * * 1` (måndag 07:00). Tomt = av |

\* Rekommenderas för att jourpåminnelser och konfliktlarm ska skickas.

## Deploy via Coolify

1. **Skapa databas:** Lägg till en MySQL-resurs i Coolify (eller använd en
   befintlig). Notera anslutningssträngen.
2. **Ny applikation:** Skapa en applikation från detta Git-repo. Coolify
   upptäcker `Dockerfile` automatiskt (Build Pack: Dockerfile).
3. **Miljövariabler:** Lägg in variablerna i tabellen ovan under
   *Environment Variables*. Minst `DATABASE_URL`, `JWT_SECRET` och
   `NODE_ENV=production`. Lägg till `RESEND_API_KEY` för e-post.
4. **Port:** Containern lyssnar på `PORT` (default 3000). Låt Coolifys proxy peka
   dit och aktivera HTTPS/domän.
5. **Migrera databasen:** Kör en gång `pnpm db:push` mot din databas. Kör detta
   **lokalt** (eller från valfri maskin med dev-beroenden installerade) med
   produktionens `DATABASE_URL` satt i miljön:
   ```bash
   DATABASE_URL="mysql://..." pnpm db:push
   ```
   (Produktions-imagen är avsiktligt slimmad och innehåller inte dev-verktyget
   `drizzle-kit`, så migrering körs utanför containern.)
6. **Starta:** Deploya. Appen serverar både frontend och API på samma port.
   Den self-hostade schemaläggaren startar automatiskt.
7. **Första kontot:** Gå till `/login`, välj *Skapa konto* och registrera dig —
   det blir admin. Lägg sedan in jourscheman och kontakter via adminpanelen.

### docker-compose (lokalt / referens)

Ett `docker-compose.yml` finns med app + MySQL för att prova hela stacken lokalt:

```bash
JWT_SECRET=$(openssl rand -hex 32) docker compose up --build
```

## Behörigheter

- **Besökare:** ser status, schema, kontakter, bokningar och anslagstavla.
- **Inloggad användare:** uppdaterar status, bokar, chattar, anmäler förhinder.
- **Admin:** allt ovan + hanterar scheman, kontakter, användare och bokningar via
  `/admin`. Gör en användare till admin under *Användare* i adminpanelen.

## Tester

```bash
pnpm test     # vitest: auth, RBAC, bokningslogik, ISO-vecka
pnpm check    # TypeScript typkontroll
pnpm build    # produktionsbygge
```
