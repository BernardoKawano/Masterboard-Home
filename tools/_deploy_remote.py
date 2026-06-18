#!/usr/bin/env python3
import base64
import os
import sys
from pathlib import Path

import paramiko

HOST = "pdx1-shared-a4-10.dreamhost.com"
USER = "dh_pq5wcx"
PORT = 22
PASSWORD = os.environ.get("MB_SSH_PASSWORD", "")

REPO = Path(__file__).resolve().parents[1]
PLUGIN = REPO / "wordpress-plugin" / "masterboard-candidatura"
SNIPPET = Path(__file__).resolve().parent / "wordpress-wp-config.snippet.php"


def run(ssh: paramiko.SSHClient, cmd: str) -> tuple[int, str, str]:
    _, stdout, stderr = ssh.exec_command(cmd)
    code = stdout.channel.recv_exit_status()
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    return code, out, err


def upload_dir(sftp: paramiko.SFTPClient, local: Path, remote: str) -> None:
    for path in local.rglob("*"):
        rel = path.relative_to(local).as_posix()
        target = f"{remote}/{rel}" if rel != "." else remote
        if path.is_dir():
            try:
                sftp.mkdir(target)
            except OSError:
                pass
        else:
            parent = "/".join(target.split("/")[:-1])
            parts = []
            for part in parent.split("/"):
                if not part:
                    continue
                parts.append(part)
                cur = "/" + "/".join(parts) if parent.startswith("/") else "/".join(parts)
                try:
                    sftp.mkdir(cur)
                except OSError:
                    pass
            sftp.put(str(path), target)


def main() -> int:
    if not PASSWORD:
        print("MB_SSH_PASSWORD not set", file=sys.stderr)
        return 1
    if not PLUGIN.is_dir():
        print(f"Plugin missing: {PLUGIN}", file=sys.stderr)
        return 1
    if not SNIPPET.is_file():
        print(f"Snippet missing: {SNIPPET}", file=sys.stderr)
        return 1

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=30)

    try:
        code, out, err = run(
            ssh,
            "pwd; ls -la; "
            "for d in masterboard.com.br www.masterboard.com.br share_masterboard share.masterboard.com.br; do "
            '[ -f "$HOME/$d/wp-config.php" ] && echo "FOUND:$HOME/$d"; done; '
            'find "$HOME" -maxdepth 3 -name wp-config.php 2>/dev/null',
        )
        print(out)
        if err:
            print(err, file=sys.stderr)

        wp_path = ""
        for line in out.splitlines():
            if line.startswith("FOUND:"):
                wp_path = line.replace("FOUND:", "", 1)
                break
        if not wp_path:
            for line in out.splitlines():
                if line.endswith("/wp-config.php"):
                    wp_path = line[: -len("/wp-config.php")]
                    break
        if not wp_path:
            print("WordPress path not found", file=sys.stderr)
            return 1
        print(f"WordPress path: {wp_path}")

        remote_plugin = f"{wp_path}/wp-content/plugins/masterboard-candidatura"
        run(ssh, f"rm -rf '{remote_plugin}'")

        sftp = ssh.open_sftp()
        upload_dir(sftp, PLUGIN, remote_plugin)
        sftp.close()
        print("Plugin uploaded")

        code, out, err = run(ssh, f"cd '{wp_path}' && wp plugin activate masterboard-candidatura 2>&1")
        print(out or err)
        if code != 0:
            print(f"wp activate exit {code}", file=sys.stderr)

        snippet = SNIPPET.read_text(encoding="utf-8")
        b64 = base64.b64encode(snippet.encode("utf-8")).decode("ascii")
        patch = f"""cd '{wp_path}'
if grep -q 'MASTERBOARD_SUPABASE_URL' wp-config.php; then
  echo 'wp-config already patched'
else
  python3 - <<'PY'
import base64
from pathlib import Path
snippet = base64.b64decode('{b64}').decode('utf-8')
path = Path('wp-config.php')
text = path.read_text(encoding='utf-8')
marker = "/* That's all, stop editing!"
if marker not in text:
    marker = "require_once ABSPATH . 'wp-settings.php';"
if marker not in text:
    raise SystemExit('wp-config marker not found')
path.write_text(text.replace(marker, snippet + '\\n\\n' + marker, 1), encoding='utf-8')
print('wp-config patched')
PY
fi
"""
        code, out, err = run(ssh, patch)
        print(out or err)

        run(ssh, f"cd '{wp_path}' && wp rewrite flush 2>&1")
        code, out, err = run(
            ssh,
            f"cd '{wp_path}' && wp option get permalink_structure 2>&1 && wp post list --post_type=page --name=candidatura --fields=ID,post_status,post_name 2>&1",
        )
        print(out or err)
        print(f"DEPLOY_OK:{wp_path}")
        return 0
    finally:
        ssh.close()


if __name__ == "__main__":
    raise SystemExit(main())
