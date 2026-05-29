# LevelUp Auth API Production Deployment

This guide deploys the Node.js/Express/MongoDB backend for production using Docker or PM2.

## 1. Production Architecture

```txt
Client / Vercel Frontend
  -> CDN / DNS / WAF
  -> Nginx reverse proxy
  -> LevelUp Auth API containers or PM2 cluster
  -> MongoDB Atlas
  -> Cloudinary
  -> SMTP provider
```

The API is stateless. JWT/cookies, MongoDB Atlas, Cloudinary, and external logs make it safe to scale horizontally.

## 2. Required Environment

Copy the production template:

```bash
cp server/auth-api/.env.production.example server/auth-api/.env.production
```

Set these first:

```env
MONGODB_URI=mongodb+srv://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
CLIENT_URLS=https://your-frontend-domain.com
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CSRF_ENABLED=true
```

Use 64+ random characters for JWT secrets.

Generate secrets:

```bash
openssl rand -hex 64
```

## 3. MongoDB Atlas

Recommended Atlas setup:

- Use an M10+ cluster for production once traffic grows.
- Enable TLS.
- Create a database user with access only to the LevelUp database.
- Add your API server IP to Network Access.
- Enable daily backups and point-in-time restore.
- Turn on Performance Advisor and slow query logs.
- Keep indexes created by Mongoose in staging first; in production, review indexes before rolling out large datasets.

Connection string example:

```env
MONGODB_URI=mongodb+srv://levelup_api:PASSWORD@cluster.mongodb.net/levelup?retryWrites=true&w=majority
```

## 4. Docker Deployment

From `web-react/server/auth-api`:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Check health:

```bash
curl http://YOUR_SERVER/api/v1/health
curl http://YOUR_SERVER/api/v1/ready
```

## 4.1 Render Deployment

The repo includes a Render Blueprint at:

```txt
render.yaml
```

Render's Blueprint docs support Docker services with `dockerfilePath` and `dockerContext`, which is what this monorepo uses.

Steps:

1. Open Render Dashboard.
2. Choose **Blueprints**.
3. Connect `Fares-ayman88/LevelUP`.
4. Select the root `render.yaml`.
5. Fill every environment variable marked `sync: false`.
6. Deploy.

Required Render secrets:

```txt
CLIENT_URL=https://level-up-steel.vercel.app
CLIENT_URLS=https://level-up-steel.vercel.app
MONGODB_URI=mongodb+srv://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

After Render gives you a URL like:

```txt
https://levelup-auth-api.onrender.com
```

test:

```bash
curl https://levelup-auth-api.onrender.com/api/v1/health
curl https://levelup-auth-api.onrender.com/api/v1/ready
```

Then update the frontend environment on Vercel:

```env
VITE_LEVELUP_API_URL=https://levelup-auth-api.onrender.com/api/v1
```

Redeploy the Vercel frontend after changing this variable.

View logs:

```bash
docker logs -f levelup-auth-api
docker logs -f levelup-nginx
```

Update deployment:

```bash
git pull --ff-only
docker compose -f server/auth-api/docker-compose.prod.yml up -d --build
docker image prune -f
```

## 5. Nginx

Default config:

```txt
server/auth-api/deploy/nginx/levelup-api.conf
```

It proxies `/api/*` to the API container.

For HTTPS, copy:

```txt
server/auth-api/deploy/nginx/levelup-api.ssl.conf.example
```

Then provide:

```txt
/etc/nginx/certs/fullchain.pem
/etc/nginx/certs/privkey.pem
```

You can use Certbot on the host or terminate TLS at Cloudflare/Vercel/Load Balancer.

## 6. PM2 Deployment

Use PM2 when deploying directly on a VPS without Docker.

Install runtime:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs nginx
sudo npm install -g pm2
```

Deploy:

```bash
cd /var/www/levelup/web-react
npm ci --omit=dev
mkdir -p server/auth-api/logs server/auth-api/tmp/uploads
pm2 startOrReload server/auth-api/deploy/pm2/ecosystem.config.cjs --env production
pm2 save
pm2 startup
```

Logs:

```bash
pm2 logs levelup-auth-api
pm2 monit
```

Auto restart is handled by PM2 cluster mode and `max_memory_restart`.

## 7. GitHub Actions CI/CD

Workflow:

```txt
.github/workflows/auth-api-ci.yml
```

It runs:

- `npm ci`
- syntax checks for backend JS files
- `npm run build`
- Docker image build
- Docker publish to GHCR on `main`
- optional VPS deploy over SSH

For VPS deploy, add repository variables/secrets:

```txt
Variable:
ENABLE_VPS_DEPLOY=true

Secrets:
VPS_HOST
VPS_USER
VPS_SSH_KEY
```

The deploy job expects the repo to already exist on the server at:

```txt
/opt/levelup/web-react
```

Adjust the workflow script if your path differs.

## 8. Logging

Current backend logging:

- HTTP logs through Morgan.
- Security-sensitive responses log `401`, `403`, `429`.
- Every response includes `X-Request-Id`.
- PM2 writes to `server/auth-api/logs`.
- Docker writes to container stdout/stderr.

Production recommendation:

- Ship Docker logs to Grafana Loki, Datadog, Better Stack, or CloudWatch.
- Never log tokens, passwords, reset tokens, or Cloudinary secrets.
- Keep request id in frontend error reports so API logs can be correlated.

## 9. Monitoring

Minimum monitoring:

- `/api/v1/health` for process health.
- `/api/v1/ready` for MongoDB readiness.
- CPU and memory per container/process.
- MongoDB Atlas slow queries and connection count.
- HTTP 5xx rate.
- Auth failures and rate-limit events.
- Upload failures.
- Cloudinary API errors.

Recommended tools:

- UptimeRobot or Better Stack uptime checks.
- Grafana + Prometheus for VPS/container metrics.
- MongoDB Atlas monitoring.
- PM2 Plus if using PM2-only deployment.

## 10. Backup Strategy

Preferred:

- MongoDB Atlas continuous backups.
- Daily snapshots.
- Point-in-time restore for production.
- Monthly restore test into staging.

Optional manual dump:

```bash
cd web-react
MONGODB_URI="mongodb+srv://..." bash server/auth-api/deploy/scripts/backup-mongodb-atlas.sh
```

Store backups outside the server:

- S3
- Backblaze B2
- Google Cloud Storage

Do not store long-term backups only on the VPS.

## 11. Production Best Practices

- Run with `NODE_ENV=production`.
- Use HTTPS before enabling `secure` cookies.
- Set `CSRF_ENABLED=true` for browser cookie auth.
- Keep `CLIENT_URLS` strict; never use `*` with cookies.
- Keep uploads on Cloudinary; local temp files are temporary only.
- Use MongoDB Atlas backups and alerts.
- Rotate JWT secrets with a planned logout window.
- Pin Node major version.
- Keep Docker images small and rebuild from lockfile.
- Run at least two API instances behind a load balancer for high availability.
- Add Redis before scaling rate limits across multiple servers.

## 12. Rollback

Docker:

```bash
docker images | grep levelup-auth-api
docker compose -f server/auth-api/docker-compose.prod.yml up -d
```

PM2:

```bash
git log --oneline -5
git checkout PREVIOUS_COMMIT
npm ci --omit=dev
pm2 reload levelup-auth-api
```

Always verify:

```bash
curl https://api.example.com/api/v1/health
curl https://api.example.com/api/v1/ready
```
