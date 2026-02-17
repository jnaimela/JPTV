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
    subscription_tier: str = "free"  # free, basic, pro, premium, admin
    free_analyses_used: int = 0
    is_admin: bool = False
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
    subscription_tier: str
    free_analyses_used: int
    is_admin: bool
    created_at: str

class Match(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    home_team: str
    away_team: str
    sport: str
    league: str
    start_time: str
    status: str
    home_form: Optional[str] = None
    away_form: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Analysis(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    match_id: str
    prediction: str
    confidence: float
    key_factors: List[str]
    stats_analysis: str
    betting_tips: List[str]
    full_analysis: str
    preview: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PaymentTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    session_id: str
    amount: float
    currency: str
    tier: str
    payment_status: str
    status: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CheckoutRequest(BaseModel):
    tier: str

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
async def get_matches(sport: Optional[str] = None, league: Optional[str] = None):
    query = {}
    if sport:
        query["sport"] = sport
    if league:
        query["league"] = league
    matches = await db.matches.find(query, {"_id": 0}).sort("start_time", 1).to_list(100)
    return matches

@api_router.get("/matches/{match_id}")
async def get_match(match_id: str):
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return match

# Analysis Routes
@api_router.get("/analyses")
async def get_analyses(sport: Optional[str] = None):
    query = {}
    if sport:
        # Get matches for this sport
        matches = await db.matches.find({"sport": sport}, {"id": 1, "_id": 0}).to_list(100)
        match_ids = [m["id"] for m in matches]
        query["match_id"] = {"$in": match_ids}
    
    analyses = await db.analyses.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)
    return analyses

@api_router.get("/analyses/{match_id}")
async def get_analysis(match_id: str, authorization: Optional[str] = Header(None)):
    analysis = await db.analyses.find_one({"match_id": match_id}, {"_id": 0})
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    # Check if user can access full analysis
    can_access_full = False
    if authorization and authorization.startswith("Bearer "):
        try:
            user_data = verify_token(authorization.split(" ")[1])
            user = await db.users.find_one({"id": user_data["user_id"]}, {"_id": 0})
            if user and (user["subscription_tier"] != "free" or user.get("is_admin", False)):
                can_access_full = True
        except:
            pass
    
    if not can_access_full:
        # Return only preview
        return {
            **analysis,
            "stats_analysis": None,
            "full_analysis": None,
            "locked": True
        }
    
    return {**analysis, "locked": False}

@api_router.post("/analyses/{match_id}/unlock")
async def unlock_analysis(match_id: str, authorization: Optional[str] = Header(None)):
    user_data = await get_current_user(authorization)
    user = await db.users.find_one({"id": user_data["user_id"]}, {"_id": 0})
    
    # Admin has unlimited access
    if user.get("is_admin", False):
        return {"success": True, "message": "Admin access granted"}
    
    if user["subscription_tier"] != "free":
        return {"success": True, "message": "Analysis unlocked"}
    
    # Check if user has free analyses left
    if user["free_analyses_used"] >= 1:
        raise HTTPException(status_code=403, detail="Free analysis limit reached")
    
    # Increment free analyses used
    await db.users.update_one(
        {"id": user_data["user_id"]},
        {"$inc": {"free_analyses_used": 1}}
    )
    
    return {"success": True, "message": "Free analysis used"}

@api_router.post("/analyses/generate")
async def generate_analysis(match_id: str):
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Check if analysis already exists
    existing = await db.analyses.find_one({"match_id": match_id}, {"_id": 0})
    if existing:
        return existing
    
    # Generate AI analysis
    llm_key = os.getenv("EMERGENT_LLM_KEY")
    chat = LlmChat(
        api_key=llm_key,
        session_id=f"analysis_{match_id}",
        system_message="You are an expert sports analyst providing detailed match analysis and betting predictions."
    ).with_model("openai", "gpt-5.2")
    
    prompt = f"""Analyze this match and provide a comprehensive prediction:

Match: {match['home_team']} vs {match['away_team']}
Sport: {match['sport']}
League: {match['league']}
Home Form: {match.get('home_form', 'Unknown')}
Away Form: {match.get('away_form', 'Unknown')}

Provide:
1. Prediction (Home Win/Draw/Away Win)
2. Confidence (0-100%)
3. Key Factors (3-5 bullet points)
4. Statistical Analysis (200 words)
5. Betting Tips (3 specific tips with reasoning)
6. Full Analysis (300 words covering tactics, form, h2h)

Format as JSON:
{{
  "prediction": "Home Win",
  "confidence": 75,
  "key_factors": ["factor1", "factor2", "factor3"],
  "stats_analysis": "...",
  "betting_tips": ["tip1", "tip2", "tip3"],
  "full_analysis": "..."
}}"""
    
    response = await chat.send_message(UserMessage(text=prompt))
    
    try:
        import json
        data = json.loads(response)
    except:
        # Fallback if not JSON
        data = {
            "prediction": "Home Win",
            "confidence": 70,
            "key_factors": ["Home advantage", "Better form", "Strong attack"],
            "stats_analysis": response[:200],
            "betting_tips": ["Back home win", "Over 2.5 goals", "Both teams to score"],
            "full_analysis": response
        }
    
    # Create preview (first 150 chars of full analysis)
    preview = data["full_analysis"][:150] + "..."
    
    analysis = Analysis(
        match_id=match_id,
        prediction=data["prediction"],
        confidence=float(data["confidence"]) / 100,
        key_factors=data["key_factors"],
        stats_analysis=data["stats_analysis"],
        betting_tips=data["betting_tips"],
        full_analysis=data["full_analysis"],
        preview=preview
    )
    
    doc = analysis.model_dump()
    await db.analyses.insert_one(doc)
    
    return analysis

# User Profile Routes
@api_router.get("/user/profile")
async def get_profile(authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    user_doc = await db.users.find_one({"id": user["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    return UserProfile(**{k: v for k, v in user_doc.items() if k != "password_hash"})

# Payment Routes
SUBSCRIPTION_TIERS = {
    "basic": {"price": 4.99, "name": "Basic"},
    "pro": {"price": 9.99, "name": "Pro"},
    "premium": {"price": 14.99, "name": "Premium"}
}

@api_router.post("/payments/checkout")
async def create_checkout(checkout_req: CheckoutRequest, request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    
    if checkout_req.tier not in SUBSCRIPTION_TIERS:
        raise HTTPException(status_code=400, detail="Invalid tier")
    
    tier_info = SUBSCRIPTION_TIERS[checkout_req.tier]
    amount = tier_info["price"]
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
        metadata={"user_id": user["user_id"], "tier": checkout_req.tier}
    )
    
    session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
    
    payment = PaymentTransaction(
        user_id=user["user_id"],
        session_id=session.session_id,
        amount=amount,
        currency="usd",
        tier=checkout_req.tier,
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
    
    existing = await db.payment_transactions.find_one({"session_id": session_id, "payment_status": {"$ne": "paid"}}, {"_id": 0})
    
    if existing and status.payment_status == "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": status.payment_status, "status": "completed"}}
        )
        
        await db.users.update_one(
            {"id": existing["user_id"]},
            {"$set": {"subscription_tier": existing["tier"]}}
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

# Seed data endpoint
@api_router.post("/seed-data")
async def seed_data():
    await db.matches.delete_many({})
    await db.analyses.delete_many({})
    
    # Create admin user if not exists
    admin_email = "j.niemelanjml@gmail.com"
    admin_exists = await db.users.find_one({"email": admin_email}, {"_id": 0})
    if not admin_exists:
        admin_password_hash = bcrypt.hashpw("admin123".encode(), bcrypt.gensalt()).decode()
        admin_user = User(
            email=admin_email,
            username="JPTips Admin",
            password_hash=admin_password_hash,
            subscription_tier="admin",
            is_admin=True
        )
        await db.users.insert_one(admin_user.model_dump())
        logger.info(f"Admin user created: {admin_email}")
    
    # Football matches - major leagues
    football_matches = [
        # Premier League
        {"home_team": "Manchester City", "away_team": "Arsenal", "sport": "Football", "league": "Premier League", "home_form": "WWWDW", "away_form": "WDWWL"},
        {"home_team": "Liverpool", "away_team": "Chelsea", "sport": "Football", "league": "Premier League", "home_form": "WWWWW", "away_form": "DWWLD"},
        {"home_team": "Manchester United", "away_team": "Tottenham", "sport": "Football", "league": "Premier League", "home_form": "WDLWW", "away_form": "LWDWW"},
        # La Liga
        {"home_team": "Real Madrid", "away_team": "Barcelona", "sport": "Football", "league": "La Liga", "home_form": "WWWWL", "away_form": "WWWWW"},
        {"home_team": "Atletico Madrid", "away_team": "Sevilla", "sport": "Football", "league": "La Liga", "home_form": "WDWWL", "away_form": "LDWWW"},
        # Serie A
        {"home_team": "Inter Milan", "away_team": "AC Milan", "sport": "Football", "league": "Serie A", "home_form": "WWDWW", "away_form": "WLWDW"},
        {"home_team": "Juventus", "away_team": "Napoli", "sport": "Football", "league": "Serie A", "home_form": "DWWWL", "away_form": "WWWWW"},
        # Bundesliga
        {"home_team": "Bayern Munich", "away_team": "Borussia Dortmund", "sport": "Football", "league": "Bundesliga", "home_form": "WWWWW", "away_form": "WDWLW"},
        # Champions League
        {"home_team": "PSG", "away_team": "Real Madrid", "sport": "Football", "league": "Champions League", "home_form": "WWDWW", "away_form": "WWWWL"},
    ]
    
    # Ice Hockey
    hockey_matches = [
        {"home_team": "Colorado Avalanche", "away_team": "Vegas Golden Knights", "sport": "Ice Hockey", "league": "NHL", "home_form": "WWLWW", "away_form": "WDWWL"},
        {"home_team": "Boston Bruins", "away_team": "Toronto Maple Leafs", "sport": "Ice Hockey", "league": "NHL", "home_form": "WWWDL", "away_form": "LWWWW"},
        {"home_team": "HIFK", "away_team": "Tappara", "sport": "Ice Hockey", "league": "Liiga", "home_form": "WLWWW", "away_form": "WWDLW"},
        {"home_team": "Färjestad", "away_team": "Frölunda", "sport": "Ice Hockey", "league": "SHL", "home_form": "DWWWL", "away_form": "WLWWW"},
    ]
    
    # Basketball
    basketball_matches = [
        {"home_team": "Lakers", "away_team": "Celtics", "sport": "Basketball", "league": "NBA", "home_form": "WWLWL", "away_form": "LWWWW"},
        {"home_team": "Warriors", "away_team": "Bucks", "sport": "Basketball", "league": "NBA", "home_form": "WDWWW", "away_form": "WWLWW"},
        {"home_team": "Real Madrid", "away_team": "Barcelona", "sport": "Basketball", "league": "Euroleague", "home_form": "WWWLW", "away_form": "WLWWW"},
    ]
    
    # Tennis
    tennis_matches = [
        {"home_team": "Novak Djokovic", "away_team": "Carlos Alcaraz", "sport": "Tennis", "league": "Australian Open", "home_form": "WWW", "away_form": "WWW"},
        {"home_team": "Jannik Sinner", "away_team": "Daniil Medvedev", "sport": "Tennis", "league": "Australian Open", "home_form": "WLW", "away_form": "WWL"},
    ]
    
    all_matches = football_matches + hockey_matches + basketball_matches + tennis_matches
    
    matches = []
    for match_data in all_matches:
        match = Match(
            **match_data,
            start_time=(datetime.now(timezone.utc) + timedelta(days=random.randint(0, 7))).isoformat(),
            status="upcoming"
        )
        matches.append(match.model_dump())
    
    await db.matches.insert_many(matches)
    
    return {"message": "Data seeded successfully", "matches": len(matches), "admin_created": not admin_exists}

# News endpoint
@api_router.get("/news")
async def get_news():
    """Get latest sports news"""
    news_items = [
        {
            "id": "1",
            "title": "Manchester City voitti Arsenalin dramaattisessa ottelussa",
            "summary": "Pep Guardiolan Manchester City voitti Arsenal 2-1 jännittävässä Premier League -ottelussa Etihad Stadiumilla.",
            "source": "ESPN",
            "published_at": (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat(),
            "category": "Football"
        },
        {
            "id": "2",
            "title": "Lakers jatkaa voittoputkeaan NBA:ssa",
            "summary": "Los Angeles Lakers voitti Boston Celticsin 115-110 ja jatkaa vahvaa kauttaan.",
            "source": "NBA.com",
            "published_at": (datetime.now(timezone.utc) - timedelta(hours=5)).isoformat(),
            "category": "Basketball"
        },
        {
            "id": "3",
            "title": "Djokovic Australian Openin finaalissa",
            "summary": "Novak Djokovic eteni Australian Openin finaaliin voitettuaan Jannik Sinnerin viiden erän taistelussa.",
            "source": "ATP Tour",
            "published_at": (datetime.now(timezone.utc) - timedelta(hours=8)).isoformat(),
            "category": "Tennis"
        },
        {
            "id": "4",
            "title": "Real Madrid vahvistaa johtoa La Ligassa",
            "summary": "Real Madrid voitti Barcelonan El Clásicossa 3-1 ja kasvatti johtoaan sarjassa.",
            "source": "Marca",
            "published_at": (datetime.now(timezone.utc) - timedelta(hours=12)).isoformat(),
            "category": "Football"
        },
        {
            "id": "5",
            "title": "NHL: Colorado Avalanche pudotti Vegas Golden Knightsin",
            "summary": "Colorado Avalanche voitti Vegas Golden Knightsin 4-2 ja jatkaa kohti pudotuspelejä.",
            "source": "NHL.com",
            "published_at": (datetime.now(timezone.utc) - timedelta(hours=15)).isoformat(),
            "category": "Ice Hockey"
        }
    ]
    return news_items

# Live scores endpoint
@api_router.get("/live-scores")
async def get_live_scores():
    """Get current live scores"""
    live_scores = [
        {
            "id": "live1",
            "home_team": "Liverpool",
            "away_team": "Chelsea",
            "home_score": 2,
            "away_score": 1,
            "minute": "78'",
            "status": "live",
            "league": "Premier League"
        },
        {
            "id": "live2",
            "home_team": "Inter Milan",
            "away_team": "AC Milan",
            "home_score": 1,
            "away_score": 1,
            "minute": "HT",
            "status": "halftime",
            "league": "Serie A"
        },
        {
            "id": "live3",
            "home_team": "Boston Bruins",
            "away_team": "Toronto Maple Leafs",
            "home_score": 3,
            "away_score": 2,
            "minute": "2nd Period",
            "status": "live",
            "league": "NHL"
        }
    ]
    return live_scores

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
