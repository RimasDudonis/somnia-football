import { contractAddress, abi, chainId, somChainNetworkParams } from "./constants.js";
import { sendErrorToServer } from "./logger.js";


export function formatWalletName(address) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export async function connectWallet() {
    if (typeof window.ethereum === "undefined") {
        alert("MetaMask or Rabby Wallet not found. Please install one of the extensions.");
        return;
    }

    try {
        const accounts = await window.ethereum.request({
            method: "eth_requestAccounts"
        });
        const walletAddress = accounts[0].toLowerCase();

        try {
            await window.ethereum.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId }],
            });
        } catch (switchError) {
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: "wallet_addEthereumChain",
                        params: [somChainNetworkParams],
                    });
                } catch (addError) {
                    await sendErrorToServer(addError, { location: "Failed to add network"});
                    alert("Error adding the network.");
                    return;
                }
            } else {
                await sendErrorToServer(switchError, { location: "Failed to switch network"});
                alert("Error switching network.");
                return;
            }
        }

        localStorage.setItem("playerAddress", walletAddress);

        const walletArea = document.getElementById("walletArea");
        walletArea.innerHTML = "";

        const button = document.createElement("button");
        button.className = "wallet-name";
        button.textContent = formatWalletName(walletAddress);
        button.addEventListener("click", disconnectWallet);

        walletArea.appendChild(button);

    } catch (error) {
        await sendErrorToServer(error, { location: "Connection error"});
        alert("Error connecting wallet. Please check MetaMask and try again.");
    }
}


export function disconnectWallet() {
    localStorage.removeItem("playerAddress");
    const walletArea = document.getElementById("walletArea");
    walletArea.innerHTML = "";

    const button = document.createElement("button");
    button.id = "connectButton";
    button.className = "menu-button";
    button.textContent = "Connect Wallet";
    button.addEventListener("click", connectWallet);

    walletArea.appendChild(button);
}

export function initWalletListeners() {
  if (!window.ethereum) return;

  window.ethereum.on("accountsChanged", async (accounts) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else {
      const walletAddress = accounts[0].toLowerCase();
      localStorage.setItem("playerAddress", walletAddress);
      updateWalletUI(walletAddress);
    }
  });

    window.ethereum.on("chainChanged", async (chainId) => {
      const desiredChainId = "0xC488";

      console.log("Detected chain change to:", chainId);

      if (chainId.toLowerCase() !== desiredChainId) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: desiredChainId }],
          });
        } catch (switchError) {
          await sendErrorToServer(switchError, { location: "Switch network failed"});

          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [somChainNetworkParams],
              });
              await window.ethereum.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: desiredChainId }],
              });
            } catch (addError) {
              await sendErrorToServer(addError, { location: "Add network failed"});
              alert("Error adding Somnia Testnet");
            }
          } else {
            const error = "Error switching to Somnia Testnet: unknown error";
            await sendErrorToServer(error, { location: "Network switch fallback"});
            alert("Error switching to Somnia Testnet");
          }
        }
      }
    });
}

function updateWalletUI(walletAddress) {
  const walletArea = document.getElementById("walletArea");
  walletArea.innerHTML = "";

  const button = document.createElement("button");
  button.className = "wallet-name";
  button.textContent = formatWalletName(walletAddress);
  button.addEventListener("click", disconnectWallet);

  walletArea.appendChild(button);
}

export async function tryRestoreWallet() {
  if (!window.ethereum) return;

  try {
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    if (accounts.length > 0) {
      const walletAddress = accounts[0].toLowerCase();
      localStorage.setItem("playerAddress", walletAddress);
      updateWalletUI(walletAddress);
    } else {
      disconnectWallet();
    }
  } catch (error) {
    await sendErrorToServer(error, { location: "Error restoring wallet"});
  }
}