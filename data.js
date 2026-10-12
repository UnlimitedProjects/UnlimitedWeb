export const MIN_STARS_FEATURED = 100000;

export const STAR_FILTERS = [
  { id: "all", label: "Wszystkie", min: 0 },
  { id: "100k", label: "100k+ ★", min: 100000 },
  { id: "50k", label: "50k+ ★", min: 50000 },
  { id: "20k", label: "20k+ ★", min: 20000 },
  { id: "10k", label: "10k+ ★", min: 10000 },
];

export const LANG_COLORS = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572a5",
  Go: "#00add8",
  Rust: "#dea584",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Shell: "#89e051",
  Ruby: "#701516",
  PHP: "#4f5d95",
  Swift: "#f05138",
  Kotlin: "#a97bff",
  Dart: "#00b4ab",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Jupyter: "#da5b0b",
  Vue: "#41b883",
  Zig: "#ec915c",
};

export const FALLBACK_COLOR = "#7c5cff";

export const accentFor = (lang) => LANG_COLORS[lang] || FALLBACK_COLOR;

export const CURATED = [
  { name: "free-programming-books", owner: "EbookFoundation", stars: 356000, language: "HTML", description: "Ksiazki i materialy do nauki programowania, za darmo.", url: "https://github.com/EbookFoundation/free-programming-books" },
  { name: "freeCodeCamp", owner: "freeCodeCamp", stars: 412000, language: "TypeScript", description: "Ucz sie kodowac za darmo — interaktywne lekcje i projekty.", url: "https://github.com/freeCodeCamp/freeCodeCamp" },
  { name: "awesome", owner: "sindresorhus", stars: 336000, language: "Markdown", description: "Kuratorowana lista niesamowitych rzeczy.", url: "https://github.com/sindresorhus/awesome" },
  { name: "public-apis", owner: "public-apis", stars: 322000, language: "Python", description: "Kolekcja darmowych API dla projektow.", url: "https://github.com/public-apis/public-apis" },
  { name: "coding-interview-university", owner: "jwasham", stars: 312000, language: "Markdown", description: "Plan nauki na rozmowy rekrutacyjne w big tech.", url: "https://github.com/jwasham/coding-interview-university" },
  { name: "developer-roadmap", owner: "kamranahmedse", stars: 302000, language: "TypeScript", description: "Sciezki rozwoju dla programistow, krok po kroku.", url: "https://github.com/kamranahmedse/developer-roadmap" },
  { name: "system-design-primer", owner: "donnemartin", stars: 286000, language: "Python", description: "Nauka projektowania duzych systemow.", url: "https://github.com/donnemartin/system-design-primer" },
  { name: "react", owner: "facebook", stars: 232000, language: "JavaScript", description: "Biblioteka do budowania interfejsow uzytkownika.", url: "https://github.com/facebook/react" },
  { name: "vue", owner: "vuejs", stars: 209000, language: "TypeScript", description: "Progresywny framework JavaScript.", url: "https://github.com/vuejs/vue" },
  { name: "project-based-learning", owner: "practical-tutorials", stars: 201000, language: "Markdown", description: "Nauka przez budowanie projektow.", url: "https://github.com/practical-tutorials/project-based-learning" },
  { name: "TheAlgorithms-Python", owner: "TheAlgorithms", stars: 196000, language: "Python", description: "Wszystkie algorytmy zaimplementowane w Pythonie.", url: "https://github.com/TheAlgorithms/Python" },
  { name: "tensorflow", owner: "tensorflow", stars: 191000, language: "C++", description: "Framework do uczenia maszynowego.", url: "https://github.com/tensorflow/tensorflow" },
  { name: "linux", owner: "torvalds", stars: 187000, language: "C", description: "Jadro Linuksa.", url: "https://github.com/torvalds/linux" },
  { name: "ohmyzsh", owner: "ohmyzsh", stars: 177000, language: "Shell", description: "Framework do konfiguracji Zsh.", url: "https://github.com/ohmyzsh/ohmyzsh" },
  { name: "bootstrap", owner: "twbs", stars: 172000, language: "JavaScript", description: "Najpopularniejszy framework CSS.", url: "https://github.com/twbs/bootstrap" },
  { name: "flutter", owner: "flutter", stars: 167000, language: "Dart", description: "Zestaw do budowania aplikacji na wiele platform.", url: "https://github.com/flutter/flutter" },
  { name: "vscode", owner: "microsoft", stars: 166000, language: "TypeScript", description: "Edytor kodu od Microsoftu.", url: "https://github.com/microsoft/vscode" },
  { name: "ollama", owner: "ollama", stars: 145000, language: "Go", description: "Uruchamiaj duze modele jezykowe lokalnie.", url: "https://github.com/ollama/ollama" },
  { name: "next.js", owner: "vercel", stars: 132000, language: "TypeScript", description: "Framework React do produkcji.", url: "https://github.com/vercel/next.js" },
  { name: "rust", owner: "rust-lang", stars: 102000, language: "Rust", description: "Jezyk systemowy skupiony na bezpieczenstwie.", url: "https://github.com/rust-lang/rust" },
];
