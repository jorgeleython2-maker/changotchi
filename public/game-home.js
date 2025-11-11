function startGame() {
  const homeScreen = document.getElementById("home-screen")
  const gameScreen = document.getElementById("game-screen")

  homeScreen.classList.add("hidden")
  gameScreen.classList.remove("hidden")

  // Initialize game when screen becomes visible
  const initializeGame = () => {
    // Placeholder for game initialization logic
    console.log("Game initialized")
  }

  const gameTick = () => {
    // Placeholder for game tick logic
    console.log("Game tick")
  }

  initializeGame()
  setInterval(gameTick, 1000)
}

function goHome() {
  const homeScreen = document.getElementById("home-screen")
  const gameScreen = document.getElementById("game-screen")
  const winScreen = document.getElementById("win-screen")
  const loseScreen = document.getElementById("lose-screen")

  homeScreen.classList.remove("hidden")
  gameScreen.classList.add("hidden")
  winScreen.classList.add("hidden")
  loseScreen.classList.add("hidden")

  // Reset game state
  location.reload()
}

window.addEventListener("DOMContentLoaded", () => {
  const homeBackgroundContainer = document.getElementById("homeBackgroundContainer")

  // You can add file upload handlers here if needed
  // For now, users can edit the src attributes directly in the HTML
})
