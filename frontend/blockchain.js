import { connectWallet, disconnectWallet, initWalletListeners, tryRestoreWallet, formatWalletName } from "./wallet.js";
import { contractAddress, abi } from "./constants.js";
import { sendErrorToServer } from "./logger.js";


export async function submitToServer(hits, sessionId, signatureData) {
  if (!signatureData || !signatureData.playerAddress || !signatureData.message || !signatureData.signature) {
    const error = new Error("Signature data not provided");
    await sendErrorToServer(error, { location: "submitToServer validation"});
    throw new Error("Signature data not provided");
  }

  const body = {
    sessionId,
    hits,
    playerAddress: signatureData.playerAddress,
    message: signatureData.message,
    signature: signatureData.signature,
  };

  const response = await fetch("/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json();

    if (!response.ok) {
      if (response.status === 403) {
        alert("Anticheat triggered! You were hitting the ball too fast.");
        const error = new Error("Anticheat triggered: hitting too fast");
        await sendErrorToServer(error, { location: "submitToServer response 403"});
      } else {
        alert("Submission error: " + data.error);
        const error = new Error(`Submission error: ${data.error}`);
        await sendErrorToServer(error, { location: "submitToServer response error"});
      }
    }

    return data;
}


export async function submitToBlockchain(score, playerAddress, timestamp, signature, trustedAddress) {
    if (typeof score !== "number" || isNaN(score) || score <= 0) {
        const error = new Error("Invalid score for blockchain submission.");
        await sendErrorToServer(error, { location:  "submitToBlockchain validation"});
        throw error;
    }

    if (!playerAddress || !timestamp || !signature || !trustedAddress) {
        const error = new Error("Insufficient data for signature verification.");
        await sendErrorToServer(error, { location: "submitToBlockchain validation"});
        throw error;
    }

    const message = `score:${score}|address:${playerAddress.toLowerCase()}|timestamp:${timestamp}`;

    let normalizedSig = signature;
    if (!normalizedSig.startsWith('0x')) {
        normalizedSig = '0x' + normalizedSig;
    }

    if (normalizedSig.length !== 132) {
        const error = new Error("Signature has incorrect length.");
        await sendErrorToServer(error, { location: "signature length validation" });
        throw error;
    }

    let recoveredAddress;
    try {
        recoveredAddress = ethers.verifyMessage(message, normalizedSig);
    } catch (error) {
        await sendErrorToServer(error, { location: "recovering address from signature" });
        throw new Error("Signature is invalid (recovery error).");
    }

    if (recoveredAddress.toLowerCase() !== trustedAddress.toLowerCase()) {
        const error = new Error("Server signature is invalid!");
        await sendErrorToServer(error, { location: "signature mismatch" });
        throw error;
    }


    if (window.ethereum) {
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(contractAddress, abi, signer);

            const tx = await contract.submitScore(score);
            await tx.wait();
        } catch (error) {
            await sendErrorToServer(error, { location: "submitting to blockchain"});
            throw error;
        }
    } else {
        const error = new Error("Ethereum provider not found (e.g. MetaMask).");
        await sendErrorToServer(error, { location: "submitToBlockchain - no ethereum provider" });
        throw error;
    }
}


export async function getMyHighScore() {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(contractAddress, abi, signer);
    const score = await contract.getMyScore();
    return Number(score);
}

export async function getLeaderboard() {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(contractAddress, [
        "function highScores(address) view returns (uint256)",
        "function getPlayers(uint256 start, uint256 count) view returns (address[])"
    ], provider);

    const addresses = await contract.getPlayers(0, 10);
    const results = await Promise.all(addresses.map(async (address) => {
        const score = await contract.highScores(address);
        return {
            address: address.toLowerCase(),
            name: formatWalletName(address),
            score: Number(score)
        };
    }));

    return results.sort((a, b) => b.score - a.score).slice(0, 10);
}

export async function signScoreData(hits, sessionId, signer) {
  const timestamp = Math.floor(Date.now() / 1000);
  const messageObject = {
    hits,
    sessionId,
    timestamp,
  };
  const message = JSON.stringify(messageObject);
  const signature = await signer.signMessage(message);
  const playerAddress = await signer.getAddress();

  return {
    playerAddress,
    message,
    signature,
  };
}


export function verifyServerSignature(score, playerAddress, timestamp, signature, trustedAddress) {
  try {
    const message = `score:${score}|address:${playerAddress.toLowerCase()}|timestamp:${timestamp}`;
    const fixedSignature = signature.startsWith("0x") ? signature : `0x${signature}`;
    const recoveredAddress = ethers.verifyMessage(message, fixedSignature);
    return recoveredAddress.toLowerCase() === trustedAddress.toLowerCase();
  } catch (error) {
    sendErrorToServer(error, { location: "verifyServerSignature"});
    return false;
  }
}