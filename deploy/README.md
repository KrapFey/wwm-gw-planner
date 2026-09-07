# Deploying to the Oracle Cloud VM

Target: `VM.Standard.E2.1.Micro` (Always Free, 1 OCPU, 1 GB RAM), Ubuntu 24.04.
Model: **clone the repo on the VM, build there, serve `dist/` with Caddy** (auto
HTTPS via Let's Encrypt). Updating = `git pull` + rebuild via `deploy/deploy.sh`.

No domain? Use `sslip.io`: `<PUBLIC-IP-with-dashes>.sslip.io` resolves to your IP
and Let's Encrypt will still issue a real cert for it. Example for IP
`140.238.1.2` → host `140-238-1-2.sslip.io`.

---

## 1. Open ports 80 + 443 (two places — this is the classic OCI gotcha)

**a) VCN ingress** (OCI Console): Networking → Virtual Cloud Networks → your VCN →
Security Lists → *Default Security List* → **Add Ingress Rules**:
- Source `0.0.0.0/0`, IP Protocol `TCP`, Dest port `80`
- Source `0.0.0.0/0`, IP Protocol `TCP`, Dest port `443`

**b) Host firewall** on the VM. Oracle's Ubuntu image ships iptables with a
default-deny INPUT:

```bash
sudo iptables -L INPUT -n --line-numbers        # inspect; find the REJECT line number
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80  -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

(If `sudo ufw status` shows ufw active instead, use `sudo ufw allow 80,443/tcp`.)

## 2. Swap (insurance — 1 GB RAM + a build + your Discord bot is tight)

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 3. Install Node 20 + Caddy

```bash
# Node 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git rsync

# Caddy (official apt repo)
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update && sudo apt-get install -y caddy
```

## 4. Give the VM read access to the private repo (deploy key)

```bash
ssh-keygen -t ed25519 -C "oracle-vm-deploy" -f ~/.ssh/gw_deploy -N ""
cat ~/.ssh/gw_deploy.pub
```

Add that public key on GitHub: repo → **Settings → Deploy keys → Add deploy key**
(leave **Allow write access unchecked** — read-only).

```bash
cat >> ~/.ssh/config <<'EOF'

Host github-gwplanner
  HostName github.com
  User git
  IdentityFile ~/.ssh/gw_deploy
  IdentitiesOnly yes
EOF
```

## 5. Clone + first build

```bash
mkdir -p ~/apps
git clone github-gwplanner:KrapFey/wwm-gw-planner.git ~/apps/wwm-gw-planner
cd ~/apps/wwm-gw-planner

sudo mkdir -p /var/www/gw-planner
sudo chown -R "$USER":"$USER" /var/www/gw-planner

./deploy/deploy.sh
```

## 6. Point Caddy at it

```bash
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo mkdir -p /var/log/caddy && sudo chown caddy:caddy /var/log/caddy

# set your site address (replace with your dashed public IP)
sudo mkdir -p /etc/systemd/system/caddy.service.d
sudo tee /etc/systemd/system/caddy.service.d/override.conf >/dev/null <<'EOF'
[Service]
Environment=SITE_ADDRESS=140-238-1-2.sslip.io
EOF

sudo systemctl daemon-reload
sudo systemctl restart caddy
sudo systemctl status caddy --no-pager
journalctl -u caddy -n 40 --no-pager     # watch the cert get issued
```

Open `https://140-238-1-2.sslip.io` — you should get the app with a valid cert,
and it should be installable / work offline.

> If Let's Encrypt fails for the sslip.io host (shared-domain rate limits do get
> hit occasionally), temporarily set `SITE_ADDRESS=:443` and add `tls internal`
> inside the Caddyfile block to serve with a self-signed cert while you sort out
> a real domain.

## 7. Updating later

```bash
cd ~/apps/wwm-gw-planner && ./deploy/deploy.sh
```

That fetches `origin/main`, `npm ci`, `npm run build`, and rsyncs `dist/` into
`/var/www/gw-planner`. Caddy serves the new files immediately (no restart needed).

## Notes

- Caddy runs as a **systemd service**, not in tmux — it survives reboots. Your
  Discord bot's tmux session is untouched (it only makes outbound connections).
- Node/`node_modules` live only in `~/apps/wwm-gw-planner`; Caddy serves the
  copied `/var/www/gw-planner` so a mid-build state never gets served.
- If the on-VM build ever strains RAM, switch to building in GitHub Actions and
  having the VM pull just the built artifact — the serve half of this setup
  doesn't change.
