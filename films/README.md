# Films

Short films made with code (the cinecode kit, quick mode). Each folder holds one film: `film.html` (picture and sound in one file), `STATE.md` (the plan, the director card and where the film stands), `notes/` (the user's notes per round), `LICENSES.csv` (every outside file and its licence) and `tools/` (the render and check scripts).

| Folder | Film | Where it stands |
|---|---|---|
| `arabica-zamzam/` | Arabica Zamzam Coffee, 20 s ad, 9:16 | Draft v3 rejected: the illustrated look read as a children's film. Kept as a reference; the brand needs real footage. |
| `to-set-a-fire/` | To Set a Fire, 18 s YouTube Short, 9:16 | Draft v6. Visuals done (ember, stacked words, fire, sparks into the last line). On hold: the words need rewriting so the first lines and the last line say one thing. |

## Rendering again

Needs Node 22+, Python 3, ffmpeg and Chrome, plus the cinecode kit installed as a skill (`git clone https://github.com/sarpstar/cinecode ~/.claude/skills/cinecode`). From a film's folder:

```
python3 tools/make.py stills     # key frames as one sheet
python3 tools/make.py draft      # half-size draft with sound and checks
python3 tools/make.py final      # full size
```

Music files are CC BY recordings; their credit lines are in each film's `LICENSES.csv` and must go in the video description when published.
