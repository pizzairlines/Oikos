# Oikos — Détecteur d'opportunités immobilières à Paris

Application web qui scrape les annonces immobilières parisiennes (BienIci, PAP, LeBonCoin), calcule un score d'opportunité et envoie des alertes WhatsApp.

**[oikos-fawn.vercel.app](https://oikos-fawn.vercel.app)**

## Architecture

```
scraper/              # Backend Python — scraping + scoring + alertes
├── scrapers/         # BienIci (API), PAP (Playwright), LeBonCoin (Playwright)
├── scoring.py        # Algorithme de scoring (5 composantes pondérées)
├── alerts.py         # Alertes WhatsApp via Twilio
├── validators.py     # Validation et nettoyage des données
├── db.py             # Client Supabase
├── config.py         # Configuration centralisée
└── main.py           # Point d'entrée + scheduler (APScheduler)

web/                  # Frontend Next.js 16 + React 19 + Tailwind CSS 4
└── src/
    ├── app/          # Pages : listings, stats, favoris, alertes, détail
    ├── components/   # Glass UI components, filtres, galerie photo
    ├── hooks/        # Hooks custom (listings, favoris, alertes)
    └── lib/          # Types, data fetching, Supabase client

supabase/             # Schema SQL + migrations
```

## Scoring

Chaque annonce reçoit un score de 0 à 100 basé sur 5 composantes :

| Composante   | Poids | Critère                                          |
|-------------|-------|--------------------------------------------------|
| Prix/m²     | 40%   | Comparé à la médiane du marché parisien          |
| Localisation | 20%  | Arrondissement (1-7 = premium, 8-9 = bon, etc.)  |
| Surface     | 15%   | Bonus pour les grandes surfaces                   |
| État        | 15%   | Mots-clés positifs/négatifs dans la description   |
| Liquidité   | 10%   | Fraîcheur de l'annonce                            |

## Stack technique

- **Frontend** : Next.js 16, React 19, Tailwind CSS 4, Apple-style glass UI
- **Backend** : Python 3.11, Playwright, httpx, BeautifulSoup, APScheduler
- **Base de données** : Supabase (PostgreSQL + Row Level Security)
- **Alertes** : Twilio WhatsApp API
- **Déploiement** : Vercel (frontend) + Railway (scraper)

## Installation

### 1. Cloner le repo

```bash
git clone https://github.com/pizzairlines/Oikos.git
cd Oikos
```

### 2. Configurer Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Aller dans **SQL Editor** et exécuter `supabase/schema.sql`
3. Récupérer l'URL et la clé anon dans **Settings > API**

### 3. Variables d'environnement

```bash
cp .env.example .env
```

```env
# Obligatoire
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOi...

# Frontend
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...

# Optionnel — alertes WhatsApp
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

### 4. Frontend

```bash
cd web
npm install
npm run dev
```

### 5. Scraper

```bash
cd scraper
pip install -r requirements.txt
playwright install chromium
python main.py
```

## Déploiement

### Vercel (frontend) + Railway (scraper)

**Frontend sur Vercel :**
1. Connecter le repo GitHub sur [vercel.com](https://vercel.com)
2. Root directory : `web`
3. Variables : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Scraper sur Railway :**
1. Connecter le repo sur [railway.app](https://railway.app)
2. Root directory : `scraper`
3. Variables : `SUPABASE_URL`, `SUPABASE_KEY`, + Twilio (optionnel)

### Docker Compose (VPS)

```bash
cp .env.example .env
docker compose up -d
```

## Alertes WhatsApp

1. Configurer un compte Twilio avec WhatsApp Sandbox
2. Renseigner les variables Twilio dans `.env`
3. Créer une alerte dans l'onglet **Alertes** de l'app
4. Les nouvelles annonces qui matchent vos critères déclenchent un message WhatsApp

## Tests

```bash
cd scraper && pytest
```

147 tests couvrent le scoring, les scrapers, les alertes, la validation et la configuration.
