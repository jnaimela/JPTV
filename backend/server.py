from fastapi import FastAPI, APIRouter, HTTPException, Request, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import random
import bcrypt
import jwt
from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"

# Pydantic Models

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    username: str
    password_hash: str
    is_premium: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class UserCreate(BaseModel):
    email: str
    username: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    username: str
    is_premium: bool
    created_at: str

class Match(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    home_team: str
    away_team: str
    sport: str
    start_time: str
    status: str  # upcoming, live, finished
    home_odds: float
    away_odds: float
    draw_odds: Optional[float] = None
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MatchCreate(BaseModel):
    home_team: str
    away_team: str
    sport: str
    start_time: str
    home_odds: float
    away_odds: float
    draw_odds: Optional[float] = None

class Bet(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    match_id: str
    bet_type: str  # home, away, draw
    odds: float
    amount: float
    status: str  # pending, won, lost
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class BetCreate(BaseModel):
    match_id: str
    bet_type: str
    odds: float
    amount: float

class BetSlip(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    bets: List[Dict[str, Any]]
    total_odds: float
    total_amount: float
    status: str  # pending, won, lost
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class BetSlipCreate(BaseModel):
    bets: List[Dict[str, Any]]
    total_amount: float

class Statistic(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    team: str
    sport: str
    year: int
    wins: int
    losses: int
    draws: int
    goals_scored: Optional[int] = None
    goals_conceded: Optional[int] = None

class AIPrediction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    match_id: str
    prediction: str
    confidence: float
    analysis: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PaymentTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    session_id: str
    amount: float
    currency: str
    payment_status: str
    status: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CheckoutRequest(BaseModel):
    package_id: str

# Helper functions
def create_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> Dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")
    token = authorization.split(" ")[1]
    return verify_token(token)

# Auth Routes
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    password_hash = bcrypt.hashpw(user_data.password.encode(), bcrypt.gensalt()).decode()
    user = User(
        email=user_data.email,
        username=user_data.username,
        password_hash=password_hash
    )
    
    doc = user.model_dump()
    await db.users.insert_one(doc)
    
    token = create_token(user.id, user.email)
    return {"token": token, "user": UserProfile(**{k: v for k, v in doc.items() if k != "password_hash"})}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not bcrypt.checkpw(credentials.password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["email"])
    return {"token": token, "user": UserProfile(**{k: v for k, v in user.items() if k != "password_hash"})}

# Match Routes
@api_router.get("/matches")
async def get_matches(status: Optional[str] = None):
    query = {}
    if status:
        query["status"] = status
    matches = await db.matches.find(query, {"_id": 0}).to_list(100)
    return matches

@api_router.post("/matches")
async def create_match(match_data: MatchCreate):
    match = Match(
        **match_data.model_dump(),
        status="upcoming"
    )
    doc = match.model_dump()
    await db.matches.insert_one(doc)
    return match

@api_router.get("/matches/{match_id}")
async def get_match(match_id: str):
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return match

# Bet Routes
@api_router.post("/bets")
async def create_bet(bet_data: BetCreate, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    
    bet = Bet(
        user_id=user["user_id"],
        **bet_data.model_dump(),
        status="pending"
    )
    doc = bet.model_dump()
    await db.bets.insert_one(doc)
    return bet

@api_router.get("/bets")
async def get_user_bets(authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    bets = await db.bets.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    return bets

# Bet Slip Routes
@api_router.post("/bet-slips")
async def create_bet_slip(slip_data: BetSlipCreate, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    
    total_odds = 1.0
    for bet in slip_data.bets:
        total_odds *= bet["odds"]
    
    bet_slip = BetSlip(
        user_id=user["user_id"],
        bets=slip_data.bets,
        total_odds=total_odds,
        total_amount=slip_data.total_amount,
        status="pending"
    )
    doc = bet_slip.model_dump()
    await db.bet_slips.insert_one(doc)
    return bet_slip

@api_router.get("/bet-slips")
async def get_user_bet_slips(authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    slips = await db.bet_slips.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    return slips

# Statistics Routes
@api_router.get("/statistics")
async def get_statistics(team: Optional[str] = None, sport: Optional[str] = None):
    query = {}
    if team:
        query["team"] = team
    if sport:
        query["sport"] = sport
    stats = await db.statistics.find(query, {"_id": 0}).to_list(100)
    return stats

# AI Routes
@api_router.post("/ai/generate-bet")
async def generate_bet(match_id: str, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    user_doc = await db.users.find_one({"id": user["user_id"]}, {"_id": 0})
    
    if not user_doc.get("is_premium"):
        raise HTTPException(status_code=403, detail="Premium subscription required")
    
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Get AI prediction
    llm_key = os.getenv("EMERGENT_LLM_KEY")
    chat = LlmChat(
        api_key=llm_key,
        session_id=f"bet_gen_{match_id}",
        system_message="You are an expert sports betting analyst. Analyze matches and provide betting recommendations."
    ).with_model("openai", "gpt-5.2")
    
    prompt = f"""Analyze this match and provide a betting recommendation:
    Home Team: {match['home_team']} (Odds: {match['home_odds']})
    Away Team: {match['away_team']} (Odds: {match['away_odds']})
    Sport: {match['sport']}
    
    Provide:
    1. Your prediction (home/away/draw)
    2. Confidence level (0-100%)
    3. Brief analysis (2-3 sentences)
    
    Format: PREDICTION|CONFIDENCE|ANALYSIS"""
    
    response = await chat.send_message(UserMessage(text=prompt))
    parts = response.split("|")
    
    prediction = AIPrediction(
        match_id=match_id,
        prediction=parts[0].strip() if len(parts) > 0 else "home",
        confidence=float(parts[1].strip().replace("%", "")) / 100 if len(parts) > 1 else 0.75,
        analysis=parts[2].strip() if len(parts) > 2 else response
    )
    
    doc = prediction.model_dump()
    await db.predictions.insert_one(doc)
    return prediction

@api_router.post("/ai/analyze-match")
async def analyze_match(match_id: str, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    user_doc = await db.users.find_one({"id": user["user_id"]}, {"_id": 0})
    
    if not user_doc.get("is_premium"):
        raise HTTPException(status_code=403, detail="Premium subscription required")
    
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Get team statistics
    home_stats = await db.statistics.find({"team": match["home_team"]}, {"_id": 0}).to_list(5)
    away_stats = await db.statistics.find({"team": match["away_team"]}, {"_id": 0}).to_list(5)
    
    llm_key = os.getenv("EMERGENT_LLM_KEY")
    chat = LlmChat(
        api_key=llm_key,
        session_id=f"analysis_{match_id}",
        system_message="You are an expert sports analyst providing detailed match analysis."
    ).with_model("openai", "gpt-5.2")
    
    prompt = f"""Provide detailed analysis for this match:
    {match['home_team']} vs {match['away_team']}
    Sport: {match['sport']}
    Home Odds: {match['home_odds']}, Away Odds: {match['away_odds']}
    
    Home Team Stats: {home_stats}
    Away Team Stats: {away_stats}
    
    Provide comprehensive analysis covering:
    - Team form
    - Head-to-head history
    - Key factors
    - Betting value assessment"""
    
    analysis = await chat.send_message(UserMessage(text=prompt))
    return {"match_id": match_id, "analysis": analysis}

# User Profile Routes
@api_router.get("/user/profile")
async def get_profile(authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    user_doc = await db.users.find_one({"id": user["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    return UserProfile(**{k: v for k, v in user_doc.items() if k != "password_hash"})

@api_router.get("/user/history")
async def get_user_history(authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    bets = await db.bets.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return bets

# Payment Routes
PACKAGES = {"premium_monthly": 9.99, "premium_yearly": 99.99}

@api_router.post("/payments/checkout")
async def create_checkout(checkout_req: CheckoutRequest, request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    
    if checkout_req.package_id not in PACKAGES:
        raise HTTPException(status_code=400, detail="Invalid package")
    
    amount = PACKAGES[checkout_req.package_id]
    origin_url = request.headers.get("origin", str(request.base_url).rstrip("/"))
    
    success_url = f"{origin_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/pricing"
    
    stripe_key = os.getenv("STRIPE_API_KEY")
    webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_key, webhook_url=webhook_url)
    
    checkout_request = CheckoutSessionRequest(
        amount=amount,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"user_id": user["user_id"], "package": checkout_req.package_id}
    )
    
    session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction
    payment = PaymentTransaction(
        user_id=user["user_id"],
        session_id=session.session_id,
        amount=amount,
        currency="usd",
        payment_status="pending",
        status="initiated"
    )
    await db.payment_transactions.insert_one(payment.model_dump())
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    
    stripe_key = os.getenv("STRIPE_API_KEY")
    stripe_checkout = StripeCheckout(api_key=stripe_key, webhook_url="")
    
    status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
    
    # Update payment transaction
    existing = await db.payment_transactions.find_one({"session_id": session_id, "payment_status": {"$ne": "paid"}}, {"_id": 0})
    
    if existing and status.payment_status == "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": status.payment_status, "status": "completed"}}
        )
        
        # Update user to premium
        await db.users.update_one(
            {"id": existing["user_id"]},
            {"$set": {"is_premium": True}}
        )
    
    return status.model_dump()

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    stripe_key = os.getenv("STRIPE_API_KEY")
    stripe_checkout = StripeCheckout(api_key=stripe_key, webhook_url="")
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Seed data endpoint (for demo)
@api_router.post("/seed-data")
async def seed_data():
    # Clear existing data
    await db.matches.delete_many({})
    await db.statistics.delete_many({})
    
    # Seed matches
    sports = ["Football", "Basketball", "Ice Hockey", "Tennis"]
    teams = {
        "Football": ["Liverpool", "Manchester United", "Barcelona", "Real Madrid", "Bayern Munich", "PSG"],
        "Basketball": ["Lakers", "Celtics", "Warriors", "Heat", "Bucks", "Nets"],
        "Ice Hockey": ["Penguins", "Capitals", "Maple Leafs", "Canadiens", "Bruins", "Rangers"],
        "Tennis": ["Nadal", "Djokovic", "Federer", "Alcaraz", "Medvedev", "Tsitsipas"]
    }
    
    matches = []
    for sport in sports:
        for i in range(10):
            home = random.choice(teams[sport])
            away = random.choice([t for t in teams[sport] if t != home])
            
            match = Match(
                home_team=home,
                away_team=away,
                sport=sport,
                start_time=(datetime.now(timezone.utc) + timedelta(days=random.randint(0, 7))).isoformat(),
                status=random.choice(["upcoming", "live", "upcoming", "upcoming"]),
                home_odds=round(random.uniform(1.5, 3.5), 2),
                away_odds=round(random.uniform(1.5, 3.5), 2),
                draw_odds=round(random.uniform(2.5, 4.5), 2) if sport in ["Football", "Ice Hockey"] else None
            )
            matches.append(match.model_dump())
    
    await db.matches.insert_many(matches)
    
    # Seed statistics
    stats = []
    for sport, team_list in teams.items():
        for team in team_list:
            for year in range(2020, 2026):
                stat = Statistic(
                    team=team,
                    sport=sport,
                    year=year,
                    wins=random.randint(10, 40),
                    losses=random.randint(5, 30),
                    draws=random.randint(0, 15),
                    goals_scored=random.randint(30, 100) if sport in ["Football", "Ice Hockey", "Basketball"] else None,
                    goals_conceded=random.randint(20, 80) if sport in ["Football", "Ice Hockey", "Basketball"] else None
                )
                stats.append(stat.model_dump())
    
    await db.statistics.insert_many(stats)
    
    return {"message": "Data seeded successfully", "matches": len(matches), "statistics": len(stats)}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()