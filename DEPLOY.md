# Deployment Guide — GitHub + Render

## Step 1: Push to GitHub

Run these commands in the Replit **Shell** tab:

```bash
git remote add github https://github.com/baunemonff-cyber/lol-bypasss.git
git add .
git commit -m "Initial deploy"
git push github main
```

> GitHub will ask for your username + a **Personal Access Token** (not password).
> Create one at: https://github.com/settings/tokens → Generate new token (classic) → check `repo` scope.

---

## Step 2: Deploy on Render

1. Go to **https://render.com** and sign in (or sign up free)
2. Click **New → Web Service**
3. Connect your GitHub account → select repo `baunemonff-cyber/lol-bypasss`
4. Render will auto-detect `render.yaml` — click **Apply**
5. Go to the service **Environment** tab and add:

| Key              | Value                                    |
|------------------|------------------------------------------|
| `UID_API_KEY`    | `64196c18514d5105bf3c4d602137e85805f151098948SG71` |
| `ADMIN_USERNAME` | `admin`                                  |
| `ADMIN_PASSWORD` | `UID@Admin2024`                          |

6. Click **Save Changes** → **Deploy** → wait ~3 mins

Your site will be live at: `https://uid-bypass-manager.onrender.com`

---

## Updating Later

Every time you push code changes to GitHub → Render auto-redeploys.

To change the external API URL/key → edit `artifacts/api-server/src/config.ts`
