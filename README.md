# Antnäs Vinter

En fristående webbtjänst för byns vinteranläggningar i Antnäs: **hockeyrinken** och
**längdskidspåret**. Visar rinkstatus (plogad/spolad), spårstatus (draget +
spårskick), veckans jourer (plogjour/spoljour för rinken och en separat spårjour
för spåret), kontaktpersoner, bokning av rinken eller zoner, och en gemensam
anslagstavla/chatt. Helt självhostad — ingen extern plattform krävs utöver en
MySQL-databas och (valfritt) Resend för e-post.

## Funktioner

- **Rinkstatus** – stora färgkodade kort för *plogad* och *spolad* med tidsstämpel
  och namn på den som senast utförde åtgärden, plus aktuell utomhustemperatur
  (Open-Meteo, kräver ingen nyckel) som beslutsstöd för spolning.
- **Skidspår** – status för längdspåret: *draget* (med tidsstämpel + vem) och
  *spårskick* (Mycket bra/Bra/Hyfsat/Dåligt/Ej åkbart) plus notering om underlag.
- **Jourschema** – veckovis *plogjour* och *spoljour* för rinken samt en separat
  *spårjour* för skidspåret, med kontaktuppgifter. Tilldelade jourhavare kan anmäla
  förhinder direkt (admin meddelas via e-post).
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
| `DUTY_REMINDER_CRON` | Nej | Cron (5-fält, serverns tidszon) för jourpåminnelse (rink + spår). Standard `0 7 * * 1` (måndag 07:00). Tomt = av |
| `R2_ACCOUNT_ID` | Nej* | Cloudflare R2 account-id |
| `R2_ACCESS_KEY_ID` | Nej* | R2 access key id |
| `R2_SECRET_ACCESS_KEY` | Nej* | R2 secret access key |
| `R2_BUCKET` | Nej* | R2 bucket-namn för bilder |
| `R2_PUBLIC_URL` | Nej* | Publik URL där bucketen serveras via din domän, t.ex. `https://media.dindoman.se` |
| `R2_ENDPOINT` | Nej | Explicit S3-endpoint (annars härleds från account-id) |
| `RUN_MIGRATIONS` | Nej | Kör DB-migreringar automatiskt vid start. Standard på; `false` = av |
| `TZ` | Nej | Tidszon för cron-påminnelser. Docker-imagen sätter `Europe/Stockholm` |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Nej | Nycklar för push-notiser. Skapas automatiskt och sparas i databasen om de saknas |
| `VAPID_SUBJECT` | Nej | Kontakt för pushtjänsterna, `mailto:` eller `https:`. Standard: `PUBLIC_BASE_URL` eller avsändaradressen |
| `SNOW_ALERT_CRON` | Nej | När snövarningen körs (svensk tid). Standard `5 7 * * *`. Tomt = av |
| `SNOW_ALERT_CM` | Nej | Gräns för snövarning i cm senaste dygnet. Standard `5` |
| `UPLOAD_DIR` | Nej | Disk-fallback för bilder när R2 *inte* används. Standard `/data/uploads` |

\* R2-bilder: ange alla `R2_*` (utom valfri endpoint) för att lagra bilder i Cloudflare R2. Utan dem används disk (`UPLOAD_DIR`).

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
5. **Databasmigrering sker automatiskt:** Vid varje start kör appen alla
   väntande migreringar i `drizzle/` mot `DATABASE_URL` (med omförsök om
   databasen inte är uppe än). Inget manuellt `pnpm db:push` behövs. Stäng av
   med `RUN_MIGRATIONS=false` om du vill migrera manuellt.
6. **Starta:** Deploya. Appen serverar både frontend och API på samma port.
   Den self-hostade schemaläggaren startar automatiskt.
7. **Första kontot:** Gå till `/login`, välj *Skapa konto* och registrera dig —
   det blir admin. Lägg sedan in jourscheman och kontakter via adminpanelen.
8. **Bildlagring (Cloudflare R2):** Anslagstavlan laddar upp bilder till din
   R2-bucket via S3-API:t och serverar dem via din egen domän. Sätt `R2_ACCOUNT_ID`,
   `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` och `R2_PUBLIC_URL`
   (din domän kopplad till bucketen). Koppla domänen till bucketen i Cloudflare
   (R2 -> bucket -> Settings -> Custom Domains) och se till att objekten är
   publikt läsbara via den domänen.
    \
   Om R2 *inte* konfigureras faller appen tillbaka till disklagring i `UPLOAD_DIR`
   (montera då en persistent volym på `/data` i Coolify). Med R2 behövs ingen volym.

### docker-compose (lokalt / referens)

Ett `docker-compose.yml` finns med app + MySQL för att prova hela stacken lokalt:

```bash
JWT_SECRET=$(openssl rand -hex 32) docker compose up --build
```

## App och notiser (PWA)

Sajten är en installerbar webbapp med push-notiser – ingen App Store behövs.

- **Installera:** Android/Chrome: menyn → *Installera app*. iPhone: Safari →
  *Dela* → *Lägg till på hemskärmen* (notiser kräver iOS 16.4+ och att appen
  öppnas från hemskärmen). Guide finns på `/notiser`.
- **Notiser för alla (utan konto):** rinken nyspolad, spåret nydraget, ett gäng
  på väg (3+ incheckade samtidigt), rinken stängd.
- **Notiser för jourhavare:** jourpåminnelse, snövarning, förhinder i jouren.
- Inga notiser 22–07. Samma sorts notis skickas högst en gång per 2–3 timmar.
- Skickas direkt från servern via Web Push (VAPID) – ingen Firebase eller
  extern tjänst behövs. HTTPS krävs (Coolify ordnar det).

## Behörigheter

- **Besökare:** ser om rinken/spåret är åkbart, foton, schema, kontakter,
  bokningar, anslagstavla och *Regler & info*. Kan checka in med
  "Jag är på rinken nu" utan konto.
- **Inloggad användare:** bokar, skriver på anslagstavlan, anmäler förhinder.
- **Funktionär (jourhavare):** alla som admin kopplat som medlem på
  plog-/spoljour (rinken) eller spårjour (skidspåret) i år eller förra året.
  Markerar plogad/spolad/draget med foto, stänger rinken tillfälligt, ser
  *Funktionär*-sidan med guider (t.ex. förrådskod) samt tankning, kvitton och
  utlägg för sitt område. Behörigheten kontrolleras på servern.
- **Admin:** allt ovan för båda områdena + hanterar scheman, guider, kontakter,
  användare och bokningar via `/admin`. Gör en användare till admin under
  *Användare* i adminpanelen.

## Tester

```bash
pnpm test     # vitest: auth, RBAC, bokningslogik, ISO-vecka
pnpm check    # TypeScript typkontroll
pnpm build    # produktionsbygge
```
