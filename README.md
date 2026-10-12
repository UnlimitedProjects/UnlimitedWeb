# UnlimitedWeb — hub projektów

Statyczny hub w stylu sklepu z aplikacjami: wyszukiwarka, kategorie, wyróżniony projekt, półka „Polecane" i siatka kafelków. Bez frameworka, bez build-stepu.

## Pliki

- `index.html` — top bar (logo + szukajka), chipsy kategorii, wyróżniony, półka, siatka
- `styles.css` — tokeny + komponenty (karty, chipsy, baner)
- `main.js` — render, filtrowanie, motyw
- `data.js` — kategorie + dane zapasowe (gdy brak backendu)
- `supabase.js` — pobiera projekty z tabeli `projects`
- `config.js` — URL + anon key (publiczne)
- `.github/workflows/` — deploy na GitHub Pages + Releases

## Dane

Kafelki pochodzą z tabeli `projects` (Supabase, publiczny odczyt przez RLS). Jeśli baza jest pusta lub niedostępna, strona pokazuje dane zapasowe z `data.js`.

## lokalnie

```powershell
npx serve web
```

## Deploy

- Push na `main` → Pages publikuje stronę.
- Tag `v*` → Release ze spakowaną stroną.
