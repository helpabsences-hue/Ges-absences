# usage: python3 tts.py <voice_id> <model> <out.mp3> <text-file>
import json, os, sys, urllib.request
vid, model, out, txt = sys.argv[1:5]
text = open(txt, encoding='utf-8').read().strip()
body = json.dumps({"text": text, "model_id": model,
                   "voice_settings": {"stability": 0.5, "similarity_boost": 0.8, "style": 0.2, "use_speaker_boost": True}}).encode()
req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{vid}?output_format=mp3_44100_128",
    data=body, headers={"xi-api-key": os.environ["ELEVENLABS_API_KEY"], "Content-Type": "application/json", "Accept": "audio/mpeg"})
try:
    with urllib.request.urlopen(req, timeout=120) as r: open(out, 'wb').write(r.read())
    print("ok", out)
except urllib.error.HTTPError as e:
    print("HTTP", e.code, e.read()[:300].decode('utf-8','replace')); sys.exit(1)
