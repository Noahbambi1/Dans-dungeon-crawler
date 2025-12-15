# Deployment Instructions

## GitHub Pages Setup

To deploy this game to GitHub Pages:

1. **Enable GitHub Pages in your repository:**
   - Go to your repository on GitHub: https://github.com/Noahbambi1/Dans-dungeon-crawler
   - Click on **Settings** tab
   - Scroll down to **Pages** in the left sidebar
   - Under **Source**, select **Deploy from a branch**
   - Choose **main** branch and **/ (root)** folder
   - Click **Save**

2. **The workflow file is already created** (`.github/workflows/deploy.yml`)
   - Once you enable GitHub Pages, the workflow will automatically deploy on every push to main
   - Or you can manually trigger it from the **Actions** tab

3. **Your game will be available at:**
   - `https://noahbambi1.github.io/Dans-dungeon-crawler/`

## Manual Deployment (Alternative)

If you prefer to deploy manually without workflows:

1. Go to repository **Settings** → **Pages**
2. Select **Deploy from a branch**
3. Choose **main** branch and **/ (root)** folder
4. Save

The site will be available at the URL above within a few minutes.

## Notes

- The game is a static site (HTML, CSS, JavaScript) so it works perfectly on GitHub Pages
- No build step required - files are served directly
- Updates are automatically deployed when you push to the main branch

