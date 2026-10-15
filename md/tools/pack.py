#!/usr/bin/env python3
"""
パッチZIP作成（プロジェクトのルートで実行）:
  python3 -I md/tools/pack.py <前回渡した版のフォルダ|none> <APP名> <版> <出力フォルダ>

例:
  python3 -I md/tools/pack.py ../old_1.16.0 PEKARIKUN 1.16.2 ../out

- 前回渡した版と比べて、内容が変わった・新しく増えたファイルだけを入れる（フォルダ構造は保つ）
- 前回版が無い（none）ときは全ファイル（完全版）
- 名前は <APP>_v<版>_patch.zip 固定。PATCH_FILES.txt などの一覧ファイルは作らない
- 除外: .DS_Store / __pycache__ / 作業用の一時ファイル
"""
import os, sys, hashlib, zipfile

EXCLUDE_NAMES = {".DS_Store", "Thumbs.db"}
EXCLUDE_DIRS = {"__pycache__", ".git"}

def walk(root):
    out = {}
    for dp, dns, fns in os.walk(root):
        dns[:] = [d for d in dns if d not in EXCLUDE_DIRS]
        for fn in fns:
            if fn in EXCLUDE_NAMES:
                continue
            full = os.path.join(dp, fn)
            rel = os.path.relpath(full, root).replace(os.sep, "/")
            out[rel] = full
    return out

def digest(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()

def main():
    if len(sys.argv) != 5:
        print(__doc__); return 2
    base, app, ver, outdir = sys.argv[1:5]
    cur = walk(os.getcwd())
    if base == "none":
        changed = sorted(cur)
    else:
        old = walk(base)
        changed = sorted(p for p, full in cur.items()
                         if p not in old or digest(full) != digest(old[p]))
    os.makedirs(outdir, exist_ok=True)
    name = os.path.join(outdir, f"{app}_v{ver}_patch.zip")
    with zipfile.ZipFile(name, "w", zipfile.ZIP_DEFLATED) as z:
        for rel in changed:
            z.write(cur[rel], rel)
    print(f"{name}: {len(changed)} files")
    for rel in changed:
        print("  ", rel)
    return 0

if __name__ == "__main__":
    sys.exit(main())
