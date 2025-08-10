import { connectWallet, disconnectWallet, formatWalletName, initWalletListeners } from './wallet.js';
import { submitToBlockchain, getMyHighScore, getLeaderboard,} from './blockchain.js';
import { startGameLogic, showResult } from './game.js';
import { sendErrorToServer } from "./logger.js";

window.connectWallet = connectWallet;
window.disconnectWallet = disconnectWallet;
window.openSettings = openSettings;
window.openLeaderboard = openLeaderboard;

let isSoundOn = true;

window.onload = () => {
    const mainMenu = document.getElementById("mainMenu");
    const scoreElement = document.getElementById("score");
    const canvas = document.getElementById("gameCanvas");
    const settingsMenu = document.getElementById("settingsMenu");
    const soundToggle = document.getElementById("soundToggle");

    document.getElementById("connectButton").addEventListener("click", connectWallet);
    document.getElementById("settingsButton").addEventListener("click", openSettings);
    document.getElementById("backFromSettingsButton").addEventListener("click", closeSettings);
    document.getElementById("leaderboardButton").addEventListener("click", openLeaderboard);
    document.getElementById("backFromLeaderboardButton").addEventListener("click", closeLeaderboard);

    initWalletListeners();

    const savedSoundSetting = localStorage.getItem("sound");
    if (savedSoundSetting !== null) {
        isSoundOn = savedSoundSetting === "on";
        soundToggle.checked = isSoundOn;
    }

    const savedAddress = localStorage.getItem("playerAddress");
    if (savedAddress) {
        const formattedName = formatWalletName(savedAddress);
        document.getElementById("walletArea").innerHTML = `
      <button class="wallet-name" onclick="disconnectWallet()">${formattedName}</button>
    `;
    }

    soundToggle.addEventListener("change", () => {
        isSoundOn = soundToggle.checked;
        localStorage.setItem("sound", isSoundOn ? "on" : "off");
    });

    document.getElementById("startButton").onclick = function startGame() {
        mainMenu.classList.add("hidden");
        settingsMenu.classList.add("hidden");
        canvas.style.display = "block";
        scoreElement.style.display = "none";

        if (typeof startGameLogic === "function") {
            startGameLogic();
        } else {
            sendErrorToServer(new Error("startGameLogic is not defined!"));
        }
    };
};

function openSettings() {
    document.getElementById("mainMenu").classList.add("hidden");
    document.getElementById("settingsMenu").classList.remove("hidden");
}

function closeSettings() {
    document.getElementById("settingsMenu").classList.add("hidden");
    document.getElementById("mainMenu").classList.remove("hidden");
}

function openLeaderboard() {
    loadLeaderboardFromBlockchain();
    document.getElementById("mainMenu").classList.add("hidden");
    document.getElementById("leaderboardMenu").classList.remove("hidden");
}

function closeLeaderboard() {
    document.getElementById("leaderboardMenu").classList.add("hidden");
    document.getElementById("mainMenu").classList.remove("hidden");
}

async function loadLeaderboardFromBlockchain() {
    const listElement = document.querySelector(".leaderboard-list");
    const yourScoreElement = document.querySelector(".your-score");

    try {
        const leaderboard = await getLeaderboard();
        listElement.innerHTML = "";
        leaderboard.forEach((entry, index) => {
            const li = document.createElement("li");
            li.textContent = `${entry.name} — ${entry.score}`;
            listElement.appendChild(li);
        });

        const playerAddress = localStorage.getItem("playerAddress");
        const yourEntry = leaderboard.find(e => e.address === playerAddress);
        if (yourEntry) {
            yourScoreElement.textContent = `Your result: ${yourEntry.score}`;
        } else {
            yourScoreElement.textContent = "Your result: not ranked";
        }

    } catch (error) {
        sendErrorToServer(error, { location: "loading data"});
        listElement.innerHTML = "<li>Error loading data.</li>";
        yourScoreElement.textContent = "Your result: —";
    }
}
