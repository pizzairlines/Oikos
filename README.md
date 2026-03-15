# ImmoScan — Détecteur d'opportunités immobilières à Paris

Application web qui scrape les annonces immobilières parisiennes (BienIci, PAP, LeBonCoin), calcule un score d'opportunité et envoie des alertes WhatsApp.

## Architecture

```
├── scraper/          # Backend Python — scraping + scoring + alertes
│   ├── scrapers/     # BienIci (API), PAP (Playwright), LeBonCoin (Playwright)
│   ├── scoring.py    # Algorithme de scoring (5 composantes pondérées)
│   ├── alerts.py     # Alertes WhatsApp via Twilio
│   ├── validators.py # Validation et nettoyage des données
│   ├── db.py         # Client Supabase
│   ├── config.py     # Configuration centralisée
│   └── main.py       # Point d'entrée + scheduler (APScheduler)
├── web/              # Frontend Next.js 16 + React 19 + Tailwind CSS 4
│   └── src/
│       ├── app/      # Pages : listings, favoris, alertes, détail
│       ├── components/
│       ├── hooks/    # Hooks custom (listings, favoris, alertes)
│       └── lib/      # Types, data fetching, Supabase client
├── supabase/         # Schema SQL
└── docker-compose.yml
```

## Prérequis

- **Node.js** 20+
- **Python** 3.11+
- **Compte Supabase** (gratuit) — [supabase.com](https://supabase.com)
- **Compte Twilio** (optionnel, pour les alertes WhatsApp)

## Installation

### 1. Cloner le repo

```bash
git clone <url-du-repo>
cd immoscan
```

### 2. Configurer Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Aller dans **SQL Editor** et coller le contenu de `supabase/schema.sql`
3. Exécuter — ça crée les tables `listings`, `favorites`, `alert_configs`, `alert_history`
4. Récupérer l'URL et la clé anon dans **Settings > API**

### 3. Variables d'environnement

Copier le fichier d'exemple et remplir les valeurs :

```bash
cp .env.example .env
```

```env
# Obligatoire
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOi...

# Frontend (mêmes valeurs)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...

# Optionnel — alertes WhatsApp
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

### 4. Lancer le frontend

```bash
cd web
npm install
npm run dev
```

L'app est accessible sur `http://localhost:3000`.

### 5. Lancer le scraper

```bash
cd scraper
pip install -r requirements.txt
playwright install chromium
python main.py
```

Le scraper tourne en continu et scrape toutes les heures par défaut.

## Déploiement en production

### Option A : Docker Compose (VPS)

Idéal pour un serveur type OVH, Hetzner, DigitalOcean.

```bash
# Configurer les variables
cp .env.example .env
# Éditer .env avec vos valeurs Supabase

# Lancer
docker compose up -d

# Voir les logs
docker compose logs -f
```

L'app sera accessible sur `http://votre-ip:3000`.

### Option B : Vercel (frontend) + Railway (scraper)

La solution recommandée pour la simplicité.

**Frontend sur Vercel :**

1. Connecter le repo GitHub sur [vercel.com](https://vercel.com)
2. Root directory : `web`
3. Ajouter les variables d'environnement :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Déployer — Vercel détecte Next.js automatiquement

**Scraper sur Railway :**

1. Connecter le repo sur [railway.app](https://railway.app)
2. Root directory : `scraper`
3. Ajouter les variables d'environnement :
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `TWILIO_ACCOUNT_SID` (optionnel)
   - `TWILIO_AUTH_TOKEN` (optionnel)
   - `TWILIO_WHATSAPP_FROM` (optionnel)
4. Railway va builder le Dockerfile automatiquement

### Option C : Render, Fly.io, etc.

Les Dockerfiles sont standard — n'importe quel hébergeur Docker fonctionne.

## Scoring

Chaque annonce reçoit un score de 0 à 100 basé sur 5 composantes :

| Composante | Poids | Critère |
|-----------|-------|---------|
| Prix/m²   | 40%   | Comparé à la médiane du marché parisien |
| Localisation | 20% | Arrondissement (1-7 = premium, 8-9 = bon, etc.) |
| Surface   | 15%   | Bonus pour les grandes surfaces |
| État      | 15%   | Mots-clés positifs/négatifs dans la description |
| Liquidité | 10%   | Fraîcheur de l'annonce |

## Alertes WhatsApp

1. Configurer un compte Twilio avec WhatsApp Sandbox
2. Renseigner les variables Twilio dans `.env`
3. Créer une alerte dans l'onglet **Alertes** de l'app
4. Quand une nouvelle annonce matche vos critères, vous recevez un message WhatsApp

## Tests

```bash
cd scraper
pip install -r requirements.txt
pytest
```

147 tests couvrent le scoring, les scrapers, les alertes, la validation et la configuration.

## Stack technique

- **Frontend** : Next.js 16, React 19, Tailwind CSS 4, shadcn/ui, Supabase JS
- **Backend** : Python 3.11, Playwright, httpx, BeautifulSoup, APScheduler
- **Base de données** : Supabase (PostgreSQL)
- **Alertes** : Twilio WhatsApp API
- **Déploiement** : Docker, Vercel, Railway
