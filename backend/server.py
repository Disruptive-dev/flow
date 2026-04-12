from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, Request, HTTPException, Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import bcrypt
import jwt
import random
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from bson import ObjectId

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
JWT_ALGORITHM = "HS256"

app = FastAPI(title="Spectra Flow API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def get_jwt_secret():
    return os.environ["JWT_SECRET"]

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(hours=24), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def serialize_doc(doc):
    if doc and "_id" in doc:
        doc.pop("_id")
    return doc

# ==================== MODELS ====================

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    tenant_name: Optional[str] = None

class ProspectJobCreate(BaseModel):
    country: Optional[str] = "Argentina"
    province: str
    city: str
    category: str
    quantity: int = 100
    postal_code: Optional[str] = ""
    filters: Optional[Dict[str, Any]] = None

class LeadStatusUpdate(BaseModel):
    status: str

class BulkActionRequest(BaseModel):
    lead_ids: List[str]
    action: str

class CampaignCreate(BaseModel):
    name: str
    sender_profile_id: Optional[str] = ""
    template_id: Optional[str] = ""
    lead_ids: Optional[List[str]] = []

class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    sender_profile_id: Optional[str] = None
    template_id: Optional[str] = None

class TemplateCreate(BaseModel):
    name: str
    subject: str
    html_body: str
    plain_text: Optional[str] = ""
    variables: Optional[List[str]] = []
    signature: Optional[str] = ""

class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    html_body: Optional[str] = None
    plain_text: Optional[str] = None
    variables: Optional[List[str]] = None
    signature: Optional[str] = None

class DomainCreate(BaseModel):
    domain: str
    subdomain: Optional[str] = ""
    sender_name: Optional[str] = ""
    sender_email: Optional[str] = ""
    reply_to: Optional[str] = ""
    signature: Optional[str] = ""

class DomainUpdate(BaseModel):
    sender_name: Optional[str] = None
    sender_email: Optional[str] = None
    reply_to: Optional[str] = None
    signature: Optional[str] = None
    status: Optional[str] = None

class CrmPushRequest(BaseModel):
    lead_ids: List[str]
    assigned_owner: Optional[str] = ""

class SettingsUpdate(BaseModel):
    company_name: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    sender_defaults: Optional[Dict[str, str]] = None

class IntegrationUpdate(BaseModel):
    enabled: Optional[bool] = None
    base_url: Optional[str] = None
    api_key: Optional[str] = None

class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: str = "operator"

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/login")
async def login(request: Request, response: Response, body: LoginRequest):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    set_auth_cookies(response, access_token, refresh_token)
    return {"id": user_id, "email": user["email"], "name": user["name"], "role": user["role"], "tenant_id": user.get("tenant_id", ""), "access_token": access_token}

@api_router.post("/auth/register")
async def register(response: Response, body: RegisterRequest):
    email = body.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    tenant_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    tenant = {"id": tenant_id, "name": body.tenant_name or f"{body.name}'s Organization", "branding": {"company_name": body.tenant_name or f"{body.name}'s Organization", "logo_url": "", "primary_color": "#1D4ED8", "secondary_color": "#6366F1"}, "created_at": now}
    await db.tenants.insert_one(tenant)
    user_doc = {"email": email, "password_hash": hash_password(body.password), "name": body.name, "role": "tenant_admin", "tenant_id": tenant_id, "created_at": now}
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    set_auth_cookies(response, access_token, refresh_token)
    return {"id": user_id, "email": email, "name": body.name, "role": "tenant_admin", "tenant_id": tenant_id, "access_token": access_token}

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return user

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}

@api_router.post("/auth/refresh")
async def refresh_token_endpoint(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user_id = str(user["_id"])
        new_access = create_access_token(user_id, user["email"])
        response.set_cookie(key="access_token", value=new_access, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
        return {"message": "Token refreshed", "access_token": new_access}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

# ==================== DASHBOARD ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(request: Request):
    user = await get_current_user(request)
    tid = user.get("tenant_id", "")
    jobs_count = await db.prospect_jobs.count_documents({"tenant_id": tid})
    total_leads = await db.leads.count_documents({"tenant_id": tid})
    raw_leads = await db.leads.count_documents({"tenant_id": tid, "status": "raw"})
    qualified = await db.leads.count_documents({"tenant_id": tid, "status": {"$in": ["scored", "approved"]}})
    campaigns_active = await db.campaigns.count_documents({"tenant_id": tid, "status": "active"})
    pipeline = [{"$match": {"tenant_id": tid}}, {"$group": {"_id": None, "sent": {"$sum": "$sent_count"}, "opens": {"$sum": "$open_count"}, "clicks": {"$sum": "$click_count"}, "replies": {"$sum": "$reply_count"}, "interested": {"$sum": "$interested_count"}, "crm": {"$sum": "$crm_count"}}}]
    email_stats = await db.campaigns.aggregate(pipeline).to_list(1)
    es = email_stats[0] if email_stats else {}
    crm_synced = await db.crm_sync_logs.count_documents({"tenant_id": tid, "status": "synced"})
    recent = await db.audit_logs.find({"tenant_id": tid}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    return {
        "jobs_this_month": jobs_count, "raw_leads": raw_leads, "qualified_leads": qualified,
        "total_leads": total_leads, "emails_sent": es.get("sent", 0), "opens": es.get("opens", 0),
        "clicks": es.get("clicks", 0), "replies": es.get("replies", 0),
        "interested": es.get("interested", 0), "leads_sent_to_crm": crm_synced,
        "opportunities": es.get("crm", 0), "active_campaigns": campaigns_active, "recent_activity": recent
    }

# ==================== PROSPECT JOBS ====================

@api_router.get("/prospect-jobs")
async def list_prospect_jobs(request: Request):
    user = await get_current_user(request)
    jobs = await db.prospect_jobs.find({"tenant_id": user["tenant_id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return jobs

@api_router.post("/prospect-jobs")
async def create_prospect_job(request: Request, body: ProspectJobCreate):
    user = await get_current_user(request)
    job_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    job = {
        "id": job_id, "tenant_id": user["tenant_id"],
        "country": body.country or "Argentina",
        "province": body.province, "city": body.city,
        "category": body.category, "quantity": body.quantity,
        "postal_code": body.postal_code or "",
        "filters": body.filters or {}, "status": "pending",
        "raw_count": 0, "cleaned_count": 0, "qualified_count": 0,
        "rejected_count": 0, "approved_count": 0,
        "stages": [
            {"name": "job_created", "status": "completed", "timestamp": now},
            {"name": "scraping", "status": "pending", "timestamp": None},
            {"name": "prospects_found", "status": "pending", "timestamp": None},
            {"name": "ai_cleaning", "status": "pending", "timestamp": None},
            {"name": "scoring_completed", "status": "pending", "timestamp": None},
            {"name": "ready_for_review", "status": "pending", "timestamp": None}
        ],
        "created_by": user.get("name", ""), "created_at": now, "updated_at": now
    }
    await db.prospect_jobs.insert_one(job)
    await db.audit_logs.insert_one({"id": str(uuid.uuid4()), "tenant_id": user["tenant_id"], "user_id": user["_id"], "user_name": user["name"], "action": "created_prospect_job", "entity_type": "prospect_job", "entity_id": job_id, "details": f"Job: {body.category} in {body.city}, {body.province}", "created_at": now})
    # Try to trigger n8n webhook if configured
    try:
        n8n_config = await db.integration_configs.find_one({"tenant_id": user["tenant_id"], "name": "n8n", "enabled": True}, {"_id": 0})
        if n8n_config and n8n_config.get("base_url"):
            import httpx
            webhook_url = n8n_config["base_url"].rstrip("/")
            callback_url = os.environ.get("FRONTEND_URL", "http://localhost:8001") + f"/api/webhooks/n8n/job-result/{job_id}"
            progress_url = os.environ.get("FRONTEND_URL", "http://localhost:8001") + f"/api/webhooks/n8n/job-progress/{job_id}"
            async with httpx.AsyncClient(timeout=10) as client:
                await client.post(webhook_url, json={
                    "job_id": job_id, "tenant_id": user["tenant_id"],
                    "country": body.country or "Argentina", "province": body.province,
                    "city": body.city, "category": body.category, "quantity": body.quantity,
                    "postal_code": body.postal_code or "",
                    "callback_url": callback_url, "progress_url": progress_url,
                    "api_key": n8n_config.get("api_key", "")
                })
            logger.info(f"n8n webhook triggered for job {job_id}")
    except Exception as e:
        logger.warning(f"n8n webhook failed (will use demo mode): {e}")
    return serialize_doc(job)

@api_router.get("/prospect-jobs/{job_id}")
async def get_prospect_job(request: Request, job_id: str):
    user = await get_current_user(request)
    job = await db.prospect_jobs.find_one({"id": job_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@api_router.post("/prospect-jobs/{job_id}/start")
async def start_prospect_job(request: Request, job_id: str):
    user = await get_current_user(request)
    job = await db.prospect_jobs.find_one({"id": job_id, "tenant_id": user["tenant_id"]})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    now = datetime.now(timezone.utc).isoformat()
    quantity = job.get("quantity", 100)
    raw_count = random.randint(int(quantity * 0.8), int(quantity * 1.2))
    cleaned_count = int(raw_count * random.uniform(0.7, 0.85))
    qualified_count = int(cleaned_count * random.uniform(0.6, 0.8))
    rejected_count = cleaned_count - qualified_count
    stages = [
        {"name": "job_created", "status": "completed", "timestamp": job["created_at"]},
        {"name": "scraping", "status": "completed", "timestamp": now},
        {"name": "prospects_found", "status": "completed", "timestamp": now},
        {"name": "ai_cleaning", "status": "completed", "timestamp": now},
        {"name": "scoring_completed", "status": "completed", "timestamp": now},
        {"name": "ready_for_review", "status": "completed", "timestamp": now}
    ]
    await db.prospect_jobs.update_one({"id": job_id}, {"$set": {"status": "completed", "raw_count": raw_count, "cleaned_count": cleaned_count, "qualified_count": qualified_count, "rejected_count": rejected_count, "approved_count": 0, "stages": stages, "updated_at": now}})

    # Realistic Argentine business data by category
    biz_by_cat = {
        "real estate": ["Inmobiliaria del Sol", "Propiedades Austral", "RE/MAX Norte", "Casa Propia Inversiones", "Grupo Habitat", "Loteos del Valle", "Bertoni Propiedades", "Techo Propio SRL", "Cimientos Realty", "Quintas Premium", "Urban Housing SA", "Torres & Lagos", "Estancias Pampeanas", "Portal Inmobiliario", "Lopez Bienes Raices"],
        "technology": ["TechNova Solutions", "ByteForge SA", "CloudArg SRL", "Nexo Digital", "Silicon Pampa", "DataCrunch SAS", "AppFactory AR", "Quantum Labs", "DigitalBridge", "CodeSur Technologies", "CyberNorte SRL", "Innova Software", "Red Agil SA", "Pixel Perfect Studio", "NetSolutions Argentina"],
        "gastronomia": ["La Parrilla de Don Luis", "Sabores del Norte", "El Fogon Criollo", "Cafe Havanna", "Resto Bar 1810", "La Cocina de Maria", "Punto Gourmet", "El Molino Restaurant", "Delicias Tucumanas", "Bodegon del Centro", "Pastas Nona Rosa", "Sushi San Martin", "Cerveceria Andina", "Dulce Tentacion", "Restaurante El Puerto"],
        "legal": ["Estudio Juridico Rios & Asoc.", "Bufete Legal del Norte", "Abogados Asociados SA", "Consultora Legal Mendoza", "Estudio Notarial Garcia", "Perez & Gomez Abogados", "Defensoria Integral", "Asesoria Juridica Plus", "Estudio Contable Fiscal", "Legal Corp Argentina"],
        "health": ["Clinica Del Sol", "Centro Medico Austral", "Sanatorio San Lucas", "Dental Premium Center", "Laboratorio BioAndes", "Optica Vision Total", "Farmacia del Pueblo", "Kinesiologia Integral", "Nutricion & Salud", "Centro Pediatrico NOA"],
        "education": ["Instituto Cervantes", "Academia del Saber", "Colegio San Martin", "Centro de Idiomas Global", "Universidad Abierta", "Escuela de Negocios AR", "Instituto Tecnico Plus", "Jardin Mis Primeros Pasos", "Curso Online Argentina", "Capacitacion Profesional SA"],
        "insurance": ["Seguros del Litoral", "Aseguradora Nacional", "Proteccion Total SA", "Seguros Rivadavia", "Cobertura Integral SRL", "La Prevision Seguros", "Seguros del Norte", "Grupo Asegurador Sur", "Patrimonio Seguros", "Federal Seguros"],
        "consulting": ["Consultora Empresarial Plus", "Strategy Partners AR", "Asesores Financieros SA", "McKenzie Consultores", "Grupo Estrategia", "Business Intelligence AR", "Deloitte Argentina", "Asesoria Tributaria", "Consultoria de RRHH", "Performance Group"],
        "construction": ["Constructora del Valle", "Edificar SA", "Obras Civiles Patagonia", "Hormigon Armado SRL", "Arquitectura Moderna", "Construplan AR", "Ingenieria Aplicada", "Revestimientos & Mas", "Herreria Industrial NOA", "Materiales del Sur"],
        "logistics": ["Transporte Ejecutivo NOA", "Logistica Express AR", "Envios Rapidos SA", "Cargas del Norte", "Fleet Solutions", "Mudanzas El Gaucho", "Correo Privado Sur", "Distribucion Nacional", "Almacenes Centrales", "Puerto Logistics"],
    }
    cat_key = job["category"].lower()
    businesses = biz_by_cat.get(cat_key, biz_by_cat.get("technology", []))

    province_cities = {
        "Buenos Aires": ["CABA", "La Plata", "Mar del Plata", "Bahia Blanca", "Quilmes", "Lomas de Zamora"],
        "CABA": ["Palermo", "Recoleta", "San Telmo", "Belgrano", "Caballito", "Microcentro"],
        "Tucuman": ["San Miguel de Tucuman", "Yerba Buena", "Tafi Viejo", "Banda del Rio Sali", "Concepcion"],
        "Cordoba": ["Cordoba Capital", "Villa Carlos Paz", "Rio Cuarto", "Villa Maria", "Alta Gracia"],
        "Mendoza": ["Ciudad de Mendoza", "Godoy Cruz", "San Rafael", "Lujan de Cuyo", "Maipu"],
        "Santa Fe": ["Rosario", "Santa Fe Capital", "Rafaela", "Venado Tuerto", "Reconquista"],
        "Salta": ["Salta Capital", "San Lorenzo", "Oran", "Tartagal", "Cafayate"],
    }
    cities = province_cities.get(job["province"], [job["city"]])

    quality_levels = ["excellent", "good", "average", "poor"]
    rec_texts = {
        "excellent": ["Altamente recomendado - presencia digital solida y datos verificados", "Excelente prospecto - web profesional y multiples canales de contacto", "Top prospecto - alta actividad en redes y web actualizada"],
        "good": ["Buen candidato - informacion de contacto verificada", "Prospecto solido - presencia online estable", "Candidato viable - datos consistentes y actividad reciente"],
        "average": ["Promedio - requiere validacion adicional", "Necesita mas investigacion - datos parciales", "Prospecto con potencial - falta info de contacto directa"],
        "poor": ["Baja prioridad - datos limitados disponibles", "No recomendado actualmente - poca presencia digital", "Requiere seguimiento manual - info desactualizada"]
    }
    first_lines = [
        f"Notamos que su empresa tiene una fuerte presencia en {job['city']} y queremos proponerle una alianza estrategica.",
        f"Vimos su actividad en el sector de {job['category']} en {job['province']} y creemos que podemos potenciar su negocio.",
        f"Su empresa destaca en el mercado de {job['city']}. Nos gustaria explorar oportunidades de colaboracion.",
        f"Encontramos su empresa mientras analizabamos el sector de {job['category']} en la region. Tiene un perfil muy interesante.",
        f"Sabemos que {job['category']} en {job['province']} esta creciendo y su empresa esta bien posicionada para aprovechar esta oportunidad.",
    ]

    statuses_pool = ["scored"] * 5 + ["cleaned"] * 2 + ["approved"] + ["rejected"]
    leads_to_insert = []
    used_names = set()
    for i in range(min(qualified_count, 25)):
        bname = random.choice(businesses)
        suffix = random.choice(["SA", "SRL", "SAS", ""])
        full_name = f"{bname} {suffix}".strip()
        while full_name in used_names and len(used_names) < len(businesses) * 3:
            bname = random.choice(businesses)
            suffix = random.choice(["SA", "SRL", "SAS", ""])
            full_name = f"{bname} {suffix}".strip()
        used_names.add(full_name)
        score = random.randint(35, 98)
        ql = 0 if score >= 85 else (1 if score >= 65 else (2 if score >= 45 else 3))
        city = random.choice(cities)
        slug = bname.lower().replace(" ", "").replace("&", "y").replace(".", "")[:12]
        lead = {
            "id": str(uuid.uuid4()), "tenant_id": user["tenant_id"], "job_id": job_id,
            "business_name": full_name,
            "raw_category": job["category"].lower(), "normalized_category": job["category"].title(),
            "province": job["province"], "city": city,
            "website": f"www.{slug}.com.ar",
            "email": f"contacto@{slug}.com.ar",
            "phone": f"+54 {random.choice(['11','351','381','261','341','387'])} {random.randint(100,999)}-{random.randint(1000,9999)}",
            "ai_score": score, "quality_level": quality_levels[ql],
            "recommendation": random.choice(rec_texts[quality_levels[ql]]),
            "recommended_first_line": random.choice(first_lines),
            "status": random.choice(statuses_pool),
            "created_at": now, "updated_at": now
        }
        leads_to_insert.append(lead)
    if leads_to_insert:
        await db.leads.insert_many(leads_to_insert)
    updated_job = await db.prospect_jobs.find_one({"id": job_id}, {"_id": 0})
    return updated_job

# ==================== LEADS ====================

@api_router.get("/leads")
async def list_leads(request: Request, status: Optional[str] = None, job_id: Optional[str] = None, search: Optional[str] = None, page: int = 1, limit: int = 50):
    user = await get_current_user(request)
    query = {"tenant_id": user["tenant_id"]}
    if status:
        query["status"] = status
    if job_id:
        query["job_id"] = job_id
    if search:
        query["$or"] = [{"business_name": {"$regex": search, "$options": "i"}}, {"email": {"$regex": search, "$options": "i"}}, {"city": {"$regex": search, "$options": "i"}}]
    total = await db.leads.count_documents(query)
    skip = (page - 1) * limit
    leads = await db.leads.find(query, {"_id": 0}).sort("ai_score", -1).skip(skip).limit(limit).to_list(limit)
    return {"leads": leads, "total": total, "page": page, "limit": limit, "pages": max(1, (total + limit - 1) // limit)}

@api_router.get("/leads/{lead_id}")
async def get_lead(request: Request, lead_id: str):
    user = await get_current_user(request)
    lead = await db.leads.find_one({"id": lead_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    events = await db.lead_events.find({"lead_id": lead_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {**lead, "events": events}

@api_router.put("/leads/{lead_id}/status")
async def update_lead_status(request: Request, lead_id: str, body: LeadStatusUpdate):
    user = await get_current_user(request)
    now = datetime.now(timezone.utc).isoformat()
    result = await db.leads.update_one({"id": lead_id, "tenant_id": user["tenant_id"]}, {"$set": {"status": body.status, "updated_at": now}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    await db.lead_events.insert_one({"id": str(uuid.uuid4()), "tenant_id": user["tenant_id"], "lead_id": lead_id, "event_type": f"status_changed_to_{body.status}", "details": f"Status updated to {body.status} by {user['name']}", "created_at": now})
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if lead and lead.get("job_id") and body.status == "approved":
        await db.prospect_jobs.update_one({"id": lead["job_id"]}, {"$inc": {"approved_count": 1}})
    if lead and body.status == "sent_to_crm":
        existing = await db.crm_contacts.find_one({"lead_id": lead_id, "tenant_id": user["tenant_id"]})
        if not existing:
            await db.crm_contacts.insert_one({"id": str(uuid.uuid4()), "tenant_id": user["tenant_id"], "lead_id": lead_id, "business_name": lead.get("business_name", ""), "contact_name": "", "email": lead.get("email", ""), "phone": lead.get("phone", ""), "city": lead.get("city", ""), "province": lead.get("province", ""), "category": lead.get("normalized_category", ""), "source": "spectra_flow", "notes": lead.get("recommendation", ""), "stage": "nuevo", "ai_score": lead.get("ai_score", 0), "deal_count": 0, "total_value": 0, "created_at": now, "updated_at": now})
    return {"message": "Status updated", "status": body.status}

@api_router.post("/leads/bulk-action")
async def bulk_lead_action(request: Request, body: BulkActionRequest):
    user = await get_current_user(request)
    now = datetime.now(timezone.utc).isoformat()
    status_map = {"approve": "approved", "reject": "rejected", "queue_sequence": "queued_for_sequence", "send_to_crm": "sent_to_crm"}
    new_status = status_map.get(body.action)
    if not new_status:
        raise HTTPException(status_code=400, detail="Invalid action")
    result = await db.leads.update_many({"id": {"$in": body.lead_ids}, "tenant_id": user["tenant_id"]}, {"$set": {"status": new_status, "updated_at": now}})
    # If sending to CRM, also create CRM contacts
    if body.action == "send_to_crm":
        for lead_id in body.lead_ids:
            lead = await db.leads.find_one({"id": lead_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
            if lead:
                existing = await db.crm_contacts.find_one({"lead_id": lead_id, "tenant_id": user["tenant_id"]})
                if not existing:
                    await db.crm_contacts.insert_one({"id": str(uuid.uuid4()), "tenant_id": user["tenant_id"], "lead_id": lead_id, "business_name": lead.get("business_name", ""), "contact_name": "", "email": lead.get("email", ""), "phone": lead.get("phone", ""), "city": lead.get("city", ""), "province": lead.get("province", ""), "category": lead.get("normalized_category", ""), "source": "spectra_flow", "notes": lead.get("recommendation", ""), "stage": "nuevo", "ai_score": lead.get("ai_score", 0), "deal_count": 0, "total_value": 0, "created_at": now, "updated_at": now})
    return {"message": f"{result.modified_count} leads actualizados a {new_status}"}

# ==================== CAMPAIGNS ====================

@api_router.get("/campaigns")
async def list_campaigns(request: Request):
    user = await get_current_user(request)
    campaigns = await db.campaigns.find({"tenant_id": user["tenant_id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return campaigns

@api_router.post("/campaigns")
async def create_campaign(request: Request, body: CampaignCreate):
    user = await get_current_user(request)
    campaign_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    campaign = {"id": campaign_id, "tenant_id": user["tenant_id"], "name": body.name, "sender_profile_id": body.sender_profile_id or "", "template_id": body.template_id or "", "status": "draft", "lead_count": len(body.lead_ids) if body.lead_ids else 0, "lead_ids": body.lead_ids or [], "sent_count": 0, "open_count": 0, "click_count": 0, "reply_count": 0, "interested_count": 0, "crm_count": 0, "created_by": user["name"], "created_at": now, "updated_at": now}
    await db.campaigns.insert_one(campaign)
    return serialize_doc(campaign)

@api_router.get("/campaigns/{campaign_id}")
async def get_campaign(request: Request, campaign_id: str):
    user = await get_current_user(request)
    campaign = await db.campaigns.find_one({"id": campaign_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign

@api_router.put("/campaigns/{campaign_id}")
async def update_campaign(request: Request, campaign_id: str, body: CampaignUpdate):
    user = await get_current_user(request)
    now = datetime.now(timezone.utc).isoformat()
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    update_data["updated_at"] = now
    result = await db.campaigns.update_one({"id": campaign_id, "tenant_id": user["tenant_id"]}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    updated = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    return updated

# ==================== TEMPLATES ====================

@api_router.get("/templates")
async def list_templates(request: Request):
    user = await get_current_user(request)
    templates = await db.templates.find({"tenant_id": user["tenant_id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return templates

@api_router.post("/templates")
async def create_template(request: Request, body: TemplateCreate):
    user = await get_current_user(request)
    template_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    template = {"id": template_id, "tenant_id": user["tenant_id"], "name": body.name, "subject": body.subject, "html_body": body.html_body, "plain_text": body.plain_text or "", "variables": body.variables or [], "signature": body.signature or "", "created_at": now, "updated_at": now}
    await db.templates.insert_one(template)
    return serialize_doc(template)

@api_router.put("/templates/{template_id}")
async def update_template(request: Request, template_id: str, body: TemplateUpdate):
    user = await get_current_user(request)
    now = datetime.now(timezone.utc).isoformat()
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    update_data["updated_at"] = now
    result = await db.templates.update_one({"id": template_id, "tenant_id": user["tenant_id"]}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    updated = await db.templates.find_one({"id": template_id}, {"_id": 0})
    return updated

@api_router.delete("/templates/{template_id}")
async def delete_template(request: Request, template_id: str):
    user = await get_current_user(request)
    result = await db.templates.delete_one({"id": template_id, "tenant_id": user["tenant_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted"}

class SendTestRequest(BaseModel):
    to_email: Optional[str] = "test@demo.com"

@api_router.post("/templates/{template_id}/send-test")
async def send_test_email(request: Request, template_id: str, body: SendTestRequest):
    user = await get_current_user(request)
    template = await db.templates.find_one({"id": template_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    preview_html = template["html_body"].replace("{business_name}", "Empresa Demo SA").replace("{city}", "Buenos Aires").replace("{normalized_category}", "Tecnologia").replace("{recommended_first_line}", "Notamos que su empresa tiene una fuerte presencia en el mercado digital.").replace("{sender_name}", user.get("name", "Spectra Flow"))
    return {"message": f"Email de prueba enviado a {body.to_email}", "preview_subject": template["subject"].replace("{business_name}", "Empresa Demo SA"), "preview_html": preview_html, "simulated": True}

@api_router.post("/campaigns/{campaign_id}/simulate")
async def simulate_campaign(request: Request, campaign_id: str):
    user = await get_current_user(request)
    campaign = await db.campaigns.find_one({"id": campaign_id, "tenant_id": user["tenant_id"]})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    now = datetime.now(timezone.utc).isoformat()
    lead_count = campaign.get("lead_count", 0) or random.randint(15, 50)
    sent = lead_count
    opens = int(sent * random.uniform(0.45, 0.70))
    clicks = int(opens * random.uniform(0.25, 0.45))
    replies = int(clicks * random.uniform(0.30, 0.55))
    interested = int(replies * random.uniform(0.40, 0.70))
    crm = int(interested * random.uniform(0.50, 0.80))
    await db.campaigns.update_one({"id": campaign_id}, {"$set": {"status": "completed", "lead_count": lead_count, "sent_count": sent, "open_count": opens, "click_count": clicks, "reply_count": replies, "interested_count": interested, "crm_count": crm, "updated_at": now}})
    updated = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    return updated

# ==================== DOMAINS ====================

@api_router.get("/domains")
async def list_domains(request: Request):
    user = await get_current_user(request)
    domains = await db.domains.find({"tenant_id": user["tenant_id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return domains

@api_router.post("/domains")
async def create_domain(request: Request, body: DomainCreate):
    user = await get_current_user(request)
    domain_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    subdomain = body.subdomain or f"mail.{body.domain}"
    domain_doc = {"id": domain_id, "tenant_id": user["tenant_id"], "domain": body.domain, "subdomain": subdomain, "status": "dns_pending", "dns_records": [{"type": "TXT", "name": subdomain, "value": "v=spf1 include:_spf.resend.com ~all", "verified": False}, {"type": "CNAME", "name": f"resend._domainkey.{subdomain}", "value": "resend.domainkey.resend.com", "verified": False}, {"type": "MX", "name": subdomain, "value": "feedback-smtp.resend.com", "verified": False}], "sender_name": body.sender_name or "", "sender_email": body.sender_email or f"noreply@{subdomain}", "reply_to": body.reply_to or "", "signature": body.signature or "", "warmup_status": "not_started", "created_at": now, "updated_at": now}
    await db.domains.insert_one(domain_doc)
    return serialize_doc(domain_doc)

@api_router.put("/domains/{domain_id}")
async def update_domain(request: Request, domain_id: str, body: DomainUpdate):
    user = await get_current_user(request)
    now = datetime.now(timezone.utc).isoformat()
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    update_data["updated_at"] = now
    result = await db.domains.update_one({"id": domain_id, "tenant_id": user["tenant_id"]}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Domain not found")
    updated = await db.domains.find_one({"id": domain_id}, {"_id": 0})
    return updated

@api_router.post("/domains/{domain_id}/verify")
async def verify_domain(request: Request, domain_id: str):
    user = await get_current_user(request)
    domain = await db.domains.find_one({"id": domain_id, "tenant_id": user["tenant_id"]})
    if not domain:
        raise HTTPException(status_code=404, detail="Domain not found")
    now = datetime.now(timezone.utc).isoformat()
    dns_records = domain.get("dns_records", [])
    all_verified = True
    for record in dns_records:
        record["verified"] = random.choice([True, True, True, False])
        if not record["verified"]:
            all_verified = False
    new_status = "warmup_recommended" if all_verified else "verifying"
    await db.domains.update_one({"id": domain_id}, {"$set": {"dns_records": dns_records, "status": new_status, "updated_at": now}})
    updated = await db.domains.find_one({"id": domain_id}, {"_id": 0})
    return updated

# ==================== CRM SYNC ====================

@api_router.get("/crm-sync/logs")
async def list_crm_sync_logs(request: Request):
    user = await get_current_user(request)
    logs = await db.crm_sync_logs.find({"tenant_id": user["tenant_id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return logs

@api_router.post("/crm-sync/push")
async def push_to_crm(request: Request, body: CrmPushRequest):
    user = await get_current_user(request)
    now = datetime.now(timezone.utc).isoformat()
    results = []
    for lead_id in body.lead_ids:
        lead = await db.leads.find_one({"id": lead_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
        if not lead:
            continue
        success = random.random() > 0.1
        log = {"id": str(uuid.uuid4()), "tenant_id": user["tenant_id"], "lead_id": lead_id, "lead_name": lead.get("business_name", ""), "status": "synced" if success else "error", "error": "" if success else "Connection timeout", "synced_at": now if success else None, "assigned_owner": body.assigned_owner or "Default Owner", "created_at": now}
        await db.crm_sync_logs.insert_one(log)
        if success:
            await db.leads.update_one({"id": lead_id}, {"$set": {"status": "sent_to_crm", "updated_at": now}})
        results.append(serialize_doc(log))
    return {"message": f"{len(results)} leads processed", "results": results}

@api_router.post("/crm-sync/retry/{log_id}")
async def retry_crm_sync(request: Request, log_id: str):
    user = await get_current_user(request)
    now = datetime.now(timezone.utc).isoformat()
    await db.crm_sync_logs.update_one({"id": log_id, "tenant_id": user["tenant_id"]}, {"$set": {"status": "synced", "error": "", "synced_at": now}})
    return {"message": "Retry successful"}

# ==================== CRM MODULE ====================

class CrmContactCreate(BaseModel):
    lead_id: Optional[str] = ""
    business_name: str
    contact_name: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    city: Optional[str] = ""
    province: Optional[str] = ""
    category: Optional[str] = ""
    source: Optional[str] = "spectra_flow"
    notes: Optional[str] = ""

class CrmDealCreate(BaseModel):
    contact_id: str
    title: str
    value: Optional[float] = 0
    stage: Optional[str] = "nuevo"
    assigned_to: Optional[str] = ""

class CrmDealUpdate(BaseModel):
    title: Optional[str] = None
    value: Optional[float] = None
    stage: Optional[str] = None
    assigned_to: Optional[str] = None

class CrmNoteCreate(BaseModel):
    contact_id: str
    content: str
    note_type: Optional[str] = "nota"

@api_router.get("/crm/contacts")
async def list_crm_contacts(request: Request, search: Optional[str] = None):
    user = await get_current_user(request)
    query = {"tenant_id": user["tenant_id"]}
    if search:
        query["$or"] = [{"business_name": {"$regex": search, "$options": "i"}}, {"contact_name": {"$regex": search, "$options": "i"}}, {"email": {"$regex": search, "$options": "i"}}]
    contacts = await db.crm_contacts.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    return contacts

@api_router.post("/crm/contacts")
async def create_crm_contact(request: Request, body: CrmContactCreate):
    user = await get_current_user(request)
    contact_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    contact = {"id": contact_id, "tenant_id": user["tenant_id"], "lead_id": body.lead_id or "", "business_name": body.business_name, "contact_name": body.contact_name or "", "email": body.email or "", "phone": body.phone or "", "city": body.city or "", "province": body.province or "", "category": body.category or "", "source": body.source or "spectra_flow", "notes": body.notes or "", "stage": "nuevo", "deal_count": 0, "total_value": 0, "created_at": now, "updated_at": now}
    await db.crm_contacts.insert_one(contact)
    if body.lead_id:
        await db.leads.update_one({"id": body.lead_id}, {"$set": {"status": "sent_to_crm", "updated_at": now}})
    return serialize_doc(contact)

@api_router.post("/crm/contacts/from-leads")
async def create_contacts_from_leads(request: Request, body: CrmPushRequest):
    user = await get_current_user(request)
    now = datetime.now(timezone.utc).isoformat()
    created = []
    for lead_id in body.lead_ids:
        lead = await db.leads.find_one({"id": lead_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
        if not lead:
            continue
        existing = await db.crm_contacts.find_one({"lead_id": lead_id, "tenant_id": user["tenant_id"]})
        if existing:
            continue
        contact = {"id": str(uuid.uuid4()), "tenant_id": user["tenant_id"], "lead_id": lead_id, "business_name": lead.get("business_name", ""), "contact_name": "", "email": lead.get("email", ""), "phone": lead.get("phone", ""), "city": lead.get("city", ""), "province": lead.get("province", ""), "category": lead.get("normalized_category", ""), "source": "spectra_flow", "notes": lead.get("recommendation", ""), "stage": "nuevo", "ai_score": lead.get("ai_score", 0), "deal_count": 0, "total_value": 0, "created_at": now, "updated_at": now}
        await db.crm_contacts.insert_one(contact)
        await db.leads.update_one({"id": lead_id}, {"$set": {"status": "sent_to_crm", "updated_at": now}})
        created.append(serialize_doc(contact))
    return {"message": f"{len(created)} contactos creados en el CRM", "contacts": created}

@api_router.get("/crm/contacts/{contact_id}")
async def get_crm_contact(request: Request, contact_id: str):
    user = await get_current_user(request)
    contact = await db.crm_contacts.find_one({"id": contact_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")
    deals = await db.crm_deals.find({"contact_id": contact_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    notes = await db.crm_notes.find({"contact_id": contact_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {**contact, "deals": deals, "notes_list": notes}

@api_router.get("/crm/deals")
async def list_crm_deals(request: Request, stage: Optional[str] = None):
    user = await get_current_user(request)
    query = {"tenant_id": user["tenant_id"]}
    if stage:
        query["stage"] = stage
    deals = await db.crm_deals.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    return deals

@api_router.post("/crm/deals")
async def create_crm_deal(request: Request, body: CrmDealCreate):
    user = await get_current_user(request)
    deal_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    contact = await db.crm_contacts.find_one({"id": body.contact_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    deal = {"id": deal_id, "tenant_id": user["tenant_id"], "contact_id": body.contact_id, "contact_name": contact.get("business_name", "") if contact else "", "title": body.title, "value": body.value or 0, "stage": body.stage or "nuevo", "assigned_to": body.assigned_to or user.get("name", ""), "created_at": now, "updated_at": now}
    await db.crm_deals.insert_one(deal)
    await db.crm_contacts.update_one({"id": body.contact_id}, {"$inc": {"deal_count": 1, "total_value": body.value or 0}})
    return serialize_doc(deal)

@api_router.put("/crm/deals/{deal_id}")
async def update_crm_deal(request: Request, deal_id: str, body: CrmDealUpdate):
    user = await get_current_user(request)
    now = datetime.now(timezone.utc).isoformat()
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    update_data["updated_at"] = now
    result = await db.crm_deals.update_one({"id": deal_id, "tenant_id": user["tenant_id"]}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Oportunidad no encontrada")
    updated = await db.crm_deals.find_one({"id": deal_id}, {"_id": 0})
    return updated

@api_router.post("/crm/notes")
async def create_crm_note(request: Request, body: CrmNoteCreate):
    user = await get_current_user(request)
    note_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    note = {"id": note_id, "tenant_id": user["tenant_id"], "contact_id": body.contact_id, "content": body.content, "note_type": body.note_type or "nota", "author": user.get("name", ""), "created_at": now}
    await db.crm_notes.insert_one(note)
    return serialize_doc(note)

@api_router.get("/crm/stats")
async def get_crm_stats(request: Request):
    user = await get_current_user(request)
    tid = user["tenant_id"]
    total_contacts = await db.crm_contacts.count_documents({"tenant_id": tid})
    total_deals = await db.crm_deals.count_documents({"tenant_id": tid})
    stages = ["nuevo", "contactado", "propuesta", "negociacion", "ganado", "perdido"]
    stage_counts = {}
    for s in stages:
        stage_counts[s] = await db.crm_deals.count_documents({"tenant_id": tid, "stage": s})
    pipeline = [{"$match": {"tenant_id": tid, "stage": "ganado"}}, {"$group": {"_id": None, "total": {"$sum": "$value"}}}]
    won_value = await db.crm_deals.aggregate(pipeline).to_list(1)
    return {"total_contacts": total_contacts, "total_deals": total_deals, "stage_counts": stage_counts, "won_value": won_value[0]["total"] if won_value else 0}

# ==================== ANALYTICS ====================

@api_router.get("/analytics")
async def get_analytics(request: Request):
    user = await get_current_user(request)
    tid = user["tenant_id"]
    stats = {
        "jobs_created": await db.prospect_jobs.count_documents({"tenant_id": tid}),
        "raw_leads": await db.leads.count_documents({"tenant_id": tid, "status": "raw"}),
        "cleaned_leads": await db.leads.count_documents({"tenant_id": tid, "status": "cleaned"}),
        "scored_leads": await db.leads.count_documents({"tenant_id": tid, "status": "scored"}),
        "qualified_leads": await db.leads.count_documents({"tenant_id": tid, "status": {"$in": ["scored", "approved"]}}),
        "rejected_leads": await db.leads.count_documents({"tenant_id": tid, "status": "rejected"}),
        "approved_leads": await db.leads.count_documents({"tenant_id": tid, "status": "approved"}),
        "total_leads": await db.leads.count_documents({"tenant_id": tid}),
    }
    pipeline = [{"$match": {"tenant_id": tid}}, {"$group": {"_id": None, "sent": {"$sum": "$sent_count"}, "opens": {"$sum": "$open_count"}, "clicks": {"$sum": "$click_count"}, "replies": {"$sum": "$reply_count"}, "interested": {"$sum": "$interested_count"}, "crm": {"$sum": "$crm_count"}}}]
    cs = (await db.campaigns.aggregate(pipeline).to_list(1))
    cs = cs[0] if cs else {}
    stats.update({"emails_sent": cs.get("sent", 0), "opens": cs.get("opens", 0), "clicks": cs.get("clicks", 0), "replies": cs.get("replies", 0), "interested": cs.get("interested", 0), "crm_handoffs": await db.crm_sync_logs.count_documents({"tenant_id": tid, "status": "synced"})})
    total = stats["total_leads"] or 1
    stats["qualification_rate"] = round((stats["qualified_leads"] / total) * 100, 1)
    stats["approval_rate"] = round((stats["approved_leads"] / total) * 100, 1)
    stats["email_open_rate"] = round((stats["opens"] / max(stats["emails_sent"], 1)) * 100, 1)
    stats["reply_rate"] = round((stats["replies"] / max(stats["emails_sent"], 1)) * 100, 1)
    return stats

# ==================== SETTINGS ====================

@api_router.get("/settings")
async def get_settings(request: Request):
    user = await get_current_user(request)
    tenant = await db.tenants.find_one({"id": user["tenant_id"]}, {"_id": 0})
    if not tenant:
        return {"branding": {}, "integrations": []}
    return tenant

@api_router.put("/settings")
async def update_settings(request: Request, body: SettingsUpdate):
    user = await get_current_user(request)
    now = datetime.now(timezone.utc).isoformat()
    update_data = {}
    if body.company_name is not None:
        update_data["branding.company_name"] = body.company_name
    if body.logo_url is not None:
        update_data["branding.logo_url"] = body.logo_url
    if body.primary_color is not None:
        update_data["branding.primary_color"] = body.primary_color
    if body.secondary_color is not None:
        update_data["branding.secondary_color"] = body.secondary_color
    if body.sender_defaults is not None:
        update_data["sender_defaults"] = body.sender_defaults
    update_data["updated_at"] = now
    await db.tenants.update_one({"id": user["tenant_id"]}, {"$set": update_data})
    tenant = await db.tenants.find_one({"id": user["tenant_id"]}, {"_id": 0})
    return tenant

@api_router.get("/settings/integrations")
async def get_integrations(request: Request):
    user = await get_current_user(request)
    integrations = await db.integration_configs.find({"tenant_id": user["tenant_id"]}, {"_id": 0}).to_list(20)
    return integrations

@api_router.put("/settings/integrations/{name}")
async def update_integration(request: Request, name: str, body: IntegrationUpdate):
    user = await get_current_user(request)
    now = datetime.now(timezone.utc).isoformat()
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    update_data["updated_at"] = now
    await db.integration_configs.update_one({"tenant_id": user["tenant_id"], "name": name}, {"$set": update_data})
    updated = await db.integration_configs.find_one({"tenant_id": user["tenant_id"], "name": name}, {"_id": 0})
    return updated

# ==================== USERS ====================

@api_router.get("/users")
async def list_users(request: Request):
    user = await get_current_user(request)
    if user["role"] not in ["super_admin", "tenant_admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    pipeline = [{"$match": {"tenant_id": user["tenant_id"]}}, {"$project": {"password_hash": 0}}, {"$addFields": {"id": {"$toString": "$_id"}}}, {"$project": {"_id": 0}}]
    users = await db.users.aggregate(pipeline).to_list(100)
    return users

@api_router.post("/users")
async def create_user(request: Request, body: UserCreate):
    user = await get_current_user(request)
    if user["role"] not in ["super_admin", "tenant_admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    email = body.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    now = datetime.now(timezone.utc).isoformat()
    user_doc = {"email": email, "password_hash": hash_password(body.password), "name": body.name, "role": body.role, "tenant_id": user["tenant_id"], "created_at": now}
    result = await db.users.insert_one(user_doc)
    return {"id": str(result.inserted_id), "email": email, "name": body.name, "role": body.role}

# ==================== CRM BULK CONTACT ACTIONS ====================

class BulkContactAction(BaseModel):
    contact_ids: List[str]
    action: str
    stage: Optional[str] = None

@api_router.post("/crm/contacts/bulk-action")
async def bulk_contact_action(request: Request, body: BulkContactAction):
    user = await get_current_user(request)
    now = datetime.now(timezone.utc).isoformat()
    if body.action == "move" and body.stage:
        result = await db.crm_contacts.update_many({"id": {"$in": body.contact_ids}, "tenant_id": user["tenant_id"]}, {"$set": {"stage": body.stage, "updated_at": now}})
        return {"message": f"{result.modified_count} contactos movidos a {body.stage}"}
    elif body.action == "delete":
        result = await db.crm_contacts.delete_many({"id": {"$in": body.contact_ids}, "tenant_id": user["tenant_id"]})
        await db.crm_deals.delete_many({"contact_id": {"$in": body.contact_ids}, "tenant_id": user["tenant_id"]})
        return {"message": f"{result.deleted_count} contactos eliminados"}
    raise HTTPException(status_code=400, detail="Accion invalida")

# ==================== IMPORT ====================

@api_router.post("/import/leads")
async def import_leads(request: Request):
    import openpyxl
    import io
    user = await get_current_user(request)
    form = await request.form()
    file = form.get("file")
    if not file:
        raise HTTPException(status_code=400, detail="No se recibio archivo")
    contents = await file.read()
    try:
        wb = openpyxl.load_workbook(io.BytesIO(contents))
        ws = wb.active
        rows = list(ws.iter_rows(min_row=1, values_only=True))
        if len(rows) < 2:
            raise HTTPException(status_code=400, detail="El archivo esta vacio o solo tiene headers")
        headers = [str(h).strip().lower() if h else "" for h in rows[0]]
        now = datetime.now(timezone.utc).isoformat()
        imported = 0
        for row in rows[1:]:
            data = {}
            for i, val in enumerate(row):
                if i < len(headers) and headers[i]:
                    data[headers[i]] = str(val).strip() if val else ""
            bname = data.get("business_name") or data.get("empresa") or data.get("nombre") or data.get("name") or ""
            if not bname:
                continue
            lead = {
                "id": str(uuid.uuid4()), "tenant_id": user["tenant_id"], "job_id": "",
                "business_name": bname,
                "raw_category": data.get("category") or data.get("categoria") or data.get("raw_category") or "",
                "normalized_category": data.get("normalized_category") or data.get("categoria") or data.get("category") or "",
                "province": data.get("province") or data.get("provincia") or "",
                "city": data.get("city") or data.get("ciudad") or "",
                "website": data.get("website") or data.get("web") or data.get("sitio_web") or "",
                "email": data.get("email") or data.get("correo") or "",
                "phone": data.get("phone") or data.get("telefono") or data.get("tel") or "",
                "ai_score": int(data.get("ai_score") or data.get("score") or 0) if str(data.get("ai_score") or data.get("score") or "0").isdigit() else 0,
                "quality_level": data.get("quality_level") or "imported",
                "recommendation": data.get("recommendation") or "Importado desde Excel",
                "recommended_first_line": data.get("recommended_first_line") or "",
                "status": "raw", "created_at": now, "updated_at": now
            }
            await db.leads.insert_one(lead)
            imported += 1
        return {"message": f"{imported} leads importados exitosamente", "imported": imported}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al procesar archivo: {str(e)}")

@api_router.post("/import/crm-contacts")
async def import_crm_contacts(request: Request):
    import openpyxl
    import io
    user = await get_current_user(request)
    form = await request.form()
    file = form.get("file")
    if not file:
        raise HTTPException(status_code=400, detail="No se recibio archivo")
    contents = await file.read()
    try:
        wb = openpyxl.load_workbook(io.BytesIO(contents))
        ws = wb.active
        rows = list(ws.iter_rows(min_row=1, values_only=True))
        if len(rows) < 2:
            raise HTTPException(status_code=400, detail="El archivo esta vacio")
        headers = [str(h).strip().lower() if h else "" for h in rows[0]]
        now = datetime.now(timezone.utc).isoformat()
        imported = 0
        for row in rows[1:]:
            data = {}
            for i, val in enumerate(row):
                if i < len(headers) and headers[i]:
                    data[headers[i]] = str(val).strip() if val else ""
            bname = data.get("business_name") or data.get("empresa") or data.get("nombre") or data.get("name") or ""
            if not bname:
                continue
            contact = {
                "id": str(uuid.uuid4()), "tenant_id": user["tenant_id"], "lead_id": "",
                "business_name": bname,
                "contact_name": data.get("contact_name") or data.get("contacto") or "",
                "email": data.get("email") or data.get("correo") or "",
                "phone": data.get("phone") or data.get("telefono") or "",
                "city": data.get("city") or data.get("ciudad") or "",
                "province": data.get("province") or data.get("provincia") or "",
                "category": data.get("category") or data.get("categoria") or "",
                "source": "excel_import", "notes": data.get("notes") or data.get("notas") or "",
                "stage": "nuevo", "ai_score": 0, "deal_count": 0, "total_value": 0,
                "created_at": now, "updated_at": now
            }
            await db.crm_contacts.insert_one(contact)
            imported += 1
        return {"message": f"{imported} contactos importados al CRM", "imported": imported}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al procesar archivo: {str(e)}")

# ==================== EMAIL MARKETING ====================

class EmailListCreate(BaseModel):
    name: str
    description: Optional[str] = ""

class EmailCampaignCreate(BaseModel):
    name: str
    list_id: Optional[str] = ""
    template_id: Optional[str] = ""
    subject: Optional[str] = ""
    from_name: Optional[str] = ""
    from_email: Optional[str] = ""

class AutomationCreate(BaseModel):
    name: str
    trigger: Optional[str] = "manual"
    steps: Optional[List[Dict[str, Any]]] = []

@api_router.get("/email-marketing/lists")
async def list_email_lists(request: Request):
    user = await get_current_user(request)
    lists = await db.email_lists.find({"tenant_id": user["tenant_id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return lists

@api_router.post("/email-marketing/lists")
async def create_email_list(request: Request, body: EmailListCreate):
    user = await get_current_user(request)
    now = datetime.now(timezone.utc).isoformat()
    doc = {"id": str(uuid.uuid4()), "tenant_id": user["tenant_id"], "name": body.name, "description": body.description or "", "subscriber_count": 0, "created_at": now, "updated_at": now}
    await db.email_lists.insert_one(doc)
    return serialize_doc(doc)

@api_router.get("/email-marketing/campaigns")
async def list_email_campaigns(request: Request):
    user = await get_current_user(request)
    campaigns = await db.email_campaigns.find({"tenant_id": user["tenant_id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return campaigns

@api_router.post("/email-marketing/campaigns")
async def create_email_campaign(request: Request, body: EmailCampaignCreate):
    user = await get_current_user(request)
    now = datetime.now(timezone.utc).isoformat()
    doc = {"id": str(uuid.uuid4()), "tenant_id": user["tenant_id"], "name": body.name, "list_id": body.list_id or "", "template_id": body.template_id or "", "subject": body.subject or "", "from_name": body.from_name or "", "from_email": body.from_email or "", "status": "borrador", "sent_count": 0, "open_count": 0, "click_count": 0, "bounce_count": 0, "unsub_count": 0, "created_at": now, "updated_at": now}
    await db.email_campaigns.insert_one(doc)
    return serialize_doc(doc)

@api_router.post("/email-marketing/campaigns/{campaign_id}/simulate")
async def simulate_email_campaign(request: Request, campaign_id: str):
    user = await get_current_user(request)
    campaign = await db.email_campaigns.find_one({"id": campaign_id, "tenant_id": user["tenant_id"]})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campana no encontrada")
    now = datetime.now(timezone.utc).isoformat()
    sent = random.randint(200, 2000)
    opens = int(sent * random.uniform(0.20, 0.45))
    clicks = int(opens * random.uniform(0.10, 0.30))
    bounces = int(sent * random.uniform(0.01, 0.05))
    unsubs = int(sent * random.uniform(0.001, 0.01))
    await db.email_campaigns.update_one({"id": campaign_id}, {"$set": {"status": "enviada", "sent_count": sent, "open_count": opens, "click_count": clicks, "bounce_count": bounces, "unsub_count": unsubs, "sent_at": now, "updated_at": now}})
    updated = await db.email_campaigns.find_one({"id": campaign_id}, {"_id": 0})
    return updated

@api_router.get("/email-marketing/automations")
async def list_automations(request: Request):
    user = await get_current_user(request)
    autos = await db.email_automations.find({"tenant_id": user["tenant_id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return autos

@api_router.post("/email-marketing/automations")
async def create_automation(request: Request, body: AutomationCreate):
    user = await get_current_user(request)
    now = datetime.now(timezone.utc).isoformat()
    default_steps = [
        {"type": "email", "delay_days": 0, "subject": "Primer contacto", "template": ""},
        {"type": "wait", "delay_days": 3, "subject": "", "template": ""},
        {"type": "condition", "delay_days": 0, "subject": "Si abrio email", "template": ""},
        {"type": "email", "delay_days": 0, "subject": "Follow-up", "template": ""},
        {"type": "wait", "delay_days": 5, "subject": "", "template": ""},
        {"type": "email", "delay_days": 0, "subject": "Ultimo contacto", "template": ""},
    ]
    doc = {"id": str(uuid.uuid4()), "tenant_id": user["tenant_id"], "name": body.name, "trigger": body.trigger or "manual", "steps": body.steps if body.steps else default_steps, "status": "borrador", "active_count": 0, "completed_count": 0, "created_at": now, "updated_at": now}
    await db.email_automations.insert_one(doc)
    return serialize_doc(doc)

@api_router.get("/email-marketing/stats")
async def email_marketing_stats(request: Request):
    user = await get_current_user(request)
    tid = user["tenant_id"]
    lists = await db.email_lists.count_documents({"tenant_id": tid})
    campaigns = await db.email_campaigns.count_documents({"tenant_id": tid})
    automations = await db.email_automations.count_documents({"tenant_id": tid})
    pipeline = [{"$match": {"tenant_id": tid}}, {"$group": {"_id": None, "sent": {"$sum": "$sent_count"}, "opens": {"$sum": "$open_count"}, "clicks": {"$sum": "$click_count"}, "bounces": {"$sum": "$bounce_count"}, "unsubs": {"$sum": "$unsub_count"}}}]
    totals = await db.email_campaigns.aggregate(pipeline).to_list(1)
    t = totals[0] if totals else {}
    return {"lists": lists, "campaigns": campaigns, "automations": automations, "total_sent": t.get("sent", 0), "total_opens": t.get("opens", 0), "total_clicks": t.get("clicks", 0), "total_bounces": t.get("bounces", 0), "total_unsubs": t.get("unsubs", 0), "open_rate": round((t.get("opens", 0) / max(t.get("sent", 0), 1)) * 100, 1), "click_rate": round((t.get("clicks", 0) / max(t.get("opens", 0), 1)) * 100, 1)}

# ==================== AI ENDPOINTS ====================

@api_router.post("/ai/generate-template")
async def ai_generate_template(request: Request, body: Dict[str, Any] = {}):
    user = await get_current_user(request)
    industry = body.get("industry", "general")
    objective = body.get("objective", "generar interes")
    tone = body.get("tone", "profesional")
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(api_key=os.environ.get("EMERGENT_LLM_KEY", ""), session_id=f"template-{uuid.uuid4()}", system_message="Eres un experto en copywriting y neuromarketing. Generas emails comerciales persuasivos en español usando tecnicas de neuropersuasion (urgencia, reciprocidad, prueba social, escasez, autoridad). Responde SOLO en formato JSON con las keys: subject, html_body, plain_text, variables (array de strings), first_line.")
        prompt = f"Genera un email de {objective} para la industria de {industry} con tono {tone}. Usa tecnicas de neuropersuasion. El email debe tener variables como {{{{business_name}}}}, {{{{city}}}}, {{{{sender_name}}}}. Responde en JSON."
        response = await chat.send_message(UserMessage(text=prompt))
        import json
        try:
            clean = response.strip()
            if clean.startswith("```"):
                clean = clean.split("\n", 1)[1].rsplit("```", 1)[0]
            result = json.loads(clean)
        except:
            result = {"subject": f"Oportunidad exclusiva para {{{{business_name}}}} - {industry}", "html_body": f"<p>Estimado equipo de <strong>{{{{business_name}}}}</strong>,</p><p>{response[:500]}</p><p>Saludos cordiales,<br/>{{{{sender_name}}}}</p>", "plain_text": response[:500], "variables": ["business_name", "city", "sender_name"], "first_line": "Notamos que su empresa tiene una presencia destacada."}
        return {"generated": True, **result}
    except Exception as e:
        logger.error(f"AI generation error: {e}")
        return {"generated": False, "error": str(e), "subject": f"Oportunidad para {{{{business_name}}}} en {industry}", "html_body": f"<p>Estimado equipo de <strong>{{{{business_name}}}}</strong>,</p><p>Nos dirigimos a usted porque identificamos una oportunidad unica para su negocio en el sector de {industry}.</p><p>Nos encantaria coordinar una breve llamada para explorar como podemos ayudarlos.</p><p>Saludos cordiales,<br/>{{{{sender_name}}}}</p>", "plain_text": "", "variables": ["business_name", "sender_name"], "first_line": "Identificamos una oportunidad unica para su negocio."}

@api_router.post("/ai/flow-bot")
async def ai_flow_bot(request: Request, body: Dict[str, Any] = {}):
    user = await get_current_user(request)
    section = body.get("section", "general")
    tid = user["tenant_id"]
    context_data = {}
    context_data["total_leads"] = await db.leads.count_documents({"tenant_id": tid})
    context_data["scored_leads"] = await db.leads.count_documents({"tenant_id": tid, "status": "scored"})
    context_data["approved_leads"] = await db.leads.count_documents({"tenant_id": tid, "status": "approved"})
    context_data["crm_contacts"] = await db.crm_contacts.count_documents({"tenant_id": tid})
    context_data["campaigns"] = await db.campaigns.count_documents({"tenant_id": tid})
    context_data["deals"] = await db.crm_deals.count_documents({"tenant_id": tid})
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(api_key=os.environ.get("EMERGENT_LLM_KEY", ""), session_id=f"flowbot-{uuid.uuid4()}", system_message="Eres Flow Bot, el asistente inteligente de Spectra Flow. Analizas los datos del usuario y das recomendaciones accionables en español. Se breve y directo. Usa bullets. Maximo 5 recomendaciones.")
        prompt = f"El usuario esta en la seccion '{section}'. Datos actuales: {json.dumps(context_data)}. Analiza y dame recomendaciones especificas de que deberia hacer ahora."
        import json
        response = await chat.send_message(UserMessage(text=prompt))
        return {"response": response, "context": context_data}
    except Exception as e:
        recommendations = []
        if context_data.get("scored_leads", 0) > 0:
            recommendations.append(f"Tenes {context_data['scored_leads']} leads calificados sin revisar. Te recomiendo ir a Leads y aprobar los mejores.")
        if context_data.get("approved_leads", 0) > 0 and context_data.get("campaigns", 0) == 0:
            recommendations.append(f"Tenes {context_data['approved_leads']} leads aprobados. Crea una campana para contactarlos.")
        if context_data.get("crm_contacts", 0) > 0 and context_data.get("deals", 0) == 0:
            recommendations.append(f"Tenes {context_data['crm_contacts']} contactos en el CRM sin oportunidades. Crea oportunidades para trackear el pipeline.")
        if not recommendations:
            recommendations.append("Comenza buscando prospectos en el Buscador de Prospectos para alimentar tu pipeline.")
        return {"response": "\n".join([f"- {r}" for r in recommendations]), "context": context_data}

@api_router.post("/ai/help")
async def ai_help(request: Request, body: Dict[str, Any] = {}):
    user = await get_current_user(request)
    question = body.get("question", "")
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(api_key=os.environ.get("EMERGENT_LLM_KEY", ""), session_id=f"help-{uuid.uuid4()}", system_message="Eres el asistente de ayuda de Spectra Flow. Explicas como usar la plataforma de manera clara y concisa en español. Spectra Flow es una plataforma de prospeccion, calificacion de leads, email marketing y CRM. Modulos: Buscador de Prospectos, Flow IA, Leads, Campanas, Plantillas, Dominios, Spectra CRM, Email Marketing, Analisis, Configuracion.")
        response = await chat.send_message(UserMessage(text=question))
        return {"response": response}
    except Exception as e:
        help_texts = {"general": "Spectra Flow te permite buscar prospectos, calificarlos con IA, crear campanas de email y gestionar oportunidades en el CRM.", "prospeccion": "En el Buscador de Prospectos selecciona pais, provincia, ciudad e industria. Flow IA buscara y calificara prospectos automaticamente.", "leads": "En Leads podes ver, aprobar, rechazar y enviar leads al CRM o a secuencias de email.", "crm": "En Spectra CRM gestionas contactos, creas oportunidades y moves el pipeline con drag & drop.", "email": "En Email Marketing creas listas, campanas masivas y automatizaciones de email."}
        return {"response": help_texts.get(question.lower()[:10], help_texts["general"])}

# ==================== MODULE MANAGEMENT ====================

@api_router.get("/tenant/modules")
async def get_tenant_modules(request: Request):
    user = await get_current_user(request)
    tenant = await db.tenants.find_one({"id": user["tenant_id"]}, {"_id": 0})
    return tenant.get("modules", {"prospeccion": True, "crm": True, "email_marketing": True}) if tenant else {"prospeccion": True, "crm": True, "email_marketing": True}

@api_router.put("/tenant/modules")
async def update_tenant_modules(request: Request, body: Dict[str, bool] = {}):
    user = await get_current_user(request)
    if user["role"] not in ["super_admin", "tenant_admin"]:
        raise HTTPException(status_code=403, detail="Sin permisos")
    await db.tenants.update_one({"id": user["tenant_id"]}, {"$set": {"modules": body}})
    return body

# ==================== BULK DEAL ACTIONS ====================

class BulkDealAction(BaseModel):
    deal_ids: List[str]
    action: str
    stage: Optional[str] = None

@api_router.post("/crm/deals/bulk-action")
async def bulk_deal_action(request: Request, body: BulkDealAction):
    user = await get_current_user(request)
    now = datetime.now(timezone.utc).isoformat()
    if body.action == "move" and body.stage:
        result = await db.crm_deals.update_many({"id": {"$in": body.deal_ids}, "tenant_id": user["tenant_id"]}, {"$set": {"stage": body.stage, "updated_at": now}})
        return {"message": f"{result.modified_count} oportunidades movidas a {body.stage}"}
    elif body.action == "delete":
        result = await db.crm_deals.delete_many({"id": {"$in": body.deal_ids}, "tenant_id": user["tenant_id"]})
        return {"message": f"{result.deleted_count} oportunidades eliminadas"}
    raise HTTPException(status_code=400, detail="Accion invalida")

# ==================== EXPORT ====================

@api_router.get("/export/leads")
async def export_leads(request: Request):
    from fastapi.responses import StreamingResponse
    import openpyxl
    import io
    user = await get_current_user(request)
    leads = await db.leads.find({"tenant_id": user["tenant_id"]}, {"_id": 0}).to_list(5000)
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Leads"
    headers = ["business_name", "normalized_category", "province", "city", "email", "phone", "website", "ai_score", "quality_level", "status", "recommendation"]
    ws.append(headers)
    for lead in leads:
        ws.append([lead.get(h, "") for h in headers])
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": "attachment; filename=leads_export.xlsx"})

@api_router.get("/export/crm-contacts")
async def export_crm_contacts(request: Request):
    from fastapi.responses import StreamingResponse
    import openpyxl
    import io
    user = await get_current_user(request)
    contacts = await db.crm_contacts.find({"tenant_id": user["tenant_id"]}, {"_id": 0}).to_list(5000)
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "CRM Contacts"
    headers = ["business_name", "contact_name", "email", "phone", "city", "province", "category", "stage", "ai_score", "deal_count", "total_value"]
    ws.append(headers)
    for c in contacts:
        ws.append([c.get(h, "") for h in headers])
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": "attachment; filename=crm_contacts_export.xlsx"})

# ==================== INTEGRATION WEBHOOKS ====================

@api_router.post("/webhooks/n8n/job-result/{job_id}")
async def n8n_job_result(request: Request, job_id: str, body: Dict[str, Any] = {}):
    """Receives processed leads from n8n after Outscraper + Dify pipeline"""
    api_key = request.headers.get("X-Api-Key", "")
    if not api_key:
        raise HTTPException(status_code=401, detail="API key required")
    job = await db.prospect_jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    now = datetime.now(timezone.utc).isoformat()
    leads_data = body.get("leads", [])
    raw_count = body.get("raw_count", len(leads_data))
    inserted = 0
    for ld in leads_data:
        lead = {
            "id": str(uuid.uuid4()), "tenant_id": job["tenant_id"], "job_id": job_id,
            "business_name": ld.get("business_name", ld.get("name", "")),
            "raw_category": ld.get("raw_category", ld.get("category", "")),
            "normalized_category": ld.get("normalized_category", ld.get("category", "")),
            "province": ld.get("province", ld.get("state", job.get("province", ""))),
            "city": ld.get("city", job.get("city", "")),
            "website": ld.get("website", ld.get("site", "")),
            "email": ld.get("email", ""),
            "phone": ld.get("phone", ld.get("phone_number", "")),
            "ai_score": int(ld.get("ai_score", ld.get("score", 0))),
            "quality_level": ld.get("quality_level", "scored"),
            "recommendation": ld.get("recommendation", ""),
            "recommended_first_line": ld.get("recommended_first_line", ld.get("first_line", "")),
            "address": ld.get("address", ld.get("full_address", "")),
            "rating": ld.get("rating", 0),
            "reviews_count": ld.get("reviews_count", ld.get("reviews", 0)),
            "status": "scored" if int(ld.get("ai_score", 0)) >= 50 else "cleaned",
            "created_at": now, "updated_at": now
        }
        await db.leads.insert_one(lead)
        inserted += 1
    qualified = sum(1 for ld in leads_data if int(ld.get("ai_score", 0)) >= 50)
    rejected = inserted - qualified
    stages = [
        {"name": "job_created", "status": "completed", "timestamp": job.get("created_at", now)},
        {"name": "scraping", "status": "completed", "timestamp": now},
        {"name": "prospects_found", "status": "completed", "timestamp": now},
        {"name": "ai_cleaning", "status": "completed", "timestamp": now},
        {"name": "scoring_completed", "status": "completed", "timestamp": now},
        {"name": "ready_for_review", "status": "completed", "timestamp": now}
    ]
    await db.prospect_jobs.update_one({"id": job_id}, {"$set": {
        "status": "completed", "raw_count": raw_count, "cleaned_count": inserted,
        "qualified_count": qualified, "rejected_count": rejected, "stages": stages, "updated_at": now
    }})
    return {"message": f"{inserted} leads imported, {qualified} qualified", "job_id": job_id}

@api_router.post("/webhooks/n8n/job-progress/{job_id}")
async def n8n_job_progress(request: Request, job_id: str, body: Dict[str, Any] = {}):
    """Updates job progress from n8n (stage by stage)"""
    stage_name = body.get("stage", "")
    stage_status = body.get("status", "completed")
    raw_count = body.get("raw_count")
    job = await db.prospect_jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    now = datetime.now(timezone.utc).isoformat()
    stages = job.get("stages", [])
    for s in stages:
        if s["name"] == stage_name:
            s["status"] = stage_status
            s["timestamp"] = now
    update = {"stages": stages, "updated_at": now, "status": "processing"}
    if raw_count is not None:
        update["raw_count"] = raw_count
    await db.prospect_jobs.update_one({"id": job_id}, {"$set": update})
    return {"message": f"Stage {stage_name} updated to {stage_status}"}

@api_router.post("/webhooks/chatwoot/lead")
async def chatwoot_lead_webhook(request: Request, body: Dict[str, Any] = {}):
    """Receives new leads from Chatwoot/OptimIA Bot via n8n"""
    api_key = request.headers.get("X-Api-Key", "")
    tenant_id = body.get("tenant_id", "")
    if not tenant_id:
        tenant = await db.tenants.find_one({}, {"_id": 0, "id": 1})
        tenant_id = tenant["id"] if tenant else ""
    if not tenant_id:
        raise HTTPException(status_code=400, detail="tenant_id required")
    now = datetime.now(timezone.utc).isoformat()
    contact = {
        "id": str(uuid.uuid4()), "tenant_id": tenant_id, "lead_id": "",
        "business_name": body.get("name", body.get("business_name", "Lead de OptimIA Bot")),
        "contact_name": body.get("contact_name", body.get("name", "")),
        "email": body.get("email", ""),
        "phone": body.get("phone", body.get("phone_number", "")),
        "city": body.get("city", ""),
        "province": body.get("province", ""),
        "category": body.get("category", ""),
        "source": "optimia_bot",
        "notes": body.get("message", body.get("notes", "")),
        "stage": "nuevo", "ai_score": 0, "deal_count": 0, "total_value": 0,
        "created_at": now, "updated_at": now
    }
    await db.crm_contacts.insert_one(contact)
    return {"message": "Contact created from OptimIA Bot", "contact_id": contact["id"]}

@api_router.post("/webhooks/resend/events")
async def resend_events_webhook(request: Request, body: Dict[str, Any] = {}):
    """Receives email events from Resend (opens, clicks, bounces)"""
    event_type = body.get("type", "")
    email_data = body.get("data", {})
    logger.info(f"Resend event: {event_type} - {email_data.get('email_id', '')}")
    return {"received": True}

# ==================== SEED DATA ====================

async def seed_data():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@spectraflow.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin123!")
    existing_admin = await db.users.find_one({"email": admin_email})
    if existing_admin:
        if not verify_password(admin_password, existing_admin["password_hash"]):
            await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info("Seed data already exists")
        os.makedirs("/app/memory", exist_ok=True)
        with open("/app/memory/test_credentials.md", "w") as f:
            f.write(f"# Test Credentials\n\n## Admin Account\n- Email: {admin_email}\n- Password: {admin_password}\n- Role: super_admin\n\n## Demo Operator\n- Email: demo@spectraflow.com\n- Password: Demo123!\n- Role: operator\n\n## Auth Endpoints\n- POST /api/auth/login\n- POST /api/auth/register\n- GET /api/auth/me\n- POST /api/auth/logout\n")
        return

    logger.info("Seeding demo data...")
    tenant_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    await db.tenants.insert_one({"id": tenant_id, "name": "Spectra Demo", "branding": {"company_name": "Spectra Demo", "logo_url": "", "primary_color": "#1D4ED8", "secondary_color": "#6366F1"}, "sender_defaults": {"name": "Spectra Flow", "email": "noreply@spectraflow.com"}, "modules": {"prospeccion": True, "crm": True, "email_marketing": True}, "created_at": now})
    await db.users.insert_one({"email": admin_email, "password_hash": hash_password(admin_password), "name": "Admin", "role": "super_admin", "tenant_id": tenant_id, "created_at": now})
    await db.users.insert_one({"email": "demo@spectraflow.com", "password_hash": hash_password("Demo123!"), "name": "Maria Garcia", "role": "operator", "tenant_id": tenant_id, "created_at": now})

    await db.users.create_index("email", unique=True)
    await db.leads.create_index([("tenant_id", 1), ("status", 1)])
    await db.leads.create_index([("tenant_id", 1), ("job_id", 1)])
    await db.prospect_jobs.create_index([("tenant_id", 1)])

    jobs_data = [
        {"province": "Tucuman", "city": "San Miguel de Tucuman", "category": "Real Estate", "status": "completed", "quantity": 200},
        {"province": "Buenos Aires", "city": "CABA", "category": "Technology", "status": "completed", "quantity": 150},
        {"province": "Cordoba", "city": "Cordoba Capital", "category": "Gastronomia", "status": "processing", "quantity": 100},
    ]
    job_ids = []
    for jd in jobs_data:
        job_id = str(uuid.uuid4())
        job_ids.append(job_id)
        raw = random.randint(int(jd["quantity"]*0.8), int(jd["quantity"]*1.2))
        cleaned = int(raw * 0.78)
        qualified = int(cleaned * 0.72)
        stages = [
            {"name": "job_created", "status": "completed", "timestamp": now},
            {"name": "scraping", "status": "completed", "timestamp": now},
            {"name": "prospects_found", "status": "completed", "timestamp": now},
            {"name": "ai_cleaning", "status": "completed" if jd["status"] == "completed" else "in_progress", "timestamp": now},
            {"name": "scoring_completed", "status": "completed" if jd["status"] == "completed" else "pending", "timestamp": now if jd["status"] == "completed" else None},
            {"name": "ready_for_review", "status": "completed" if jd["status"] == "completed" else "pending", "timestamp": now if jd["status"] == "completed" else None}
        ]
        await db.prospect_jobs.insert_one({"id": job_id, "tenant_id": tenant_id, "province": jd["province"], "city": jd["city"], "category": jd["category"], "quantity": jd["quantity"], "filters": {}, "status": jd["status"], "raw_count": raw, "cleaned_count": cleaned, "qualified_count": qualified, "rejected_count": cleaned - qualified, "approved_count": random.randint(0, qualified // 2), "stages": stages, "created_by": "Admin", "created_at": now, "updated_at": now})

    businesses = [("Inmobiliaria del Norte SA", "Real Estate", 0), ("Casa & Hogar SRL", "Real Estate", 0), ("Propiedades Premium SA", "Real Estate", 0), ("Inversiones Tucuman SAS", "Real Estate", 0), ("Gestion Inmobiliaria", "Real Estate", 0), ("TechNova Solutions", "Technology", 1), ("Digital Minds SRL", "Technology", 1), ("CloudArg SA", "Technology", 1), ("InnoSoft Patagonia", "Technology", 1), ("DataFlow Analytics", "Technology", 1), ("El Buen Sabor", "Gastronomia", 2), ("Restaurante Don Carlos", "Gastronomia", 2), ("Cafe Central", "Gastronomia", 2), ("La Parrilla del Sur", "Gastronomia", 2), ("Bistro Moderno", "Gastronomia", 2), ("Despacho Legal Rios", "Legal", 0), ("Consultoria Empresarial Plus", "Consulting", 1), ("Seguros del Litoral", "Insurance", 0), ("Clinica Dental Premium", "Health", 1), ("Transporte Ejecutivo NOA", "Logistics", 2)]
    statuses_pool = ["scored", "scored", "scored", "approved", "approved", "cleaned", "rejected", "queued_for_sequence", "contacted", "opened", "replied", "interested", "sent_to_crm"]
    cities = ["San Miguel de Tucuman", "CABA", "Cordoba Capital"]
    provinces = ["Tucuman", "Buenos Aires", "Cordoba"]
    for name, cat, ji in businesses:
        score = random.randint(35, 98)
        ql = "excellent" if score >= 80 else ("good" if score >= 60 else ("average" if score >= 45 else "poor"))
        await db.leads.insert_one({"id": str(uuid.uuid4()), "tenant_id": tenant_id, "job_id": job_ids[min(ji, len(job_ids)-1)], "business_name": name, "raw_category": cat.lower(), "normalized_category": cat, "province": provinces[min(ji, 2)], "city": cities[min(ji, 2)], "website": f"www.{name.lower().replace(' ', '').replace('&','')[:15]}.com.ar", "email": f"info@{name.lower().replace(' ', '').replace('&','')[:10]}.com.ar", "phone": f"+54 {random.randint(11,99)} {random.randint(1000,9999)}-{random.randint(1000,9999)}", "ai_score": score, "quality_level": ql, "recommendation": f"{'Highly recommended' if ql in ['excellent','good'] else 'Needs review'} - AI confidence {score}%", "recommended_first_line": f"Notamos que {name} tiene presencia destacada en el sector de {cat}.", "status": random.choice(statuses_pool), "created_at": now, "updated_at": now})

    campaigns_data = [
        {"name": "Real Estate Tucuman Q1 2026", "status": "active", "lead_count": 45, "sent_count": 38, "open_count": 22, "click_count": 8, "reply_count": 5, "interested_count": 3, "crm_count": 2},
        {"name": "Tech Companies Buenos Aires", "status": "draft", "lead_count": 30, "sent_count": 0, "open_count": 0, "click_count": 0, "reply_count": 0, "interested_count": 0, "crm_count": 0},
        {"name": "Gastronomia Cordoba Pilot", "status": "completed", "lead_count": 20, "sent_count": 20, "open_count": 14, "click_count": 6, "reply_count": 4, "interested_count": 2, "crm_count": 1}
    ]
    for c in campaigns_data:
        await db.campaigns.insert_one({"id": str(uuid.uuid4()), "tenant_id": tenant_id, **c, "template_id": "", "sender_profile_id": "", "lead_ids": [], "created_by": "Admin", "created_at": now, "updated_at": now})

    templates_data = [
        {"name": "Primer Contacto", "subject": "Oportunidad de colaboracion para {business_name}", "html_body": "<p>Estimado equipo de <strong>{business_name}</strong>,</p><p>{recommended_first_line}</p><p>En Spectra Flow, ayudamos a empresas del sector de <strong>{normalized_category}</strong> en <strong>{city}</strong> a potenciar su presencia digital.</p><p>Saludos cordiales,<br/>{sender_name}</p>", "variables": ["business_name", "recommended_first_line", "normalized_category", "city", "sender_name"]},
        {"name": "Follow-up", "subject": "Re: Oportunidad para {business_name}", "html_body": "<p>Hola,</p><p>Le escribo nuevamente respecto a nuestra propuesta para <strong>{business_name}</strong>.</p><p>Hemos trabajado con empresas similares en {city} logrando resultados significativos.</p><p>Saludos,<br/>{sender_name}</p>", "variables": ["business_name", "city", "sender_name"]},
        {"name": "Ultima Oportunidad", "subject": "Ultima oportunidad - {business_name}", "html_body": "<p>Estimado equipo,</p><p>Esta es mi ultima comunicacion. Entiendo que estan ocupados, pero no queria dejar pasar esta oportunidad para {business_name}.</p><p>Exitos,<br/>{sender_name}</p>", "variables": ["business_name", "sender_name"]}
    ]
    for t in templates_data:
        await db.templates.insert_one({"id": str(uuid.uuid4()), "tenant_id": tenant_id, **t, "plain_text": "", "signature": "", "created_at": now, "updated_at": now})

    await db.domains.insert_one({"id": str(uuid.uuid4()), "tenant_id": tenant_id, "domain": "spectraflow.com", "subdomain": "mail.spectraflow.com", "status": "verified", "dns_records": [{"type": "TXT", "name": "mail.spectraflow.com", "value": "v=spf1 include:_spf.resend.com ~all", "verified": True}, {"type": "CNAME", "name": "resend._domainkey.mail.spectraflow.com", "value": "resend.domainkey.resend.com", "verified": True}, {"type": "MX", "name": "mail.spectraflow.com", "value": "feedback-smtp.resend.com", "verified": True}], "sender_name": "Spectra Flow", "sender_email": "noreply@mail.spectraflow.com", "reply_to": "contacto@spectraflow.com", "signature": "El equipo de Spectra Flow", "warmup_status": "completed", "created_at": now, "updated_at": now})

    integrations = [
        {"name": "n8n", "display_name": "n8n Orchestration", "enabled": False, "base_url": "", "api_key": "", "status": "not_configured", "last_sync": None, "description": "Workflow orchestration and job execution"},
        {"name": "dify", "display_name": "Dify AI", "enabled": False, "base_url": "", "api_key": "", "status": "not_configured", "last_sync": None, "description": "AI cleaning and lead scoring"},
        {"name": "resend", "display_name": "Resend Email", "enabled": False, "base_url": "", "api_key": "", "status": "not_configured", "last_sync": None, "description": "Email sending and domain verification"},
        {"name": "espo_crm", "display_name": "Spectra CRM", "enabled": False, "base_url": "", "api_key": "", "status": "not_configured", "last_sync": None, "description": "Qualified lead handoff and CRM sync"},
        {"name": "optimia_bot", "display_name": "OptimIA Bot", "enabled": False, "base_url": "https://inbox.optimia.disruptive-sw.com", "api_key": "", "status": "not_configured", "last_sync": None, "description": "Omnichannel bot and live chat support"}
    ]
    for intg in integrations:
        await db.integration_configs.insert_one({"id": str(uuid.uuid4()), "tenant_id": tenant_id, **intg, "created_at": now, "updated_at": now})

    audit_entries = [
        {"action": "created_prospect_job", "entity_type": "prospect_job", "details": "Job for Real Estate in San Miguel de Tucuman"},
        {"action": "prospect_job_completed", "entity_type": "prospect_job", "details": "172 leads found and scored"},
        {"action": "leads_approved", "entity_type": "lead", "details": "12 leads approved for sequence"},
        {"action": "campaign_launched", "entity_type": "campaign", "details": "Real Estate Tucuman Q1 2026 launched"},
        {"action": "domain_verified", "entity_type": "domain", "details": "mail.spectraflow.com verified"},
        {"action": "leads_sent_to_crm", "entity_type": "crm_sync", "details": "3 leads synced to Espo CRM"},
    ]
    for entry in audit_entries:
        await db.audit_logs.insert_one({"id": str(uuid.uuid4()), "tenant_id": tenant_id, "user_id": "", "user_name": "Admin", **entry, "entity_id": "", "created_at": now})

    crm_logs = [
        {"lead_name": "Inmobiliaria del Norte SA", "status": "synced", "error": ""},
        {"lead_name": "TechNova Solutions", "status": "synced", "error": ""},
        {"lead_name": "El Buen Sabor", "status": "error", "error": "Connection timeout - CRM unreachable"},
    ]
    for cl in crm_logs:
        await db.crm_sync_logs.insert_one({"id": str(uuid.uuid4()), "tenant_id": tenant_id, "lead_id": "", **cl, "synced_at": now if cl["status"] == "synced" else None, "assigned_owner": "Carlos Rodriguez", "created_at": now})

    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(f"# Test Credentials\n\n## Admin Account\n- Email: {admin_email}\n- Password: {admin_password}\n- Role: super_admin\n\n## Demo Operator\n- Email: demo@spectraflow.com\n- Password: Demo123!\n- Role: operator\n\n## Auth Endpoints\n- POST /api/auth/login\n- POST /api/auth/register\n- GET /api/auth/me\n- POST /api/auth/logout\n")
    logger.info("Seed data created successfully!")

# ==================== STARTUP / SHUTDOWN ====================

@app.on_event("startup")
async def startup():
    await seed_data()

@app.on_event("shutdown")
async def shutdown():
    client.close()

app.include_router(api_router)

frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
