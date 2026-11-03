# Attendefy presentation video

Source files for the ~50 s sales video (French on screen, 1920×1080, 30 fps).

| File | What it is |
|---|---|
| `index.html` | The animated scenes. `seek(t)` draws the frame at time `t` (seconds); images come from `public/`. |
| `render.js` | Renders the page frame by frame with Playwright and pipes it to ffmpeg. |
| `music.py` | Original background music + whooshes/dings, synthesised with numpy (free to use). |
| `Script-voix-Darija-Attendefy.txt` | Voice-over script, Darija + French, one part per scene. |

## Build

```bash
node marketing/video/render.js "$PWD/marketing/video/index.html" out/video.mp4
python3 marketing/video/music.py out/music.wav 51.5 0,4.5,10,17.5,25,32,38.5,45 7.9,8.2,8.5,14.2,20.6,22.6,29.0,47.1
ffmpeg -i out/video.mp4 -i out/music.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11" -shortest -movflags +faststart out/video-musique.mp4
```

Scene start times (seconds): 0, 4.5, 10, 17.5, 25, 32, 38.5, 45 — end 51.5.

## Next step: voice-over
Generate each script part with ElevenLabs (needs `ELEVENLABS_API_KEY` and network access to
`api.elevenlabs.io`), stretch each scene to its voice clip, then mix the voice over the
music with ducking.

## Voice-over version (Darija + French) — `Attendefy-video-Darija.mp4`

Voice: ElevenLabs "Sarah", model `eleven_v4` (chosen because its transcript matched the Darija
script best). Texts and generated clips are in `voice/p1..p8`. The brand is spelled "Attendify"
in the texts so the voice pronounces it correctly; Massar is written مسار.

```bash
export ELEVENLABS_API_KEY=...            # needs network access to api.elevenlabs.io
for i in 1 2 3 4 5 6 7 8; do python3 marketing/video/tts.py EXAVITQu4vr4xnSDxMaL eleven_v4 marketing/video/voice/p$i.mp3 marketing/video/voice/p$i.txt; done
python3 marketing/video/stt.py marketing/video/voice/p1.mp3   # check pronunciation via transcript
node marketing/video/render2.js "$PWD/marketing/video/index.html" out/video-long.mp4 marketing/video/plan.json
```

`plan.json` stretches each scene (design times `D`) to real times `R` so every voice clip fits,
and lists where each clip starts. Music is regenerated with `music.py` at the new length, then
the voice is mixed on top with the music ducked under it (ffmpeg `sidechaincompress`).

⚠️ Generated on the ElevenLabs **free** plan — upgrade to a paid plan (commercial licence)
before using the video with clients; regenerating the clips is enough.
