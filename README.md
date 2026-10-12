# UnlimitedWeb — hub projektów

Hub w stylu sklepu z aplikacjami, w stylu **liquid glass** z animacjami. Dane to **prawdziwe repozytoria z GitHub API**.

## Pliki

- `index.html` — hub (top bar, taby języków, chipsy, Projekt dnia, półki)
- `styles.css` — liquid glass + układ Play + animacje (aurora, tilt, wejścia)
- `main.js` — render, filtrowanie, Projekt dnia, tilt
- `github.js` — GitHub API (top repo, Projekt dnia ≥100k ★) + cache + fallback
- `data.js` — języki/kolory, filtry gwiazdek, kuratorowany fallback (≥100k ★)
- `supabase.js` — projekty z bazy + auth (login) + `addProject`
- `store.js` — projekty dodane lokalnie (gdy brak bazy)
- `admin.html` / `admin.js` — panel: logowanie + dodawanie projektu
- `.github/workflows/` — Pages + Releases

## Projekt GitHub dnia

`github.js` pobiera repo z `stars:>=100000`, wybiera jedno deterministycznie per dzień (`dayIndex % length`), cache 3 h. Przycisk „Losuj inne" losuje z puli ≥100k.

## Admin

`/admin.html`: logowanie (Supabase Auth) → formularz „Dodaj projekt" → zapis do tabeli `projects`.
Jeśli Supabase nie jest skonfigurowany, dodane projekty trafiają do `localStorage` i i tak pokazują się w hubie.

## Dane / migracje

Wymaga tabel `projects`, `waitlist`, `profiles` oraz polityk RLS. Migracje: `../sql/001..005` (m.in. `005_admin.sql` dla zapisu przez zalogowanych).
