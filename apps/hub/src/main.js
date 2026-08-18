import { fetchAllManifests, selectPublishedGames, isCloudEnabled } from "./games-storage.js";

const gamesEl = document.getElementById("games");
const statusEl = document.getElementById("status");

function renderGame(game) {
  const card = document.createElement("a");
  card.className = "game-card";
  card.href = game.route;
  const title = document.createElement("h2");
  title.textContent = game.title;
  const description = document.createElement("p");
  description.textContent = game.description;
  card.append(title, description);
  gamesEl.appendChild(card);
}

async function init() {
  if (!isCloudEnabled) {
    statusEl.textContent = "No games published yet.";
    return;
  }
  try {
    const manifests = await fetchAllManifests();
    const games = selectPublishedGames(manifests);
    if (games.length === 0) {
      statusEl.textContent = "No games published yet.";
      return;
    }
    games.forEach(renderGame);
  } catch (err) {
    statusEl.textContent = `Couldn't load games: ${err.message}`;
  }
}

init();
