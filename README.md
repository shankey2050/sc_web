# EdgeCore Solutions Website

A professional website for EdgeCore Solutions — an intelligent edge computing software company specializing in embedded systems, Edge AI, and IoT platform development.

## 🚀 Quick Start

Simply open `index.html` in a browser to view the website locally.

```bash
# Or use a local server
python -m http.server 8000
# Then open http://localhost:8000
```

## 📁 Project Structure

```
sc_web/
├── index.html          # Main HTML page
├── css/
│   └── style.css       # Complete stylesheet
├── js/
│   └── main.js         # Interactive features & animations
├── assets/
│   └── favicon.svg     # Site favicon
├── CNAME               # Custom domain configuration
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

## 🌐 Deployment to GitHub Pages

### Step 1: Push to GitHub

```bash
# Initialize git repository (if not already done)
git init
git add .
git commit -m "Initial commit: EdgeCore Solutions website"

# Create a GitHub repository and push
gh repo create your-username/edgecore-website --public --source=. --push
# OR manually:
git remote add origin https://github.com/your-username/edgecore-website.git
git branch -M main
git push -u origin main
```

### Step 2: Enable GitHub Pages

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Pages**
3. Under "Source", select **Deploy from a branch**
4. Select **main** branch and **/ (root)** folder
5. Click **Save**

Your site will be live at `https://your-username.github.io/edgecore-website/`

## 🔗 Connect GoDaddy Domain to GitHub Pages

### Step 1: Configure GitHub Pages Custom Domain

1. In your repo's **Settings** → **Pages**
2. Under "Custom domain", enter your domain (e.g., `www.yourdomain.com`)
3. Click **Save**
4. Check "Enforce HTTPS" once DNS propagates

### Step 2: Configure DNS on GoDaddy

1. Log in to [GoDaddy](https://www.godaddy.com)
2. Go to **My Products** → **DNS** for your domain
3. Add the following DNS records:

#### For apex domain (yourdomain.com):

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | 185.199.108.153 | 600 |
| A | @ | 185.199.109.153 | 600 |
| A | @ | 185.199.110.153 | 600 |
| A | @ | 185.199.111.153 | 600 |

#### For www subdomain:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | www | your-username.github.io | 600 |

### Step 3: Update CNAME File

Edit the `CNAME` file in this repository to contain your domain:

```
www.yourdomain.com
```

### Step 4: Verify

- DNS propagation may take up to 48 hours (usually 15-30 minutes)
- Once propagated, your site will be accessible at your custom domain
- GitHub will automatically provision an SSL certificate

## ✨ Features

- **Responsive Design** — Works on all devices (mobile, tablet, desktop)
- **Modern UI** — Clean, professional design with smooth animations
- **Edge Computing Focus** — Content tailored for edge device solutions
- **Interactive Elements** — Animated counters, particle effects, scroll animations
- **Contact Form** — Client-ready contact form (connect to your backend)
- **SEO Optimized** — Meta tags, semantic HTML, performance-focused
- **No Dependencies** — Pure HTML, CSS, and JavaScript (no frameworks needed)

## 🛠 Customization

### Changing Company Details
- Edit contact information in `index.html` (email, phone, address)
- Update social media links in the footer
- Modify the `CNAME` file with your actual domain

### Changing Colors
Edit CSS variables in `css/style.css`:
```css
:root {
    --primary-600: #2563eb;  /* Main brand color */
    --primary-700: #1d4ed8;  /* Hover state */
    /* ... */
}
```

### Adding a Backend for the Contact Form
The contact form currently shows a success message without sending data. To connect it:
1. Set up a backend endpoint (e.g., Formspree, Netlify Forms, or custom API)
2. Modify the `initContactForm()` function in `js/main.js` to POST data to your endpoint

## 📄 License

© 2026 EdgeCore Solutions. All rights reserved.