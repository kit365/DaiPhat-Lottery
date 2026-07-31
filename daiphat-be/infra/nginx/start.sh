#!/bin/sh
set -eu

template_dir=/opt/daiphat/nginx
domain_name=${DOMAIN_NAME:-_}
certificate=/etc/letsencrypt/live/${domain_name}/fullchain.pem
private_key=/etc/letsencrypt/live/${domain_name}/privkey.pem

if [ "$domain_name" != "_" ] && [ -s "$certificate" ] && [ -s "$private_key" ]; then
    template=${template_dir}/https.conf.template
else
    template=${template_dir}/http.conf.template
fi

export DOMAIN_NAME="$domain_name"
envsubst '${DOMAIN_NAME}' < "$template" > /etc/nginx/conf.d/default.conf
nginx -t

# Reload renewed certificates without restarting the proxy container.
(while sleep 21600; do nginx -s reload; done) &
exec nginx -g 'daemon off;'
