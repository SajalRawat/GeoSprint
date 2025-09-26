const firebaseConfig = {
  apiKey: "AIzaSyDL-U46Ddub0-FQoxFaBzfz99Ke3gnDrw8",
  authDomain: "globe-cdaf1.firebaseapp.com",
  databaseURL: "https://globe-cdaf1-default-rtdb.firebaseio.com",
  projectId: "globe-cdaf1",
  storageBucket: "globe-cdaf1.firebasestorage.app",
  messagingSenderId: "483773155390",
  appId: "1:483773155390:web:aead8fad85dd61f43a296f",
  measurementId: "G-YSQ8XRH5BG"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// UI Elements
const mainMenu = document.getElementById('mainMenu');
const multiplayerMenu = document.getElementById('multiplayerMenu');
const roomLobby = document.getElementById('roomLobby');
const createRoomView = document.getElementById('createRoomView');
const joinRoomView = document.getElementById('joinRoomView');
const gameUI = document.getElementById('gameUI');
const scorePanel = document.getElementById('scorePanel');
const roomCodeDisplay = document.getElementById('roomCodeDisplay');
const roomCodeInput = document.getElementById('roomCodeInput');
const waitingStatus = document.getElementById('waitingStatus');
const joinError = document.getElementById('joinError');

// Game State
let gameMode = null;
let countriesData = [], targetCountry = null, hoveredCountry = null, selectedCountry = null;
let score = 0, attemptsLeft = 3;
let playerId = null, roomId = null, playerNum = null, roomRef = null;

// NEW: per-round answered lock (local)
let roundAnswered = false;

// GLOBE & AUDIO SETUP
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
controls.minDistance = 145;
controls.maxDistance = 500;
controls.enablePan = false;

const audioLoop = new Audio('assets/loop.mp3');
audioLoop.loop = true;
audioLoop.volume = 0.3;

const audioCorrect = new Audio('assets/correct.wav');
const audioFail = new Audio('assets/fail.wav');
const audioWrong = new Audio('assets/wrong.wav');
const audioSkip = new Audio('assets/skip.mp3');

// Menu Buttons
document.getElementById('soloBtn').addEventListener('click', () => startSoloGame());
document.getElementById('multiplayerBtn').addEventListener('click', showMultiplayerMenu);
document.getElementById('backToMainBtn').addEventListener('click', showMainMenu);
document.getElementById('createRoomBtn').addEventListener('click', createRoom);
document.getElementById('joinRoomBtn').addEventListener('click', showJoinRoomView);
document.getElementById('submitJoinBtn').addEventListener('click', joinRoom);

function showMainMenu() {
    mainMenu.classList.remove('hidden');
    multiplayerMenu.classList.add('hidden');
    roomLobby.classList.add('hidden');
    gameUI.classList.add('hidden');
}

function showMultiplayerMenu() {
    mainMenu.classList.add('hidden');
    multiplayerMenu.classList.remove('hidden');
}

function showJoinRoomView() {
    multiplayerMenu.classList.add('hidden');
    roomLobby.classList.remove('hidden');
    joinRoomView.classList.remove('hidden');
    createRoomView.classList.add('hidden');
}

function startGameUI() {
    mainMenu.classList.add('hidden');
    multiplayerMenu.classList.add('hidden');
    roomLobby.classList.add('hidden');
    gameUI.classList.remove('hidden');
    audioLoop.play();
}


// MULTIPLAYER (FIREBASE) LOGIC
function generatePlayerId() {
    if (!sessionStorage.getItem('playerId')) {
        sessionStorage.setItem('playerId', 'player_' + Math.random().toString(36).substr(2, 9));
    }
    playerId = sessionStorage.getItem('playerId');
}

function createRoom() {
    gameMode = 'multiplayer';
    playerNum = 1;
    generatePlayerId();
    roomId = Math.random().toString(36).substring(2, 7).toUpperCase();
    roomRef = database.ref('rooms/' + roomId);

    const roomData = {
        players: {
            p1: { id: playerId, score: 0 }
        },
        gameState: {
            status: 'waiting',
            targetCountryName: null,
            round: 0,
            // NEW: answered flag in Firebase so all clients can see if round is already claimed
            answered: false
        }
    };

    roomRef.set(roomData).then(() => {
        roomCodeDisplay.textContent = roomId;
        multiplayerMenu.classList.add('hidden');
        roomLobby.classList.remove('hidden');
        createRoomView.classList.remove('hidden');
        joinRoomView.classList.add('hidden');
        listenToRoomChanges();
    });
}

function joinRoom() {
    const enteredRoomId = roomCodeInput.value.toUpperCase();
    if (!enteredRoomId) return;

    gameMode = 'multiplayer';
    playerNum = 2;
    generatePlayerId();
    roomId = enteredRoomId;
    roomRef = database.ref('rooms/' + roomId);

    roomRef.once('value', snapshot => {
        if (snapshot.exists() && Object.keys(snapshot.val().players).length < 2) {
            joinError.textContent = '';
            roomRef.child('players/p2').set({ id: playerId, score: 0 });
            roomRef.child('gameState/status').set('playing');
            listenToRoomChanges();
        } else {
            joinError.textContent = 'Room is full or does not exist.';
        }
    });
}


function listenToRoomChanges() {
    roomRef.on('value', snapshot => {
        const roomData = snapshot.val();
        if (!roomData) return;

        // KEEP local roundAnswered synced with Firebase
        roundAnswered = !!(roomData.gameState && roomData.gameState.answered);

        if (playerNum === 1 && roomData.gameState.status === 'playing' && roomData.gameState.round === 0) {
            startGame();
        }

        if (roomData.gameState.status === 'playing') {
            startGameUI();
        }
        
        updateMultiplayerScore(roomData.players);

        // Sync target country
        if (roomData.gameState.targetCountryName) {
            const newTarget = countriesData.find(c => c.properties.name === roomData.gameState.targetCountryName);
            if (newTarget && (!targetCountry || targetCountry.properties.name !== newTarget.properties.name)) {
                targetCountry = newTarget;
                resetForNewRound();
            }
        }
    });
}


function updateMultiplayerScore(players) {
    const p1Score = players.p1 ? players.p1.score : 0;
    const p2Score = players.p2 ? players.p2.score : 0;
    
    scorePanel.innerHTML = `
        <div class="text-lg font-bold text-green-400">⭐ Scores</div>
        <div class="flex justify-around mt-2">
            <div>
                <div class="text-sm ${players.p1 && players.p1.id === playerId ? 'text-cyan-300' : 'text-gray-300'}">You</div>
                <div class="text-3xl font-extrabold ${players.p1 && players.p1.id === playerId ? 'text-cyan-300' : ''}">${playerNum === 1 ? p1Score : p2Score}</div>
            </div>
            <div>
                <div class="text-sm ${players.p2 && players.p2.id === playerId ? 'text-cyan-300' : 'text-gray-300'}">Opponent</div>
                 <div class="text-3xl font-extrabold ${players.p2 && players.p2.id === playerId ? 'text-cyan-300' : ''}">${playerNum === 1 ? p2Score : p1Score}</div>
            </div>
        </div>
    `;
}


// Fetch country data and initialize globe
fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson')
  .then(res => res.json())
  .then(data => {
    countriesData = data.features.filter(d => d.properties.name !== "Antarctica");
    globe.polygonsData(countriesData)
      .polygonCapColor(d =>
        d === selectedCountry && d === targetCountry ? 'rgba(34,255,0,0.9)' :
        d === selectedCountry && d !== targetCountry ? 'rgba(255,0,0,0.8)' :
        d === hoveredCountry ? 'rgba(255,215,0,0.9)' : 'rgba(0,200,150,0.35)'
      )
      .polygonSideColor(() => 'rgba(0,100,100,0.25)')
      .polygonStrokeColor(() => '#222')
      .polygonAltitude(d => d === hoveredCountry || d === selectedCountry ? 0.06 : 0.012)
      .onPolygonClick(handleClick);

    if (!/Mobi|Android/i.test(navigator.userAgent)) {
      globe.onPolygonHover(d => {
        hoveredCountry = d || null;
        globe.polygonsData(countriesData);
      });
    }
  });


function startSoloGame() {
    gameMode = 'solo';
    score = parseInt(getCookie("gameScore") || '0');
    startGame();
    startGameUI();
}

function startGame() {
    updateSoloScorePanel();
    pickRandomCountry();
}

function updateSoloScorePanel() {
    if (gameMode !== 'solo') return;
    scorePanel.innerHTML = `
      <div class="text-lg font-bold text-green-400">⭐ Score</div>
      <div id="score" class="text-3xl mt-2 font-extrabold text-cyan-300">${score}</div>
      <div class="text-sm text-gray-300 mt-2">Keep guessing to climb up!</div>
    `;
}


function pickRandomCountry() {
    const randomCountry = countriesData[Math.floor(Math.random() * countriesData.length)];
    if (gameMode === 'solo') {
        targetCountry = randomCountry;
        resetForNewRound();
    } else if (gameMode === 'multiplayer' && playerNum === 1) {
        // Player 1 decides the new target; also reset the shared 'answered' flag so clients know round is fresh
        targetCountry = randomCountry; // set local immediately for smoother UI for owner
        roomRef.child('gameState/targetCountryName').set(randomCountry.properties.name);
        roomRef.child('gameState/round').transaction(round => (round || 0) + 1);
        // reset answered flag in firebase for the new round
        roomRef.child('gameState/answered').set(false);
    }
}

function resetForNewRound() {
    selectedCountry = null;
    hoveredCountry = null;
    attemptsLeft = 3;
    // reset local answered flag
    roundAnswered = false;
    document.getElementById("countryName").textContent = targetCountry.properties.name;
    document.getElementById("result").textContent = "";
    document.getElementById("selectedCountry").textContent = "None";
    document.getElementById("attempts").textContent = attemptsLeft;
    document.getElementById('attemptsContainer').classList.remove('hidden');
    globe.polygonsData(countriesData);
}

function handleClick(country) {
    // NEW: ignore clicks if out of attempts or if round already answered (prevents multi-tap exploitation)
    if (attemptsLeft <= 0 || roundAnswered) return;

    selectedCountry = country;
    document.getElementById("selectedCountry").textContent = country.properties.name;
    attemptsLeft--;

    if (country.properties.name === targetCountry.properties.name) {
        handleCorrectGuess();
    } else if (attemptsLeft > 0) {
        handleWrongGuess();
    } else {
        handleOutOfAttempts();
    }
}

function handleCorrectGuess() {
    const resultDiv = document.getElementById("result");
    resultDiv.textContent = `✅ Correct! ${targetCountry.properties.name}`;
    resultDiv.className = "mt-2 font-semibold text-green-400 animate-bounce";
    
    confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
    audioCorrect.play();
    controls.rotateSpeed = 5;
    
    // mark round locally answered immediately to avoid duplicate UI scoring
    roundAnswered = true;

    if (gameMode === 'solo') {
        score++;
        updateSoloScorePanel();
        setCookie("gameScore", score, 30);
        globe.polygonsData(countriesData);

        const delay = 2000;
        setTimeout(() => {
            controls.rotateSpeed = 0.9;
            pickRandomCountry();
        }, delay);

    } else {
        // MULTIPLAYER:
        // Use a firebase transaction on gameState/answered to ensure only the first client to flip it
        // gets to increment its player's score. This avoids race where two taps happen almost-simultaneously.
        const answeredRef = roomRef.child('gameState/answered');
        answeredRef.transaction(current => {
            // if already true, abort (return undefined leaves it unchanged and 'committed' false)
            if (current) return; 
            return true;
        }, (err, committed, snapshot) => {
            if (err) {
                console.error("Answered transaction error:", err);
                // fallback: do not award (prevents dupes)
                return;
            }
            if (!committed) {
                // someone else already claimed the round; do nothing
                return;
            }
            // We are the first to claim the round -> award the score atomically
            roomRef.child(`players/p${playerNum}/score`).transaction(currentScore => (currentScore || 0) + 1);
            globe.polygonsData(countriesData);

            // let everyone see the result locally before picking next
            const delay = 3000;
            setTimeout(() => {
                controls.rotateSpeed = 0.9;
                // Only player 1 should pick the next country in multiplayer (keeps sync)
                if (playerNum === 1) {
                    pickRandomCountry();
                }
            }, delay);
        });
    }
}


function handleWrongGuess() {
    document.getElementById("result").textContent = "❌ Wrong! Try again.";
    document.getElementById("result").className = "mt-2 font-semibold text-red-400";
    document.getElementById("attempts").textContent = attemptsLeft;
    audioFail.play();
    globe.polygonsData(countriesData);
}

function handleOutOfAttempts() {
    audioWrong.play();
    revealCountry();
}

document.getElementById("skipBtn").addEventListener("click", () => {
    audioSkip.play();
    revealCountry();
});

function revealCountry() {
    const resultDiv = document.getElementById("result");
    resultDiv.textContent = `⏩ The correct country was ${targetCountry.properties.name}`;
    resultDiv.className = "mt-2 font-semibold text-yellow-400";

    // claim round locally (prevents further clicks)
    roundAnswered = true;

    selectedCountry = targetCountry;
    globe.polygonsData(countriesData);
    
    let coords = targetCountry.geometry.coordinates.flat(3);
    let lat = coords.filter((_, i) => i % 2 === 1).reduce((a, b) => a + b, 0) / (coords.length / 2);
    let lng = coords.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0) / (coords.length / 2);
    globe.pointOfView({ lat, lng, altitude: 1.5 }, 2000);

    // If multiplayer, mark answered = true so nobody else can score this round
    if (gameMode === 'multiplayer') {
        roomRef.child('gameState/answered').set(true);
    }

    setTimeout(() => {
        if (gameMode === 'solo' || (gameMode === 'multiplayer' && playerNum === 1)) {
            pickRandomCountry();
        }
    }, 3000);
}

// Cookies

function setCookie(name, value, days) {
  const d = new Date();
  d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
  document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/`;
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}
