#!/bin/sh
# Inject BACKEND_URL environment variable into index.html at container startup.
# This replaces whatever URL is currently set so the same image can be used
# across environments (staging, production) with different Apps Script deployments.
if [ -n "$BACKEND_URL" ]; then
  sed -i "s|const BACKEND_URL = '.*'|const BACKEND_URL = '$BACKEND_URL'|g" /usr/share/nginx/html/index.html
  echo "BACKEND_URL set to: $BACKEND_URL"
else
  echo "WARNING: BACKEND_URL environment variable is not set. Login will not work."
fi

exec nginx -g 'daemon off;'
