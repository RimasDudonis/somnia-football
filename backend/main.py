import json
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from uuid import uuid4
from time import time
from eth_account import Account
from eth_account.messages import encode_defunct
from eth_utils import is_address
from dotenv import load_dotenv
from pathlib import Path
import os
from cachetools import TTLCache
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from backend.logger import backend_logger, frontend_logger


env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

PRIVATE_KEY = os.getenv("SERVER_SIGNING_KEY")
if not PRIVATE_KEY:
    raise RuntimeError("SERVER_SIGNING_KEY is not set in environment variables")
TRUSTED_ACCOUNT = Account.from_key(PRIVATE_KEY).address

app = FastAPI()
app.mount("/static", StaticFiles(directory="frontend"), name="static")

leaderboard = []
sessions = {}
used_signatures = TTLCache(maxsize=10000, ttl=300)
_cached_leaderboard = None
_cached_leaderboard_time = 0
CACHE_TTL = 30
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter


def verify_player_signature(player_address: str, message: str, signature: str) -> bool:
    try:
        encoded_message = encode_defunct(text=message)
        recovered_address = Account.recover_message(encoded_message, signature=signature)
        return recovered_address.lower() == player_address.lower()
    except Exception as e:
        backend_logger.warning(f"Signature verification error: {e}")
        return False


def sign_score(score: int, player_address: str, timestamp: int) -> str:
    message = f"score:{score}|address:{player_address.lower()}|timestamp:{timestamp}"
    eth_message = encode_defunct(text=message)
    signed_message = Account.sign_message(eth_message, private_key=PRIVATE_KEY)
    return signed_message.signature.hex()


@app.exception_handler(RateLimitExceeded)
async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        {"error": "Too many requests to leaderboard. Please try again later."},
        status_code=429,
    )


@app.post("/api/log-error")
async def log_error(request: Request):
    data = await request.json()
    frontend_logger.error(f"Frontend error: {json.dumps(data)}")
    return {"status": "logged"}


@app.get("/", response_class=HTMLResponse)
async def get():
    return FileResponse("frontend/index.html")


@app.get("/leaders")
@limiter.limit("5/second")
async def get_leaderboard(request: Request):
    global _cached_leaderboard, _cached_leaderboard_time

    now = time()
    if _cached_leaderboard and (now - _cached_leaderboard_time) < CACHE_TTL:
        return _cached_leaderboard

    top_players = sorted(leaderboard, key=lambda x: x["score"], reverse=True)[:10]
    response = JSONResponse(top_players)

    _cached_leaderboard = response
    _cached_leaderboard_time = now

    return response


@app.post("/start")
async def start_session(request: Request):
    data = await request.json()
    name = data.get("name", "Unknown")
    session_id = str(uuid4())
    sessions[session_id] = {
        "start_time": time(),
        "name": name
    }
    backend_logger.info(f"Session started: {session_id} for player {name}")
    return JSONResponse({"sessionId": session_id})


@app.post("/submit")
async def submit_score(request: Request):
    data = await request.json()
    session_id = data.get("sessionId")
    hits = data.get("hits")
    player_address = data.get("playerAddress")
    message = data.get("message")
    signature = data.get("signature")

    if not message or not signature:
        backend_logger.info(
            f"Submit rejected: missing signature data. session_id={session_id}, player_address={player_address}")
        return JSONResponse({"error": "Missing signature data."}, status_code=400)

    if signature in used_signatures:
        backend_logger.warning(
            f"Replay attack detected: signature reused. session_id={session_id}, player_address={player_address}")
        return JSONResponse({"error": "Replay detected."}, status_code=403)

    used_signatures[signature] = True

    try:
        parsed_message = json.loads(message)
        timestamp = parsed_message.get("timestamp")
        if not isinstance(timestamp, int):
            raise ValueError("Timestamp missing or not an integer")
        now = int(time())
        if abs(now - timestamp) > 60:
            backend_logger.warning(
                f"Expired signature. session_id={session_id}, player_address={player_address}, timestamp={timestamp}")
            return JSONResponse({"error": "Signature expired."}, status_code=403)
    except Exception as e:
        backend_logger.info(f"Invalid message format: {e}. session_id={session_id}, player_address={player_address}")
        return JSONResponse({"error": "Invalid message format."}, status_code=400)

    if not verify_player_signature(player_address, message, signature):
        backend_logger.warning(f"Invalid signature. session_id={session_id}, player_address={player_address}")
        return JSONResponse({"error": "Invalid signature."}, status_code=403)

    try:
        hits = int(hits)
    except (TypeError, ValueError):
        backend_logger.info(f"Invalid hits count: {hits}. session_id={session_id}, player_address={player_address}")
        return JSONResponse({"error": "Invalid hits count."}, status_code=400)

    if hits <= 0:
        backend_logger.info(
            f"Non-positive hits submitted: {hits}. session_id={session_id}, player_address={player_address}")
        return JSONResponse({"error": "Hits must be positive."}, status_code=400)

    if not is_address(player_address):
        backend_logger.info(f"Invalid player address format: {player_address}. session_id={session_id}")
        return JSONResponse({"error": "Invalid player address."}, status_code=400)

    session = sessions.get(session_id)
    if not session:
        backend_logger.info(f"Invalid session id: {session_id}. player_address={player_address}")
        return JSONResponse({"error": "Invalid session."}, status_code=400)

    duration = time() - session["start_time"]
    min_hit_time = 0.3
    max_hits = duration / min_hit_time

    if hits > max_hits:
        backend_logger.warning(f"Anticheat triggered! Hits: {hits} > max allowed: {max_hits}, session: {session_id}")
        return JSONResponse(
            {"error": "Anticheat radar triggered! Too many hits for the time."},
            status_code=403
        )

    score = hits
    timestamp = int(time())
    server_signature = sign_score(score, player_address, timestamp)

    leaderboard.append({
        "name": session["name"],
        "score": score
    })

    global _cached_leaderboard, _cached_leaderboard_time
    _cached_leaderboard = None
    _cached_leaderboard_time = 0

    del sessions[session_id]

    return JSONResponse({
        "score": score,
        "timestamp": timestamp,
        "signature": server_signature,
        "trusted": TRUSTED_ACCOUNT
    })

