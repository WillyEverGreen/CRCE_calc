# CRCE Result Scraper

A full-stack Next.js application to scrape and display student results from the CRCE Contineo portal.

## Features

- **Serverless Scraping**: Uses Playwright Core + @sparticuz/chromium to run on Vercel Serverless Functions.
- **Modern UI**: Built with Next.js, Tailwind CSS, and a clean "Emerald" theme.
- **Responsive**: Works great on mobile and desktop.

## Setup & Installation

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Run Locally

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

> **Note for Local Dev**: The app uses the `playwright` package locally (which includes browser binaries) and `@sparticuz/chromium` in production. Ensure `playwright` is installed in `devDependencies`.

## Deployment (Vercel)

This app is designed to be deployed 100% on Vercel.

1. Push the `frontend` folder (or the root if you prefer) to GitHub.
2. Import the project into Vercel.
3. **Important**: Set the **Root Directory** to `frontend` in Vercel Project Settings.
4. Deploy!

Vercel will automatically detect the Next.js app and deploy the API routes as serverless functions.

### Troubleshooting Vercel Deployment

- **Timeout**: Scraping can take time. If you hit the 10s timeout on the Free tier, you might need to upgrade to Pro (60s timeout) or optimize the scraping logic.
- **Memory**: Chromium is heavy. If you see memory errors, ensure you are using the `@sparticuz/chromium` package (which we are).
