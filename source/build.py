"""Build dist/index.html: swaps the image placeholders in index.html for embedded images.
Run from anywhere:  python3 build.py
Expects the logo and Dala images in ../assets/ (logo.webp, dala.webp)."""
import base64, os

here = os.path.dirname(os.path.abspath(__file__))
assets = os.path.join(here, '..', 'assets')
src = open(os.path.join(here, 'index.html'), encoding='utf-8').read()

def data_uri(name):
    raw = open(os.path.join(assets, name), 'rb').read()
    return 'data:image/webp;base64,' + base64.b64encode(raw).decode()

out = src.replace('__DARA_LOGO__', data_uri('logo.webp')).replace('__DARA_DALA__', data_uri('dala.webp'))
assert '__DARA_LOGO__' not in out and '__DARA_DALA__' not in out
os.makedirs(os.path.join(here, 'dist'), exist_ok=True)
open(os.path.join(here, 'dist', 'index.html'), 'w', encoding='utf-8').write(out)
print('built dist/index.html', len(out) // 1024, 'KB')
