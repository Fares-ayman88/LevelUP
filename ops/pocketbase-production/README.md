# PocketBase Production Setup

This is the recommended production path for LevelUp:

- Run PocketBase on a small Linux VPS, not on a personal Windows laptop.
- Keep PocketBase bound to `127.0.0.1:8090`.
- Expose it through a stable public hostname such as `https://pb.your-domain.com`.
- Put that hostname in Vercel as `VITE_PB_ENDPOINT`.
- Keep automatic backups for `pb_data`.

The current `trycloudflare.com` fallback in the web app is only a temporary bridge. Replace it with a stable hosted endpoint, then remove the temporary fallback from the app.

## Recommended Architecture

1. Create a Linux VPS, for example Ubuntu 24.04.
2. Install PocketBase under `/opt/pocketbase`.
3. Run PocketBase as a `systemd` service with `--http 127.0.0.1:8090`.
4. Use a named Cloudflare Tunnel to publish `pb.your-domain.com` to `http://127.0.0.1:8090`.
5. In Vercel, set:

```txt
VITE_PB_ENDPOINT=https://pb.your-domain.com
```

6. Redeploy Vercel.
7. After the stable endpoint is verified, remove the temporary `PUBLIC_FALLBACK_ENDPOINT` from `src/services/pocketbase.js`.

## Server Install Commands

On the Ubuntu server, after copying this folder there:

```bash
cd /path/to/ops/pocketbase-production
bash ubuntu/install-pocketbase.sh
sudo install -m 0755 ubuntu/pocketbase-backup.sh /opt/pocketbase/pocketbase-backup.sh
sudo install -m 0644 ubuntu/pocketbase.service /etc/systemd/system/pocketbase.service
sudo install -m 0644 ubuntu/pocketbase-backup.service /etc/systemd/system/pocketbase-backup.service
sudo install -m 0644 ubuntu/pocketbase-backup.timer /etc/systemd/system/pocketbase-backup.timer
sudo systemctl daemon-reload
sudo systemctl enable --now pocketbase
sudo systemctl enable --now pocketbase-backup.timer
```

Then copy your real data:

```bash
sudo rsync -av /path/to/your/pb_data/ /opt/pocketbase/pb_data/
sudo rsync -av /path/to/your/pb_migrations/ /opt/pocketbase/pb_migrations/
sudo chown -R pocketbase:pocketbase /opt/pocketbase
sudo systemctl restart pocketbase
```

## Why This Is Better

- Stable URL instead of a random temporary tunnel.
- No dependency on your local machine staying online.
- No need to expose inbound ports directly on the server.
- Easier monitoring, restart behavior, and backups.

## Files In This Folder

- `ubuntu/install-pocketbase.sh`: installs PocketBase on Ubuntu.
- `ubuntu/pocketbase.service`: runs PocketBase as a `systemd` service.
- `ubuntu/pocketbase-backup.sh`: creates zipped backups of `pb_data`.
- `ubuntu/pocketbase-backup.service`: backup job unit.
- `ubuntu/pocketbase-backup.timer`: backup schedule.
- `cloudflare/config.yml.example`: named tunnel config.
- `cloudflare/README.md`: exact Cloudflare Tunnel cutover steps.

## Vercel Cutover

After your stable hostname is live:

1. Open the Vercel project for `level-up`.
2. Go to `Settings -> Environment Variables`.
3. Add `VITE_PB_ENDPOINT` for `Production` and `Preview`.
4. Set the value to your stable URL, for example:

```txt
https://pb.your-domain.com
```

5. Redeploy.

Vercel only applies environment variable changes to new deployments, so a redeploy is required.

## Health Check

Your final endpoint should return success here:

```txt
https://pb.your-domain.com/api/health
```

## Data Migration Notes

- Copy your existing `pb_data` directory to the Linux server.
- Copy your `pb_migrations` directory if you are using migrations there.
- Configure PocketBase SMTP on the production server before relying on OTP email in production.

## Final Cleanup

Once `VITE_PB_ENDPOINT` is working in Vercel:

1. Remove the temporary `PUBLIC_FALLBACK_ENDPOINT` from `src/services/pocketbase.js`.
2. Redeploy again.
3. Stop relying on the temporary quick tunnel running on your Windows machine.
