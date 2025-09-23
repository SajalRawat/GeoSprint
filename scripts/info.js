const globeEl = document.getElementById("globeViz");
const globe = Globe()
  (globeEl)
  .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
  .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png');

const controls = globe.controls();
controls.enableZoom = true;
controls.maxDistance = 500;
controls.minDistance = 200;

let hoverD = null;
const infoBox = document.getElementById("infoBox");
const countryNameEl = document.getElementById("countryName");
const countryInfoEl = document.getElementById("countryInfo");
const closeBtn = document.getElementById("closeBtn");

// Initial globe animation
setTimeout(() => globeEl.classList.add("active"), 300);

closeBtn.addEventListener("click", () => {
  if (window.innerWidth <= 768) {
    infoBox.classList.remove("show");
    setTimeout(() => { infoBox.style.display = "none"; }, 500);
  } else {
    infoBox.style.display = "none";
  }
  globeEl.classList.remove("hidden");
  globeEl.classList.add("active");
});

// Load country data
fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson')
  .then(res => res.json())
  .then(countries => {
    globe
      .polygonsData(countries.features)
      .polygonCapColor(d => d === hoverD ? 'rgba(0,200,150,0.6)' : 'rgba(0,200,150,0.4)')
      .polygonSideColor(d => d === hoverD ? 'rgba(0,100,100,0.5)' : 'rgba(0,100,100,0.2)')
      .polygonStrokeColor(() => '#111')
      .onPolygonHover(d => {
        hoverD = d || null;
        globe.polygonsData(countries.features);
      })
      .onPolygonClick(d => {
        const countryName = d.properties.name;
        countryNameEl.textContent = countryName;
        countryInfoEl.textContent = "Loading...";

        // Rotate & zoom to country centroid
        if (d && d.geometry && d.geometry.type === "Polygon") {
          const coords = d.geometry.coordinates[0][0]; 
          const lng = coords[0], lat = coords[1];
          globe.pointOfView({ lat, lng, altitude: 1.5 }, 2000);
        }

        // Fetch summary from Wikipedia API
        fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(countryName)}`)
          .then(r => r.json())
          .then(data => {
            if (data.extract) {
              countryInfoEl.textContent = data.extract;
            } else {
              countryInfoEl.textContent = "No information available.";
            }
          })
          .catch(() => {
            countryInfoEl.textContent = "Error loading information.";
          });

        // Animate globe out & show info box
        setTimeout(() => {
          globeEl.classList.remove("active");
          globeEl.classList.add("hidden");
          infoBox.style.display = "block";
          if (window.innerWidth <= 768) {
            setTimeout(() => infoBox.classList.add("show"), 50);
          }
        }, 1800);
      });
  });
