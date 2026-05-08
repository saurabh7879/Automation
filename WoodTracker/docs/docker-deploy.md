# Docker Deployment — Wood Trading POS System

## Architecture

Only the **frontend** (`index.html`) runs in Docker — served by an nginx container.
The **backend** (`Code.gs`) must remain on Google Apps Script — it uses Google-only APIs that cannot run elsewhere.

```
Docker Container (nginx:alpine)
  └── serves index.html on port 80
        └── fetch calls → Google Apps Script /exec URL (external)
              └── reads/writes Google Sheets
```

---

## Files Created

| File | Purpose |
|------|---------|
| `Dockerfile` | Builds the nginx image with index.html and entrypoint script |
| `entrypoint.sh` | Injects `BACKEND_URL` env var into index.html at container startup |
| `nginx.conf` | Nginx config — serves index.html, disables caching, enables gzip |
| `docker-compose.yml` | One-command deploy with environment variable configuration |
| `.dockerignore` | Excludes docs, Code.gs, and markdown from the image |

---

## Prerequisites

- Docker installed on your server ([docs.docker.com/get-docker](https://docs.docker.com/get-docker/))
- Docker Compose installed
- Google Apps Script already deployed (see `SETUP.md` Steps 1–6)
- Your Apps Script `/exec` URL ready

---

## Deploy with Docker Compose (Recommended)

**1. Edit `docker-compose.yml`** — replace the placeholder with your real Apps Script URL:

```yaml
environment:
  - BACKEND_URL=https://script.google.com/macros/s/AKfycb.../exec
```

**2. Build and start:**

```bash
cd WoodTracker
docker compose up -d --build
```

**3. Open** `http://your-server-ip` in a browser and log in.

---

## Deploy with Docker CLI

```bash
# Build the image
docker build -t woodtracker-pos .

# Run the container
docker run -d \
  --name woodtracker-pos \
  -p 80:80 \
  -e BACKEND_URL="https://script.google.com/macros/s/AKfycb.../exec" \
  --restart unless-stopped \
  woodtracker-pos
```

---

## Serve on a Custom Port

To run on port 8080 instead of 80, change the port mapping:

```yaml
# docker-compose.yml
ports:
  - "8080:80"
```

Or with CLI:
```bash
docker run -d -p 8080:80 -e BACKEND_URL="..." woodtracker-pos
```

---

## Update the Backend URL Without Rebuilding

Since `BACKEND_URL` is injected at container startup (not baked into the image), you can update it by restarting with a new value:

```bash
# With Docker Compose — edit docker-compose.yml then:
docker compose down && docker compose up -d

# With CLI:
docker stop woodtracker-pos
docker rm woodtracker-pos
docker run -d --name woodtracker-pos -p 80:80 \
  -e BACKEND_URL="https://script.google.com/macros/s/NEW_ID/exec" \
  --restart unless-stopped woodtracker-pos
```

> You do **not** need to rebuild the image when only the URL changes.

---

## Update the Frontend Code

When `index.html` changes (new features, bug fixes):

```bash
# Rebuild and restart
docker compose up -d --build
```

---

## Useful Commands

```bash
# View running containers
docker ps

# View container logs
docker logs woodtracker-pos

# Check nginx is serving correctly
docker exec woodtracker-pos cat /usr/share/nginx/html/index.html | grep BACKEND_URL

# Stop the container
docker compose down

# Remove image and rebuild from scratch
docker compose down --rmi all
docker compose up -d --build
```

---

## Running Behind a Reverse Proxy (HTTPS)

If you have a domain and want HTTPS (recommended for production), use nginx or Caddy as a reverse proxy in front of the container.

### With Caddy (simplest — auto HTTPS)

```Caddyfile
# /etc/caddy/Caddyfile
woodtracker.yourdomain.com {
    reverse_proxy localhost:80
}
```

### With nginx reverse proxy

```nginx
server {
    listen 443 ssl;
    server_name woodtracker.yourdomain.com;

    ssl_certificate     /etc/ssl/certs/your-cert.pem;
    ssl_certificate_key /etc/ssl/private/your-key.pem;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Troubleshooting

### Container starts but login doesn't work
Check that `BACKEND_URL` was injected correctly:
```bash
docker logs woodtracker-pos
# Should print: BACKEND_URL set to: https://script.google.com/...
```

### Port 80 already in use
Change the host port:
```yaml
ports:
  - "8080:80"    # use port 8080 instead
```

### entrypoint.sh permission denied
The `Dockerfile` runs `chmod +x /entrypoint.sh`. If you edited the file on Windows, line endings may be wrong. Fix with:
```bash
sed -i 's/\r//' entrypoint.sh
```
Then rebuild the image.

### Page loads but shows blank / broken layout
The CDN scripts (jQuery, DataTables, Chart.js) require internet access from the user's browser. Ensure your server's network allows outbound HTTPS.
