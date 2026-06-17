# 🥛 Milk Price Calculator

A lightweight Progressive Web App (PWA) for tracking daily milk deliveries and generating monthly bills — built for Indian households and dairy vendors.

![Milk Price Calculator](farmer-calculating-the-milk-price.png)

## Features

- **Monthly billing** — supports up to 31-day date ranges
- **Per-day editing** — tap any row to adjust milk quantity or add a remark
- **Print / PDF** — generates a clean receipt layout for printing or saving
- **Save & share image** — export the bill as a PNG via the Web Share API
- **Bilingual** — full support for English and Hindi (हिंदी)
- **PWA** — installable on Android and iOS home screens, works offline

## Tech Stack

| Layer | Library |
|-------|---------|
| UI framework | AngularJS 1.8 |
| Styling | Bootstrap 5.3 |
| Image export | html2canvas 1.4 |
| Fonts | Google Fonts (Nunito, Noto Sans Devanagari) |
| Offline | Service Worker (`sw.js`) |

## Getting Started

No build step required — it's a plain HTML/JS/CSS app.

```bash
git clone https://github.com/<your-username>/milk-calculator.git
cd milk-calculator
# serve with any static file server, e.g.:
npx serve .
# or
python3 -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

> **Note:** The service worker requires HTTPS or `localhost` to register.

## Usage

1. Enter a **start date** and **end date** (max 31 days).
2. Set the **price per litre** and the **default daily quantity**.
3. Optionally enter the **buyer's name**.
4. Click **Generate Bill** — a day-by-day table appears.
5. Adjust individual days, add remarks, then **Print**, **Save Image**, or **Share**.

## Project Structure

```
milk-calculator/
├── index.html          # Single-page app shell
├── app.js              # AngularJS controller & logic
├── language.js         # English / Hindi translations
├── style.css           # Custom styles (Bootstrap overrides)
├── sw.js               # Service worker for offline support
├── manifest.json       # PWA manifest
├── appstore-images/    # Icons for Android & iOS
└── *.jpg / *.png       # Hero images
```

## Contributing

1. Fork the repo and create a branch: `git checkout -b feature/my-feature`
2. Make your changes and test in a browser.
3. Open a pull request with a clear description.

## License

MIT — see [LICENSE](LICENSE).
