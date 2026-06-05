# Deploy LevelUp Auth API on MonsterASP

MonsterASP runs Node.js apps through `web.config` and `httpPlatformHandler`.

Official MonsterASP docs say:

- Upload your Node.js app to `/wwwroot`.
- Upload a `web.config` file.
- You do not run `npm` on the server.
- `node_modules` must be uploaded with your app.

Official docs:

```txt
https://help.monsterasp.net/books/nodejs/page/how-to-run-nodejs-application
```

## Important Limitations
لا
MonsterASP does not provide MongoDB as a built-in database.

We will use:

```txt
MonsterASP = Node.js backend hosting
MongoDB Atlas = database
Cloudinary = video/image storage
Vercel = frontend
```

## Files Prepared

These files were added for MonsterASP:

```txt
monsterasp.server.js
web.monsterasp.config.example
server/auth-api/DEPLOY_MONSTERASP.md
```

Before uploading, copy:

```txt
web.monsterasp.config.example
```

to:

```txt
web.config
```

Do not commit the real `web.config` if it contains secrets.

## Step 1: Prepare MongoDB Atlas

Your MongoDB URI must look like this:

```txt
mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/levelup?retryWrites=true&w=majority&appName=Cluster0
```

In `web.config`, XML requires `&` to become `&amp;`.

So inside `web.config`, write it like this:

```xml
<environmentVariable name="MONGODB_URI" value="mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/levelup?retryWrites=true&amp;w=majority&amp;appName=Cluster0" />
```

## Step 2: Create Production web.config

From `web-react` root:

```powershell
Copy-Item web.monsterasp.config.example web.config
```

Then edit `web.config` and replace:

```txt
MONGODB_URI
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
CLIENT_URL
CLIENT_URLS
```

Generate JWT secrets:

```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Run it twice:

```txt
JWT_ACCESS_SECRET = first value
JWT_REFRESH_SECRET = second value
```

## Step 3: Install Production Dependencies Locally

MonsterASP docs say node modules must be uploaded.

From `web-react`:

```powershell
npm install
```

or for production only:

```powershell
npm ci --omit=dev
```

If you use `npm ci --omit=dev`, remember it may remove frontend dev tools locally. For safer local development, use regular `npm install`.

## Step 4: Upload Files to MonsterASP

Upload these to MonsterASP `/wwwroot`:

```txt
monsterasp.server.js
web.config
package.json
package-lock.json
node_modules/
server/auth-api/
```

You do not need to upload:

```txt
src/
dist/
public/
android/
ios/
windows/
linux/
macos/
server/pocketbase/
server/levelup-api/
server/levelup-node/
.git/
.github/
.vercel/
```

## Step 5: Create Folders on MonsterASP

Inside `/wwwroot`, create:

```txt
logs/
tmp/uploads/
```

## Step 6: Test Backend

Open:

```txt
https://YOUR-MONSTERASP-DOMAIN/api/v1/health
```

Expected:

```json
{
  "status": "ok",
  "service": "levelup-auth-api",
  "version": "v1"
}
```

Then open:

```txt
https://YOUR-MONSTERASP-DOMAIN/api/v1/ready
```

Expected:

```json
{
  "status": "ready",
  "checks": {
    "mongo": "ok"
  }
}
```

If `/health` works but `/ready` fails, the issue is probably:

- Wrong `MONGODB_URI`
- MongoDB Atlas Network Access blocking MonsterASP
- Wrong database username/password
- Unescaped `&` in `web.config`

## Step 7: MongoDB Atlas Network Access

Because we may not know MonsterASP outbound IP, use temporarily:

```txt
0.0.0.0/0
```

In MongoDB Atlas:

```txt
Network Access
  -> Add IP Address
  -> Allow Access From Anywhere
```

For production, ask MonsterASP support for outbound IP addresses and restrict Atlas later.

## Step 8: Connect Vercel Frontend

In Vercel project settings:

```env
VITE_LEVELUP_API_URL=https://YOUR-MONSTERASP-DOMAIN/api/v1
```

Then redeploy Vercel.

## Step 9: Debug Logs

`web.config` has:

```xml
stdoutLogEnabled="true"
stdoutLogFile=".\logs\node"
```

Check `/wwwroot/logs` in MonsterASP file manager or FTP if the app fails.

After the backend works, you may change:

```xml
stdoutLogEnabled="false"
```

to reduce log files.

## Step 10: Security Reminder

Your MongoDB password appeared in a screenshot during setup.

After deployment works:

```txt
MongoDB Atlas
  -> Database Access
  -> Edit user
  -> Change password
  -> Update web.config MONGODB_URI
  -> Re-upload web.config
```

