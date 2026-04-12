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
    province: str
    city: str
    category: str
    quantity: int = 100
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
        return {"message": "Token refreshed"}
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
        "province": body.province, "city": body.city,
        "category": body.category, "quantity": body.quantity,
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
    return {"message": f"{result.modified_count} leads updated to {new_status}"}

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

    await db.tenants.insert_one({"id": tenant_id, "name": "Spectra Demo", "branding": {"company_name": "Spectra Demo", "logo_url": "", "primary_color": "#1D4ED8", "secondary_color": "#6366F1"}, "sender_defaults": {"name": "Spectra Flow", "email": "noreply@spectraflow.com"}, "created_at": now})
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
