# Azure Deployment Guide — Clinique des Juristes
# Microsoft Azure for Students (Minimum Cost)

---

## What You Are Deploying

| Layer        | Technology                                        |
|--------------|---------------------------------------------------|
| Frontend     | React 18 (compiled to static files)              |
| Backend API  | Node.js / Express / TypeScript (port 5001/8080)  |
| Database     | MySQL 8                                           |
| File uploads | Local `/uploads` folder (served by Express)      |
| Videos       | Hetzner Object Storage (external — keep as-is)   |

---

## Azure Services to Use

| Service                              | Purpose                    | Cost on Student Account              |
|--------------------------------------|----------------------------|---------------------------------------|
| App Service (Free F1 tier)           | Run Node.js backend + serve React | **$0/month** (60 CPU-min/day limit) |
| Azure Database for MySQL Flexible Server (B1ms Burstable) | Managed MySQL 8 | **$0** — free 750 hrs/month for 12 months |
| Azure Blob Storage (optional)        | Store uploaded images permanently | ~$0.02/GB — nearly free |

> **Total estimated cost: ~$0/month for the first 12 months** using your $100 student credit.

---

## Prerequisites — Install These First

### 1. Create Your Azure for Students Account
1. Go to https://azure.microsoft.com/en-us/free/students/
2. Click **Start free**
3. Sign in with your **university `.edu` email address**
4. You will receive **$100 credit** — no credit card needed

### 2. Install the Azure CLI
- **Windows:** Open PowerShell as Administrator and run:
  ```powershell
  winget install Microsoft.AzureCLI
  ```
- **macOS:**
  ```bash
  brew install azure-cli
  ```
- **Ubuntu/Debian:**
  ```bash
  curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
  ```

### 3. Verify Node.js 18+ is installed
```bash
node --version   # must be v18 or higher
npm --version
```

### 4. Verify Git is installed
```bash
git --version
```

---

## Step 1 — Login to Azure CLI

```bash
az login
```
A browser window will open. Sign in with your student account.

After login, verify your subscription is active:
```bash
az account show
```
You should see your student subscription with `"state": "Enabled"`.

---

## Step 2 — Create a Resource Group

A resource group is a folder that holds all your Azure resources.

```bash
az group create \
  --name clinique-rg \
  --location francecentral
```

> Use `francecentral` — it is geographically close and fully supported for student subscriptions.

**Expected output:**
```json
{
  "location": "francecentral",
  "name": "clinique-rg",
  "properties": {
    "provisioningState": "Succeeded"
  }
}
```

---

## Step 3 — Create the MySQL Database Server

This command creates a managed MySQL 8 server in Azure.

```bash
az mysql flexible-server create \
  --resource-group clinique-rg \
  --name clinique-mysql-server \
  --location francecentral \
  --admin-user cliniqueadmin \
  --admin-password "YourStr0ngP@ssword!" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 20 \
  --version 8.0 \
  --public-access 0.0.0.0
```

> ⚠️ Replace `YourStr0ngP@ssword!` with your own strong password. Write it down — you will need it later.
>
> `--public-access 0.0.0.0` temporarily allows all Azure-internal IPs. You will restrict this to only your App Service IPs in Step 10.

This takes about 3–5 minutes. Wait for `"provisioningState": "Succeeded"`.

### Create the database inside the server

```bash
az mysql flexible-server db create \
  --resource-group clinique-rg \
  --server-name clinique-mysql-server \
  --database-name clinique_db
```

### Write down your connection string

Your full DATABASE_URL will be:
```
mysql://cliniqueadmin:YourStr0ngP@ssword!@clinique-mysql-server.mysql.database.azure.com:3306/clinique_db?ssl=true
```
Save this. You will use it in Step 8.

---

## Step 4 — Import Your Database (Schema + Data)

You need to export your existing database and import it into Azure MySQL.

### Export from your current server (run this locally or on your old host)

```bash
mysqldump \
  -h YOUR_CURRENT_HOST \
  -u YOUR_CURRENT_USER \
  -p YOUR_CURRENT_DB_NAME > dump.sql
```

Example if running locally:
```bash
mysqldump -u root -p legal_education_mysql5 > dump.sql
```

### Import into Azure MySQL

```bash
mysql \
  -h clinique-mysql-server.mysql.database.azure.com \
  -u cliniqueadmin \
  -p \
  --ssl-mode=REQUIRED \
  clinique_db < dump.sql
```
Enter your password when prompted.

If `mysql` client is not installed:
- Windows: Download from https://dev.mysql.com/downloads/workbench/ (MySQL Workbench includes the CLI)
- Mac: `brew install mysql-client`
- Ubuntu: `sudo apt install mysql-client`

---

## Step 5 — Fix the Backend SSL Config for Azure MySQL

Azure MySQL **requires SSL connections**. Open the file:
```
backend/src/config/database.ts
```

Find the `connectionConfig` object inside the `if (dbUrl)` block and add the `ssl` line:

**Before:**
```typescript
connectionConfig = {
  host: url.hostname,
  port: parseInt(url.port) || 3306,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1),
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  charset: 'utf8mb4'
};
```

**After:**
```typescript
connectionConfig = {
  host: url.hostname,
  port: parseInt(url.port) || 3306,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  charset: 'utf8mb4'
};
```

Do the same for the `else` block:
```typescript
connectionConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'cliniqueadmin',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'clinique_db',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  charset: 'utf8mb4'
};
```

Save the file.

---

## Step 6 — Build the React Frontend

Open a terminal in the `frontend/` directory:

```bash
cd frontend
```

**On Mac/Linux:**
```bash
REACT_APP_API_URL=https://clinique-app.azurewebsites.net npm run build
```

**On Windows (PowerShell):**
```powershell
$env:REACT_APP_API_URL="https://clinique-app.azurewebsites.net"
npm run build
```

> Replace `clinique-app` with the name you will use for your App Service. If that name is taken, pick something unique like `clinique-juristes-2025`.

This creates the `frontend/build/` directory with all the compiled static files.

---

## Step 7 — Build the Backend

Open a terminal in the `backend/` directory:

```bash
cd backend
npm run build
```

This compiles TypeScript into the `backend/dist/` directory.

Now copy the React build output into the backend so Express can serve it:

**Mac/Linux:**
```bash
cp -r ../frontend/build ./build
```

**Windows (PowerShell):**
```powershell
Copy-Item -Recurse ..\frontend\build .\build
```

Your `backend/` directory should now contain:
```
backend/
  dist/          ← compiled Node.js JavaScript
  build/         ← React static files (copied from frontend/build)
  uploads/       ← uploaded files (empty on fresh deploy)
  package.json
  package-lock.json
  node_modules/
```

---

## Step 8 — Create the App Service Plan and Web App

### Create the App Service Plan (Free F1 tier)

```bash
az appservice plan create \
  --name clinique-plan \
  --resource-group clinique-rg \
  --sku F1 \
  --is-linux
```

### Create the Web App

```bash
az webapp create \
  --resource-group clinique-rg \
  --plan clinique-plan \
  --name clinique-app \
  --runtime "NODE:18-lts"
```

> If `clinique-app` name is already taken by someone else, change it to something unique like `clinique-juristes-prod` or `clinique2025`. The name becomes part of your URL: `https://clinique-app.azurewebsites.net`.

---

## Step 9 — Set All Environment Variables

These replace your `.env` file in production. Run this command (replace all placeholder values):

```bash
az webapp config appsettings set \
  --resource-group clinique-rg \
  --name clinique-app \
  --settings \
    NODE_ENV="production" \
    PORT="8080" \
    DATABASE_URL="mysql://cliniqueadmin:YourStr0ngP@ssword!@clinique-mysql-server.mysql.database.azure.com:3306/clinique_db?ssl=true" \
    JWT_SECRET="replace-this-with-a-very-long-random-string-at-least-64-characters-long" \
    JWT_EXPIRES_IN="24h" \
    API_URL="https://clinique-app.azurewebsites.net" \
    FRONTEND_URL="https://clinique-app.azurewebsites.net" \
    BASE_URL="https://clinique-app.azurewebsites.net" \
    ENABLE_HETZNER="false" \
    ENABLE_HLS="false" \
    WEBSITE_NODE_DEFAULT_VERSION="~18"
```

> **Important:** Replace every placeholder:
> - `YourStr0ngP@ssword!` → your actual MySQL admin password
> - `clinique-app` → your actual App Service name (in 3 places in the URLs)
> - The `JWT_SECRET` → generate a random string using: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

### Set the startup command

```bash
az webapp config set \
  --resource-group clinique-rg \
  --name clinique-app \
  --startup-file "node dist/server.js"
```

---

## Step 10 — Allow App Service to Connect to MySQL

The MySQL firewall blocks all external connections by default. You need to add your App Service's outbound IP addresses.

### Get your App Service's outbound IPs

```bash
az webapp show \
  --resource-group clinique-rg \
  --name clinique-app \
  --query outboundIpAddresses \
  --output tsv
```

The output will look like: `40.68.1.2,52.143.2.3,20.74.5.6,20.74.5.7`

### Add each IP to the MySQL firewall

Run this command **once for each IP address** in the list above (replace the IP):

```bash
az mysql flexible-server firewall-rule create \
  --resource-group clinique-rg \
  --name clinique-mysql-server \
  --rule-name AppService-IP-1 \
  --start-ip-address 40.68.1.2 \
  --end-ip-address 40.68.1.2
```

```bash
az mysql flexible-server firewall-rule create \
  --resource-group clinique-rg \
  --name clinique-mysql-server \
  --rule-name AppService-IP-2 \
  --start-ip-address 52.143.2.3 \
  --end-ip-address 52.143.2.3
```

Repeat for all IPs in the list. Change `AppService-IP-1`, `AppService-IP-2`, etc. for each rule name.

---

## Step 11 — Deploy the Code (ZIP Deploy)

### Create the deployment ZIP

From inside the `backend/` directory:

**Mac/Linux:**
```bash
cd backend
zip -r deploy.zip dist/ build/ uploads/ package.json package-lock.json node_modules/
```

**Windows (PowerShell):**
```powershell
cd backend
Compress-Archive -Path dist, build, uploads, package.json, package-lock.json, node_modules -DestinationPath deploy.zip
```

> ⚠️ Including `node_modules/` makes the zip large (~100–300 MB). If your internet is slow, use the alternative below.

### Alternative (smaller zip — no node_modules)

```bash
# Mac/Linux
zip -r deploy.zip dist/ build/ uploads/ package.json package-lock.json

# Windows PowerShell
Compress-Archive -Path dist, build, uploads, package.json, package-lock.json -DestinationPath deploy.zip
```

Then set a startup command that installs dependencies first:
```bash
az webapp config set \
  --resource-group clinique-rg \
  --name clinique-app \
  --startup-file "npm install --production && node dist/server.js"
```

### Deploy the ZIP

```bash
az webapp deploy \
  --resource-group clinique-rg \
  --name clinique-app \
  --src-path deploy.zip \
  --type zip
```

This uploads and deploys your code. Wait for it to complete (1–3 minutes).

---

## Step 12 — Verify the Deployment

### Check the app is running

```bash
az webapp show \
  --resource-group clinique-rg \
  --name clinique-app \
  --query state \
  --output tsv
```
Should print `Running`.

### View live logs (very useful for debugging)

```bash
az webapp log tail \
  --resource-group clinique-rg \
  --name clinique-app
```

Press `Ctrl+C` to stop the log stream.

### Enable logging if you don't see any output

```bash
az webapp log config \
  --resource-group clinique-rg \
  --name clinique-app \
  --application-logging filesystem \
  --level information
```

### Open in browser

Go to: `https://clinique-app.azurewebsites.net`

Test the API health endpoint: `https://clinique-app.azurewebsites.net/api/courses`

---

## Step 13 — (Optional) Connect a Custom Domain

If you own a domain like `cliniquedesjuristes.com`:

### Add the domain to App Service

```bash
az webapp config hostname add \
  --resource-group clinique-rg \
  --webapp-name clinique-app \
  --hostname cliniquedesjuristes.com
```

### Point your domain's DNS to Azure

In your domain registrar's DNS settings, add:
- **Type:** CNAME
- **Name:** www
- **Value:** clinique-app.azurewebsites.net

Or for the root domain (@):
- **Type:** A
- **Name:** @
- **Value:** (use the IP from `az webapp show --query defaultHostName`)

### Add a free SSL/TLS certificate

```bash
az webapp config ssl create \
  --resource-group clinique-rg \
  --name clinique-app \
  --hostname cliniquedesjuristes.com
```

---

## Step 14 — (Optional) Set Up GitHub Actions for Automatic Deploys

Every time you push to `main`, GitHub will automatically build and deploy to Azure.

### Connect your GitHub repo to Azure

```bash
az webapp deployment github-actions add \
  --resource-group clinique-rg \
  --name clinique-app \
  --repo "https://github.com/Medsaidabidi02/cliniquedesjuristes" \
  --branch main \
  --login-with-github
```

This creates a file at `.github/workflows/azure-webapps-node.yml` in your repo. Edit that file to:
1. Build the frontend with `REACT_APP_API_URL` set
2. Copy `frontend/build` into `backend/build`
3. Build the backend TypeScript
4. Deploy the `backend/` folder

Example workflow steps to add:
```yaml
- name: Build frontend
  working-directory: ./frontend
  run: |
    REACT_APP_API_URL=https://clinique-app.azurewebsites.net npm ci
    REACT_APP_API_URL=https://clinique-app.azurewebsites.net npm run build

- name: Build backend
  working-directory: ./backend
  run: |
    npm ci
    npm run build
    cp -r ../frontend/build ./build

- name: Deploy to Azure
  uses: azure/webapps-deploy@v2
  with:
    app-name: clinique-app
    package: ./backend
```

---

## Full Environment Variables Reference

Set these in **Azure Portal → App Service → Configuration → Application settings** OR using the `az webapp config appsettings set` command:

| Variable                | Value                                                                                 |
|-------------------------|---------------------------------------------------------------------------------------|
| `NODE_ENV`              | `production`                                                                          |
| `PORT`                  | `8080`                                                                                |
| `DATABASE_URL`          | `mysql://cliniqueadmin:PASSWORD@clinique-mysql-server.mysql.database.azure.com:3306/clinique_db?ssl=true` |
| `JWT_SECRET`            | A random string — at least 64 characters                                             |
| `JWT_EXPIRES_IN`        | `24h`                                                                                 |
| `API_URL`               | `https://clinique-app.azurewebsites.net`                                             |
| `FRONTEND_URL`          | `https://clinique-app.azurewebsites.net`                                             |
| `BASE_URL`              | `https://clinique-app.azurewebsites.net`                                             |
| `ENABLE_HETZNER`        | `false` (or `true` if you use Hetzner for video storage)                             |
| `ENABLE_HLS`            | `false`                                                                               |
| `WEBSITE_NODE_DEFAULT_VERSION` | `~18`                                                                        |

To generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Estimated Monthly Cost (Azure for Students)

| Resource                        | Tier              | Monthly cost      |
|---------------------------------|-------------------|-------------------|
| App Service                     | Free F1           | **$0.00**         |
| MySQL Flexible Server           | Burstable B1ms    | **$0.00** (free 750 hrs/month for 12 months) |
| Blob Storage (if used)          | LRS Standard Hot  | **~$0.02/GB**     |
| Bandwidth (outbound)            | First 5 GB/month  | **$0.00**         |
| **Total**                       |                   | **~$0.00/month**  |

> After 12 months, MySQL B1ms costs approximately $13/month. Your $100 student credit will still cover ~7 months beyond that.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| App shows **Application Error** or blank page | Run `az webapp log tail --name clinique-app --resource-group clinique-rg` to see the error |
| **MySQL connection refused** | Make sure you added all App Service outbound IPs to the MySQL firewall (Step 10) |
| **MySQL SSL error** | Make sure you added `ssl: { rejectUnauthorized: false }` to `database.ts` (Step 5) |
| **API calls fail / CORS error** | Double-check `API_URL`, `FRONTEND_URL`, `BASE_URL` env vars match your exact App Service URL |
| **Uploads not persisting** | Files on the free App Service disk are ephemeral. Use Azure Blob Storage for permanent file storage |
| **React pages give 404 on refresh** | Make sure Express has a `app.get('*')` catch-all that serves `index.html` (already in `app.ts`) |
| **JWT errors after deploy** | Make sure `JWT_SECRET` env var is set and not empty |
| **App slow or crashes (F1 limit)** | The free F1 tier has 60 CPU-minutes/day and 1 GB RAM. Upgrade to B1 ($13/mo) if needed |
| **504 Gateway Timeout** | F1 tier has a 230-second request timeout. Long-running operations may fail |

---

## Quick Reference — All Commands in Order

```bash
# 1. Login
az login

# 2. Resource group
az group create --name clinique-rg --location francecentral

# 3. MySQL server
az mysql flexible-server create --resource-group clinique-rg --name clinique-mysql-server --location francecentral --admin-user cliniqueadmin --admin-password "YourStr0ngP@ssword!" --sku-name Standard_B1ms --tier Burstable --storage-size 20 --version 8.0 --public-access 0.0.0.0

# 4. Create database
az mysql flexible-server db create --resource-group clinique-rg --server-name clinique-mysql-server --database-name clinique_db

# 5. Import data
mysql -h clinique-mysql-server.mysql.database.azure.com -u cliniqueadmin -p --ssl-mode=REQUIRED clinique_db < dump.sql

# 6. Build frontend (Mac/Linux)
cd frontend && REACT_APP_API_URL=https://clinique-app.azurewebsites.net npm run build && cd ..

# 7. Build backend
cd backend && npm run build && cp -r ../frontend/build ./build && cd ..

# 8. Create App Service
az appservice plan create --name clinique-plan --resource-group clinique-rg --sku F1 --is-linux
az webapp create --resource-group clinique-rg --plan clinique-plan --name clinique-app --runtime "NODE:18-lts"

# 9. Set env vars
az webapp config appsettings set --resource-group clinique-rg --name clinique-app --settings NODE_ENV="production" PORT="8080" DATABASE_URL="mysql://cliniqueadmin:YourStr0ngP@ssword!@clinique-mysql-server.mysql.database.azure.com:3306/clinique_db?ssl=true" JWT_SECRET="your-generated-secret" JWT_EXPIRES_IN="24h" API_URL="https://clinique-app.azurewebsites.net" FRONTEND_URL="https://clinique-app.azurewebsites.net" BASE_URL="https://clinique-app.azurewebsites.net" ENABLE_HETZNER="false" ENABLE_HLS="false" WEBSITE_NODE_DEFAULT_VERSION="~18"

# 10. Set startup command
az webapp config set --resource-group clinique-rg --name clinique-app --startup-file "node dist/server.js"

# 11. Add MySQL firewall rules (repeat for each IP)
az webapp show --resource-group clinique-rg --name clinique-app --query outboundIpAddresses --output tsv
# Then for each IP:
az mysql flexible-server firewall-rule create --resource-group clinique-rg --name clinique-mysql-server --rule-name AppService-IP-1 --start-ip-address YOUR_IP --end-ip-address YOUR_IP

# 12. Deploy
cd backend
zip -r deploy.zip dist/ build/ uploads/ package.json package-lock.json node_modules/
az webapp deploy --resource-group clinique-rg --name clinique-app --src-path deploy.zip --type zip

# 13. Verify
az webapp log tail --resource-group clinique-rg --name clinique-app
```

---

*Guide written for Clinique des Juristes — React 18 + Node.js/Express + MySQL 8 stack.*
*Azure for Students account with $100 credit — francecentral region.*
