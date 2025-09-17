const globe = Globe()(document.getElementById('globeViz'))
  .globeImageUrl('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg')
  .bumpImageUrl('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png');

const controls = globe.controls();
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableRotate = true;
controls.rotateSpeed = 0.9;
controls.enableZoom = true;
controls.zoomSpeed = 0.5;
controls.minDistance = 200;
controls.maxDistance = 400;
controls.enablePan = false;

let countriesData = [], targetCountry = null, hoveredCountry = null, selectedCountry = null;
let score = 0, attemptsLeft = 3;

fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson')
  .then(res => res.json())
  .then(data => {
    countriesData = data.features;
    globe.polygonsData(countriesData)
      .polygonCapColor(d => d === selectedCountry && d === targetCountry ? 'rgba(34,255,0,0.9)' :
                          d === selectedCountry && d !== targetCountry ? 'rgba(255,0,0,0.8)' :
                          d === hoveredCountry ? 'rgba(255,215,0,0.9)' : 'rgba(0,200,150,0.35)')
      .polygonSideColor(() => 'rgba(0,100,100,0.25)')
      .polygonStrokeColor(() => '#222')
      .polygonAltitude(d => d === hoveredCountry || d === selectedCountry ? 0.06 : 0.012)
      .onPolygonClick(handleClick)
      .onPolygonHover(d => { hoveredCountry = d || null; globe.polygonsData(countriesData); });

    pickRandomCountry();
  });

function pickRandomCountry() {
  targetCountry = countriesData[Math.floor(Math.random() * countriesData.length)];
  selectedCountry = null; hoveredCountry = null; attemptsLeft = 3;
  document.getElementById("countryName").textContent = targetCountry.properties.name;
  document.getElementById("result").textContent = "";
  document.getElementById("selectedCountry").textContent = "None";
  document.getElementById("attempts").textContent = attemptsLeft;
  globe.polygonsData(countriesData);
}

function handleClick(country) {
  selectedCountry = country;
  document.getElementById("selectedCountry").textContent = country.properties.name;
  attemptsLeft--;

  if (country.properties.name === targetCountry.properties.name) {
    document.getElementById("result").textContent = `✅ Correct! ${targetCountry.properties.name}`;
    document.getElementById("result").className = "mt-2 font-semibold text-green-400 animate-bounce";
    score++;
    document.getElementById("score").textContent = score;
    confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });

    controls.rotateSpeed = 5;
    setTimeout(() => { controls.rotateSpeed = 0.9; pickRandomCountry(); }, 2000);
  } else if (attemptsLeft > 0) {
    document.getElementById("result").textContent = "❌ Wrong! Try again.";
    document.getElementById("result").className = "mt-2 font-semibold text-red-400";
    document.getElementById("attempts").textContent = attemptsLeft;
    globe.polygonsData(countriesData);
  } else {
    revealCountry();
  }
}

function skipCountry() { revealCountry(); }
document.getElementById("skipBtn").addEventListener("click", skipCountry);

function revealCountry() {
  const resultDiv = document.getElementById("result");
  resultDiv.textContent = `⏩ The correct country was ${targetCountry.properties.name}`;
  resultDiv.className = "mt-2 font-semibold text-yellow-400";

  selectedCountry = targetCountry;
  globe.polygonsData(countriesData);

  let coords = targetCountry.geometry.coordinates.flat(3);
  let lat = coords.filter((_, i) => i % 2 === 1).reduce((a,b)=>a+b,0)/(coords.length/2);
  let lng = coords.filter((_, i) => i % 2 === 0).reduce((a,b)=>a+b,0)/(coords.length/2);

  globe.pointOfView({ lat, lng, altitude: 1.5 }, 2000);

  setTimeout(() => { selectedCountry = null; pickRandomCountry(); }, 3000);
}
