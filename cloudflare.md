# Cloudflare Pages Deployment Guide

To deploy this Angular game to Cloudflare Pages, follow these steps:

## 1. Prepare for Deployment
The project is already configured for a static build, which is ideal for Cloudflare Pages.

## 2. Cloudflare Dashboard Setup
1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
3. Select your repository.
4. In the **Build settings** section, use the following configuration:
   - **Framework preset**: `Angular`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist/app/browser`
   - **Root directory**: (Leave empty unless your app is in a subfolder)

## 3. Environment Variables
If you use the Gemini API, add your API key in the Cloudflare Pages dashboard:
1. Go to your Pages project **Settings** > **Environment variables**.
2. Add `GEMINI_API_KEY` with your secret key.

## 4. SPA Routing
I have already added a `public/_redirects` file. Cloudflare Pages will automatically use this to ensure that deep links (like `/lobby`) work correctly by redirecting them to `index.html`.

## 5. Build & Deploy
Click **Save and Deploy**. Cloudflare will build your app and provide you with a `.pages.dev` URL.
