# UnlimitedWeb — strona

Statyczny frontend (HTML/CSS/JS) na **Supabase**. Bez frameworka, bez build-stepu.

## Pliki

- `index.html` — struktura strony
- `styles.css` — tokeny + komponenty (Terminal Broadsheet)
- `main.js` — interakcje (motyw, liczniki, formularz)
- `supabase.js` — klient Supabase (anon key)
- `config.js` — URL + anon key (publiczne). Wzorzec: `config.example.js`
- `.github/workflows/` — deploy na GitHub Pages + Releases

## Uruchomienie lokalne

```powershell
npx serve web
# albo
python -m http.server 8080 --directory web
```

## Deploy

- **Pages**: push na `main` → workflow `pages.yml` publikuje stronę.
- **Releases**: tag `v*` (np. `git tag v1.0.0 && git push origin v1.0.0`) → workflow `release.yml` tworzy Release ze spakowaną stroną.

## Backend

Tabele i RLS definiują migracje w `sql/` (u studia). Front używa wyłącznie `SUPABASE_ANON_KEY` i polityk RLS — nigdy `service_role`.
