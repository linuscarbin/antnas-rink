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
- [ ] Dockerfile för självhosting
- [ ] Coolify-konfiguration (docker-compose / env)
- [ ] README med deploy-instruktioner och env-variabler
- [ ] Privat GitHub-repo (antnas-rink)

## Test
- [x] Vitest för RBAC (publik/skyddad/admin)
- [x] Vitest för bokningens overlap-regler (intilliggande luckor tillåtna, zon-konflikter)
- [x] Vitest för ISO-vecka och zon-konstanter

## Fristående (ingen Manus-hosting)
- [ ] Egen e-post + lösenord-inloggning (bcrypt + JWT-cookie)
- [ ] Registrering + första ägaren blir admin
- [ ] Auth-router: register, login, logout, me
- [ ] Ta bort Manus OAuth-rutter och beroenden
- [ ] Ersätt Heartbeat-cron med självhostad node-cron i containern
- [ ] Ta bort Manus notification/storage-anrop och env-beroenden
- [ ] Rensa env-mall från Manus-variabler
- [ ] Uppdatera tester för ny auth
