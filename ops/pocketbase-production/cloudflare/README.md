# Cloudflare Named Tunnel Setup

This is the recommended public entry point for production if your domain is managed in Cloudflare.

## Target

- Public hostname: `pb.your-domain.com`
- Origin service on the server: `http://127.0.0.1:8090`

## Steps

1. Install `cloudflared` on the Linux VPS.
2. Log in once:

```bash
cloudflared tunnel login
```

3. Create a named tunnel:

```bash
cloudflared tunnel create levelup-pocketbase
```

4. Create a DNS route:

```bash
cloudflared tunnel route dns levelup-pocketbase pb.your-domain.com
```

5. Put `config.yml.example` in `/etc/cloudflared/config.yml` and replace the placeholders.
6. Install the tunnel as a service:

```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

7. Confirm the public URL works:

```txt
https://pb.your-domain.com/api/health
```

8. Set `VITE_PB_ENDPOINT=https://pb.your-domain.com` in Vercel and redeploy.

## Important

- Use a named tunnel for production, not `trycloudflare.com`.
- Keep PocketBase bound to `127.0.0.1:8090` on the server.
- If you later lock down CORS, include your Vercel domains.
