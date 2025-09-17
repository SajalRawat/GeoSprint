// Initialize Globe
const globe = Globe()
  (document.getElementById('globeViz'))
  .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
  .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png');

// Controls
const controls = globe.controls();
controls.enableZoom = true;
controls.maxDistance = 400;
controls.minDistance = 200;
controls.zoomSpeed = 1.0;

// Hover Tracking
let hoverD = null;

// Popup Elements
const infoCard = document.getElementById('infoCard');
const closeBtn = document.getElementById('closeBtn');

closeBtn.addEventListener('click', () => {
  infoCard.classList.add('hidden');
});

// Fetch Country Data from REST API
async function getCountryInfo(name) {
  try {
    const res = await fetch(`https://restcountries.com/v3.1/name/${name}?fullText=true`);
    const data = await res.json();
    const country = data[0];

    // Fill popup content
    document.getElementById('countryName').innerText = country.name.common;
    document.getElementById('countryCapital').innerText = country.capital ? country.capital[0] : "N/A";
    document.getElementById('countryRegion').innerText = country.region;
    document.getElementById('countryPopulation').innerText = country.population.toLocaleString();
    document.getElementById('countryCurrency').innerText = country.currencies ? 
      Object.values(country.currencies)[0].name : "N/A";
    document.getElementById('countryFlag').src = country.flags.png;

    infoCard.classList.remove('hidden');
  } catch (error) {
    console.error("Error fetching country info:", error);
  }
}

// Load Countries
fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson')
  .then(res => res.json())
  .then(countries => {
    globe
      .polygonsData(countries.features)
      .polygonCapColor(d => d === hoverD ? 'rgba(0,200,150,0.6)' : 'rgba(0,200,150,0.4)')
      .polygonSideColor(d => d === hoverD ? 'rgba(0,100,100,0.5)' : 'rgba(0,100,100,0.2)')
      .polygonStrokeColor(d => d === hoverD ? '#ffcc00' : '#111')
      .onPolygonHover(d => {
        hoverD = d || null;
        globe.polygonsData(countries.features); // refresh
      })
      .onPolygonClick(d => {
        const countryName = d.properties.name;
        getCountryInfo(countryName); // fetch and show popup
      });
  });
