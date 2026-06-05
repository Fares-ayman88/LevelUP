# LevelUp Auth API Runbook

## Quick Checks

```bash
curl https://api.example.com/api/v1/health
curl https://api.example.com/api/v1/ready
```

## Docker Logs

```bash
docker logs -f levelup-auth-api
docker logs -f levelup-nginx
```

## PM2 Logs

```bash
pm2 status
pm2 logs levelup-auth-api
pm2 monit
```

## Common Incidents

### API returns 503 on `/ready`

- Check MongoDB Atlas status.
- Confirm server IP is allowed in Atlas Network Access.
- Confirm `MONGODB_URI` is present and not expired/rotated.
- Check connection count in Atlas.

### Login fails for everyone

- Confirm `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are set.
- Confirm cookies are sent over HTTPS.
- Check `CLIENT_URLS` and CORS errors.
- If CSRF is enabled, confirm frontend sends `X-CSRF-Token`.

### Video uploads fail

- Confirm Cloudinary env vars.
- Check `MAX_VIDEO_SIZE_MB`.
- Check Nginx `client_max_body_size`.
- Check temp disk space.

### High CPU or memory

- Check PM2/Docker metrics.
- Check MongoDB slow queries.
- Reduce upload concurrency.
- Scale API instances horizontally.

### Too many 429 responses

- Review global and upload rate limits.
- Separate limits for public, auth, uploads, and AI endpoints.
- Move to Redis-backed rate limiting before running multiple API instances.
