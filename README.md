# GeoSprint

GeoSprint is an interactive 3D globe project that provides a geography quiz game and an informational globe view. The project uses Three.js and Globe.gl for visualization and is implemented with plain HTML, CSS, and JavaScript.

## Features

- Clickable country polygons rendered on a 3D globe.
- Game mode: guess the target country by clicking on the globe, with per-round attempts, skip, and score tracking.
- Info view: select a country to see basic details.
- Audio feedback and confetti on correct answers.
- Score persistence using a browser cookie.

## Technologies

- Three.js
- Globe.gl
- canvas-confetti
- Plain HTML, CSS, JavaScript

## How to run (Windows)

1. Clone the repository and open the GeoSprint folder:
   ```powershell
   git clone https://github.com/SajalRawat/Project-GlobeGL.git
   cd Project-GlobeGL/GeoSprint
   ```

2. Start a local HTTP server (recommended because browsers may block certain requests when using file://):
   - With Python 3:
     ```powershell
     python -m http.server 8000
     ```
     Then open: http://localhost:8000/index.html

   - Or use VS Code Live Server and open index.html.

## Implementation notes

- Country polygons are fetched from:
  https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson
- The globe uses marble and bump textures served from jsdelivr in scripts/game.js.
- Score persistence uses simple setCookie/getCookie helpers; the cookie name used by the game is `gameScore`.
- Camera centering for the selected country uses a simple centroid approximation based on polygon coordinates; multi-part or complex geometries may not center perfectly.
- Audio may be blocked from autoplay by browsers; interact with the page once to enable sound playback.

## Troubleshooting

- If polygons or assets do not load, verify a local server is running and the internet connection is available for external assets.
- Use the browser developer console to inspect network and runtime errors.
- If audio does not play, click anywhere on the page to allow playback.

## Contributing

Fork the repository, create a feature branch, and open a pull request with a clear description of changes.

## Credits

- Info page: Sajal Rawat (https://github.com/SajalRawat)  
- Game panel: J R Deva Dattan (https://github.com/jrdevadattan)