"""Download a set of Google Fonts into public/fonts so ProtoJam has them offline.

Run once, online, from the repo root:  python scripts/fetch-fonts.py [count]
Takes the `count` most popular families (default 200) plus the ones in ALWAYS,
upright styles only, latin subset only, and writes public/fonts/manifest.json.
Re-running skips files already downloaded.
"""
import json, os, re, sys, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

COUNT = int(sys.argv[1]) if len(sys.argv) > 1 else 200
ALWAYS = ['Bricolage Grotesque', 'Figtree', 'Inter', 'Outfit', 'JetBrains Mono',
          'Playfair Display', 'Caveat', 'Roboto', 'DM Sans', 'Space Grotesk']
OUT = os.path.join('public', 'fonts')
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36'
CATEGORY = {'Sans Serif': 'sans', 'Serif': 'serif', 'Display': 'display',
            'Handwriting': 'handwriting', 'Monospace': 'mono'}


def get(url, binary=False):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = r.read()
    return data if binary else data.decode('utf-8')


def slug(name):
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')


def fetch_family(meta):
    name = meta['family']
    wght = next((a for a in meta.get('axes', []) if a['tag'] == 'wght'), None)
    if wght:
        spec = f"wght@{int(wght['min'])}..{int(wght['max'])}"
    else:
        weights = sorted({int(k) for k in meta['fonts'] if not k.endswith('i')})
        spec = 'wght@' + ';'.join(map(str, weights))
    css = get('https://fonts.googleapis.com/css2?family=' + urllib.parse.quote_plus(name) + ':' + spec + '&display=swap')
    files = []
    # only the latin block of each @font-face
    for block in re.findall(r'/\* latin \*/\s*@font-face\s*{([^}]*)}', css):
        w = re.search(r'font-weight:\s*([^;]+);', block).group(1).strip()
        url = re.search(r'url\((https://[^)]+\.woff2)\)', block).group(1)
        fname = f"{slug(name)}/{w.replace(' ', '-')}.woff2"
        path = os.path.join(OUT, fname)
        if not os.path.exists(path):
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, 'wb') as f:
                f.write(get(url, binary=True))
        files.append({'weight': w, 'file': fname})
    return {'family': name, 'category': CATEGORY.get(meta['category'], 'sans'),
            'popularity': meta['popularity'], 'files': files}


def main():
    meta = json.loads(get('https://fonts.google.com/metadata/fonts'))['familyMetadataList']
    meta = [m for m in meta if 'latin' in m.get('subsets', []) and not m.get('isNoto')]
    meta.sort(key=lambda m: m['popularity'])
    chosen = meta[:COUNT] + [m for m in meta[COUNT:] if m['family'] in ALWAYS]
    os.makedirs(OUT, exist_ok=True)
    out, failed = [], []
    with ThreadPoolExecutor(8) as pool:
        for meta_, res in zip(chosen, pool.map(lambda m: _safe(fetch_family, m), chosen)):
            (out if isinstance(res, dict) and res['files'] else failed).append(res if isinstance(res, dict) else meta_['family'])
    out.sort(key=lambda f: f['family'].lower())
    with open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, separators=(',', ':'))
    print(f'{len(out)} families written, {len(failed)} failed: {failed[:20]}')


def _safe(fn, m):
    try:
        return fn(m)
    except Exception as e:
        return f"{m['family']}: {e}"


if __name__ == '__main__':
    main()
