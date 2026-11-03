# usage: python3 stt.py file.mp3  -> prints transcript (ElevenLabs Scribe)
import json, os, sys, uuid, urllib.request
f = sys.argv[1]; b = uuid.uuid4().hex
def part(name, val, fn=None, ct=None):
    h = f'--{b}\r\nContent-Disposition: form-data; name="{name}"' + (f'; filename="{fn}"' if fn else '') + '\r\n'
    if ct: h += f'Content-Type: {ct}\r\n'
    return h.encode() + b'\r\n' + val + b'\r\n'
body = part('model_id', sys.argv[2].encode() if len(sys.argv) > 2 else b'scribe_v1') + part('file', open(f,'rb').read(), 'a.mp3', 'audio/mpeg') + f'--{b}--\r\n'.encode()
req = urllib.request.Request('https://api.elevenlabs.io/v1/speech-to-text', data=body,
    headers={'xi-api-key': os.environ['ELEVENLABS_API_KEY'], 'Content-Type': f'multipart/form-data; boundary={b}'})
try:
    d = json.load(urllib.request.urlopen(req, timeout=120)); print(d.get('language_code'), '|', d.get('text'))
except urllib.error.HTTPError as e: print('HTTP', e.code, e.read()[:300].decode())
