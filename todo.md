# Antnäs Hockeyrink – Projekt TODO

## Datamodell & backend
- [x] Schema: users (role), rinkStatus, dutySchedule (plogjour/spoljour), contacts, bookings, chatMessages
- [x] DB-hjälpfunktioner i server/db.ts
- [x] tRPC-router: status (publik läs, skyddad uppdatera)
- [x] tRPC-router: duty schedule (publik läs, admin redigera, skyddad flagga förhinder)
- [x] tRPC-router: contacts (publik läs, admin redigera)
- [x] tRPC-router: bookings (publik läs, skyddad skapa/avboka, admin hantera)
- [x] tRPC-router: chat (publik läs, skyddad skriva, polling för realtid)
- [x] tRPC-router: admin user management (lista, ändra roll)
- [x] RBAC: public / user / admin (adminProcedure)

## Frontend – publik sida
- [x] Isometrisk designstil (teal/blå/korall, vit bakgrund, rutnät, fet sans-serif)
- [x] Startsida: rinkstatus (plogad/spolad) med färgkodning + tidsstämpel + ansvarig
- [x] Automatisk utomhustemperatur (Open-Meteo)
- [x] Veckoschema (plogjour/spoljour) med kontaktinfo
- [x] Kontaktpersoner med roller och telefon
- [x] Bokningskalender (full rink / one end / half rink) + 7-dagarsöversikt
- [x] Chatt/anslagstavla med realtidsuppdatering (polling 3s; WebSocket möjligt vid alltid-på)
- [x] Felhantering på bokning och chatt
- [x] Inloggning/utloggning, mobilanpassning

## Frontend – admin
- [x] Adminpanel-layout
- [x] Hantera veckoscheman
- [x] Hantera kontaktpersoner
- [x] Hantera användarkonton (roller)
- [x] Hantera bokningar

## Notiser (e-post)
- [x] E-post via Resend API (env: RESEND_API_KEY, MAIL_FROM)
- [x] Schemalagd påminnelse till veckans plog-/spoljour (Heartbeat cron)
- [x] Konfliktlarm till admin när någon flaggar förhinder

## Deployment
- [x] Dockerfile för självhosting
- [x] Coolify-konfiguration (docker-compose / env-mall)
- [x] README med deploy-instruktioner och env-variabler
- [x] Privat GitHub-repo (linuscarbin/antnas-rink)

## Test
- [x] Vitest för RBAC (publik/skyddad/admin)
- [x] Vitest för bokningens overlap-regler (intilliggande luckor tillåtna, zon-konflikter)
- [x] Vitest för ISO-vecka och zon-konstanter

## Fristående (ingen Manus-hosting)
- [x] Egen e-post + lösenord-inloggning (bcrypt + JWT-cookie)
- [x] Registrering + första ägaren blir admin
- [x] Auth-router: register, login, logout, me, changePassword
- [x] Ta bort Manus OAuth-rutter och beroenden
- [x] Ersätt Heartbeat-cron med självhostad node-cron i containern
- [x] Ta bort Manus notification/storage-anrop och env-beroenden
- [x] Rensa env-mall från Manus-variabler
- [x] Uppdatera tester för ny auth (20 tester gröna)

## Antnäs Vinter – skidspår
- [x] Rebrand header/varumärke till "Antnäs Vinter"
- [x] Schema: trackStatus (draget, spårskick, notering) + skiDutySchedule (egen spårjour-grupp)
- [x] DB-hjälpfunktioner för spårstatus och spårjour
- [x] tRPC track-router: status (publik läs, skyddad uppdatera draget/skick)
- [x] tRPC skiDuty-router: publik läs, admin redigera, skyddad flagga förhinder
- [x] E-postpåminnelse även för spårjour (egen grupp)
- [x] Startsida: separat sektion för skidspår
- [x] Skidspårssida (status + spårjour-schema)
- [x] Admin: hantera spårjour
- [x] Vitest för spårlogik (22 tester gröna)
- [x] Pusha uppdatering till privat GitHub-repo (linuscarbin/antnas-rink)

## Anslagstavla – bilder + hela Antnäs Vinter
- [x] Schema: imageUrl på chatMessages
- [x] Backend: bilduppladdning till disk (UPLOAD_DIR), serveras via /uploads
- [x] Backend: validering (typ, storlek) + komprimering (sharp -> webp)
- [x] chat.post tar emot valfri bild
- [x] Frontend: bifoga/förhandsgranska/skicka bild i anslagstavlan
- [x] Visa bilder i tråden (klickbar/förstora)
- [x] Texter: anslagstavlan gäller hela Antnäs Vinter (rink + skidspår)
- [x] README + docker-compose: persistent volym i Coolify för uppladdningar
- [x] Pusha uppdatering till privat GitHub-repo

## Lagring via Cloudflare R2
- [x] R2-klient (S3 SDK) med env R2_* + publik domän-URL
- [x] Uppladdning skickar webp till R2, returnerar publik URL
- [x] Disk-fallback när R2 ej konfigurerat (dev) — verifierat
- [x] chat.post accepterar både R2- och /uploads-URL
- [x] README/compose/env: R2-konfiguration för Coolify
- [ ] Testa och pusha till GitHub
