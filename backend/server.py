from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, status
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import io
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from bson import ObjectId
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME")

client: AsyncIOMotorClient | None = None
db = None


async def connect_to_mongo():
    global client, db
    client = AsyncIOMotorClient(
        MONGO_URL,
        serverSelectionTimeoutMS=20000
    )
    db = client[DB_NAME]
    await client.admin.command("ping")
    print("✅ MongoDB connected")


async def close_mongo():
    if client:
        client.close()
        print("🛑 MongoDB disconnected")

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'default_secret')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', '24'))

# Constants
MAX_INTERNS_PER_EMPLOYEE = 15

# Create the main app
app = FastAPI(
    title="HR Nexus API",
    docs_url="/docs",
    redoc_url="/redoc"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://hr-nexus.onrender.com","http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@api_router.post("/auth/login")
async def login(data: LoginRequest):
    user = await db.users.find_one({"email": data.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not bcrypt.checkpw(
        data.password.encode("utf-8"),
        user["password"].encode("utf-8")
    ):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    payload = {
        "user_id": str(user["_id"]),
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }

    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    user["_id"] = str(user["_id"])
    user.pop("password", None)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


@api_router.get("/auth/me")
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())
):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")

        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        user["_id"] = str(user["_id"])
        user.pop("password", None)

        return user

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Include the router
app.include_router(api_router)

security = HTTPBearer()

@app.on_event("startup")
async def startup_event():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_event():
    await close_mongo()


# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class UserBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    email: EmailStr
    full_name: str
    phone: str
    gender: str
    date_of_birth: str
    address: str
    preferred_language: str = "english"
    role: str
    profile_picture: Optional[str] = None

class InternFields(BaseModel):
    institution: Optional[str] = None
    current_year: Optional[str] = None
    major: Optional[str] = None
    internship_start: Optional[str] = None
    internship_end: Optional[str] = None
    portfolio_url: Optional[str] = None
    area_of_interest: Optional[str] = None

class EmployeeFields(BaseModel):
    employee_id: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    joining_date: Optional[str] = None
    reporting_manager: Optional[str] = None
    skills: Optional[List[str]] = []
    government_id: Optional[str] = None
    bank_account: Optional[str] = None
    bank_ifsc: Optional[str] = None

class HRManagerFields(BaseModel):
    access_level: Optional[str] = None
    departments_overseen: Optional[List[str]] = []
    approval_permissions: Optional[bool] = False
    work_experience: Optional[str] = None
    certifications: Optional[List[str]] = []
    office_location: Optional[str] = None
    emergency_contact: Optional[str] = None

class UserCreate(UserBase):
    password: str
    intern_fields: Optional[InternFields] = None
    employee_fields: Optional[EmployeeFields] = None
    hr_manager_fields: Optional[HRManagerFields] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class AttendanceRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: str
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    status: str = "present"
    notes: Optional[str] = None

class LeaveRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    start_date: str
    end_date: str
    reason: str
    leave_type: str
    status: str = "pending"
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    rejection_reason: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Announcement(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    category: str
    author_name: str
    author_role: str
    cover_image: Optional[str] = None
    tags: Optional[List[str]] = []
    created_by: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Optional[str] = None
    is_active: bool = True
    views: int = 0

class PerformanceGoal(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: str
    target_date: str
    progress: int = 0
    status: str = "in_progress"
    feedback: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TaskAssignment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: str
    priority: str = "medium"
    due_date: str
    status: str = "pending"
    assigned_by: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PayrollRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: Optional[str] = None
    user_role: Optional[str] = None
    month: str
    year: str
    base_amount: float
    bonus: float = 0
    deductions: float = 0
    net_amount: float = 0
    status: str = "pending"
    payment_date: Optional[str] = None
    notes: Optional[str] = None
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class OnboardingChecklist(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    items: List[dict]
    completed_items: int = 0
    total_items: int = 0
    status: str = "in_progress"
    updated_by: Optional[str] = None
    updated_at: Optional[str] = None

class MentorshipAssignment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    employee_name: str
    hr_mentor_id: str
    hr_mentor_name: str
    intern_ids: List[str] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Optional[str] = None

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== HELPER FUNCTIONS ====================

async def assign_intern_to_employee_and_hr(intern_id: str):
    """Auto-assign intern to an employee (max 15 interns per employee) and HR mentor"""
    employees = await db.users.find({"role": "employee"}, {"_id": 0}).to_list(1000)
    
    assigned_employee = None
    for emp in employees:
        intern_count = await db.users.count_documents({
            "role": "intern",
            "assigned_employee_id": emp["id"]
        })
        if intern_count < MAX_INTERNS_PER_EMPLOYEE:
            assigned_employee = emp
            break
    
    hr_manager = await db.users.find_one({"role": "hr_manager"}, {"_id": 0})
    
    update_data = {}
    if assigned_employee:
        update_data["assigned_employee_id"] = assigned_employee["id"]
        update_data["assigned_employee_name"] = assigned_employee["full_name"]
    if hr_manager:
        update_data["assigned_hr_mentor_id"] = hr_manager["id"]
        update_data["assigned_hr_mentor_name"] = hr_manager["full_name"]
    
    if update_data:
        await db.users.update_one({"id": intern_id}, {"$set": update_data})

async def create_sample_announcements():
    """Create sample announcements if none exist"""
    count = await db.announcements.count_documents({})
    if count == 0:
        sample_announcements = [
            {
                "id": str(uuid.uuid4()),
                "title": "Welcome to HR Nexus - Your Digital HR Partner",
                "content": """We are thrilled to announce the launch of HR Nexus, our comprehensive HR management platform designed to streamline all your human resource operations.

**What's New:**
- Seamless attendance tracking with one-click check-in/check-out
- Digital leave management system
- Performance tracking and goal setting
- Payroll management for all employees

**Getting Started:**
1. Complete your profile with all required documents
2. Set up your bank details for seamless payroll
3. Explore the dashboard to familiarize yourself with features

We're committed to making your HR experience smooth and efficient. Feel free to reach out to your HR mentor for any assistance.

*Together, let's build a better workplace!*""",
                "category": "general",
                "author_name": "HR Team",
                "author_role": "HR Manager",
                "cover_image": "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800",
                "tags": ["welcome", "announcement", "getting-started"],
                "created_by": "system",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "is_active": True,
                "views": 0
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Q4 2024 Company Performance & Growth Update",
                "content": """Dear Team,

We're excited to share our Q4 2024 performance highlights with you!

**Revenue Growth:**
- 35% increase in quarterly revenue compared to Q3
- Successfully onboarded 50+ new clients
- Expanded operations to 3 new cities

**Team Achievements:**
- Engineering team delivered 15 major features
- Customer satisfaction score reached 94%
- Employee retention rate at an all-time high of 96%

Keep up the amazing work, team!""",
                "category": "important",
                "author_name": "Leadership Team",
                "author_role": "HR Manager",
                "cover_image": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800",
                "tags": ["company-update", "performance", "growth"],
                "created_by": "system",
                "created_at": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat(),
                "is_active": True,
                "views": 45
            },
            {
                "id": str(uuid.uuid4()),
                "title": "New Learning & Development Opportunities",
                "content": """Exciting news for all team members!

We're launching new learning and development programs to help you grow in your career.

**Available Programs:**
- AWS Cloud Practitioner (Company Sponsored)
- Google Analytics Certification
- Agile/Scrum Master Certification
- Leadership Development Training

**How to Enroll:**
1. Visit the Learning Portal in your dashboard
2. Select your preferred program
3. Get manager approval
4. Start learning!

Invest in yourself - your growth is our priority!""",
                "category": "event",
                "author_name": "Learning & Development",
                "author_role": "HR Manager",
                "cover_image": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800",
                "tags": ["learning", "development", "training"],
                "created_by": "system",
                "created_at": (datetime.now(timezone.utc) - timedelta(days=5)).isoformat(),
                "is_active": True,
                "views": 128
            }
        ]
        await db.announcements.insert_many(sample_announcements)
        logger.info("Sample announcements created")

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_dict = user_data.model_dump()
    user_dict["id"] = user_id
    user_dict["password"] = hash_password(user_data.password)
    user_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    user_dict["application_status"] = "selected"
    user_dict["is_onboarded"] = user_data.role == "hr_manager"  # HR is auto-onboarded
    
    # Generate employee ID for employees
    if user_data.role == "employee" and user_data.employee_fields:
        if not user_data.employee_fields.employee_id:
            count = await db.users.count_documents({"role": "employee"})
            user_dict["employee_fields"]["employee_id"] = f"EMP{str(count + 1001).zfill(4)}"
        user_dict["is_mentor"] = False
        user_dict["mentoring_interns"] = []
    
    await db.users.insert_one(user_dict)
    
    # Auto-assign intern to employee and HR mentor
    if user_data.role == "intern":
        await assign_intern_to_employee_and_hr(user_id)
    
    # Create onboarding checklist for interns and employees (not HR)
    if user_data.role in ["intern", "employee"]:
        default_items = [
            {"id": "1", "title": "Documents uploaded", "completed": False},
            {"id": "2", "title": "Offer letter acknowledged", "completed": False},
            {"id": "3", "title": "Bank details submitted", "completed": False},
            {"id": "4", "title": "System access granted", "completed": False},
            {"id": "5", "title": "Orientation completed", "completed": False},
            {"id": "6", "title": "Reporting manager assigned", "completed": False}
        ]
        onboarding = OnboardingChecklist(
            user_id=user_id,
            items=default_items,
            total_items=len(default_items)
        )
        await db.onboarding.insert_one(onboarding.model_dump())
    
    await create_sample_announcements()
    
    token = create_token(user_id, user_data.email, user_data.role)
    updated_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    
    return TokenResponse(access_token=token, user=updated_user)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: LoginRequest):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["email"], user["role"])
    user_response = {k: v for k, v in user.items() if k != "password"}
    
    await create_sample_announcements()
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

@api_router.put("/auth/profile")
async def update_profile(updates: dict, current_user: dict = Depends(get_current_user)):
    updates.pop("password", None)
    updates.pop("id", None)
    updates.pop("email", None)
    
    await db.users.update_one({"id": current_user["id"]}, {"$set": updates})
    updated_user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "password": 0})
    return updated_user

# ==================== DOCUMENT ROUTES ====================

@api_router.post("/documents/upload")
async def upload_document(data: dict, current_user: dict = Depends(get_current_user)):
    """Upload a document (base64 encoded)"""
    doc_type = data.get("type")  # resume, id_proof, address_proof, etc.
    doc_data = data.get("data")  # base64 data
    doc_name = data.get("name")
    
    if not doc_type or not doc_data:
        raise HTTPException(status_code=400, detail="Document type and data required")
    
    # Store document reference
    doc_record = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "type": doc_type,
        "name": doc_name,
        "data": doc_data,
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Check if document of this type exists, update or insert
    existing = await db.documents.find_one({"user_id": current_user["id"], "type": doc_type})
    if existing:
        await db.documents.update_one(
            {"user_id": current_user["id"], "type": doc_type},
            {"$set": doc_record}
        )
    else:
        await db.documents.insert_one(doc_record)
    
    return {"message": "Document uploaded successfully", "type": doc_type}

@api_router.get("/documents/my-documents")
async def get_my_documents(current_user: dict = Depends(get_current_user)):
    """Get all documents for current user"""
    docs = await db.documents.find(
        {"user_id": current_user["id"]}, 
        {"_id": 0, "data": 0}  # Don't return data in list
    ).to_list(20)
    return docs

@api_router.get("/documents/{doc_type}")
async def get_document(doc_type: str, current_user: dict = Depends(get_current_user)):
    """Get a specific document"""
    doc = await db.documents.find_one(
        {"user_id": current_user["id"], "type": doc_type},
        {"_id": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@api_router.get("/documents/offer-letter/download")
async def download_offer_letter(current_user: dict = Depends(get_current_user)):
    """Generate and download offer letter PDF"""
    # Create a simple text-based PDF content
    pdf_content = f"""
    ═══════════════════════════════════════════════════════════════
    
                            HR NEXUS
                    OFFICIAL OFFER LETTER
    
    ═══════════════════════════════════════════════════════════════
    
    Date: {datetime.now().strftime("%B %d, %Y")}
    
    Dear {current_user.get('full_name', 'Valued Team Member')},
    
    ───────────────────────────────────────────────────────────────
    
    THANK YOU FOR JOINING US!
    
    We are delighted to welcome you to the HR Nexus family. Your 
    skills, experience, and enthusiasm will be valuable assets to 
    our organization.
    
    ───────────────────────────────────────────────────────────────
    
    POSITION DETAILS:
    
    • Role: {current_user.get('role', 'Team Member').replace('_', ' ').title()}
    • Department: {(current_user.get('employee_fields') or {}).get('department', 'To be assigned') if current_user.get('role') == 'employee' else (current_user.get('intern_fields') or {}).get('area_of_interest', 'To be assigned')}
    • Start Date: {(current_user.get('employee_fields') or {}).get('joining_date', (current_user.get('intern_fields') or {}).get('internship_start', 'As discussed'))}
    
    ───────────────────────────────────────────────────────────────
    
    We look forward to your contributions and wish you a successful
    journey with us.
    
    Best Regards,
    
    HR Team
    HR Nexus
    
    ═══════════════════════════════════════════════════════════════
    
    This is a computer-generated document.
    For queries, contact: hr@hrnexus.com
    
    ═══════════════════════════════════════════════════════════════
    """
    
    # Return as downloadable text file (simulating PDF)
    return StreamingResponse(
        io.BytesIO(pdf_content.encode('utf-8')),
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename=offer_letter_{current_user['id'][:8]}.txt"}
    )

# ==================== ATTENDANCE ROUTES ====================

@api_router.post("/attendance/check-in")
async def check_in(current_user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    existing = await db.attendance.find_one({"user_id": current_user["id"], "date": today})
    
    if existing and existing.get("check_in"):
        raise HTTPException(status_code=400, detail="Already checked in today")
    
    now = datetime.now(timezone.utc).isoformat()
    if existing:
        await db.attendance.update_one({"id": existing["id"]}, {"$set": {"check_in": now}})
    else:
        record = AttendanceRecord(user_id=current_user["id"], date=today, check_in=now)
        await db.attendance.insert_one(record.model_dump())
    
    return {"message": "Checked in successfully", "time": now}

@api_router.post("/attendance/check-out")
async def check_out(current_user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    existing = await db.attendance.find_one({"user_id": current_user["id"], "date": today})
    
    if not existing or not existing.get("check_in"):
        raise HTTPException(status_code=400, detail="Please check in first")
    
    if existing.get("check_out"):
        raise HTTPException(status_code=400, detail="Already checked out today")
    
    now = datetime.now(timezone.utc).isoformat()
    await db.attendance.update_one({"id": existing["id"]}, {"$set": {"check_out": now}})
    
    return {"message": "Checked out successfully", "time": now}

@api_router.get("/attendance/my-records")
async def get_my_attendance(current_user: dict = Depends(get_current_user)):
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    records = await db.attendance.find(
        {"user_id": current_user["id"], "date": {"$gte": thirty_days_ago}}, {"_id": 0}
    ).sort("date", -1).to_list(100)
    return records

@api_router.get("/attendance/today")
async def get_today_attendance(current_user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    record = await db.attendance.find_one(
        {"user_id": current_user["id"], "date": today}, {"_id": 0}
    )
    return record or {"date": today, "check_in": None, "check_out": None}

@api_router.get("/attendance/all")
async def get_all_attendance(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "hr_manager":
        raise HTTPException(status_code=403, detail="HR Manager access required")
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    records = await db.attendance.find(
        {"date": {"$gte": thirty_days_ago}}, {"_id": 0}
    ).sort("date", -1).to_list(1000)
    return records

# ==================== LEAVE ROUTES ====================

@api_router.post("/leave/apply")
async def apply_leave(leave_data: dict, current_user: dict = Depends(get_current_user)):
    leave = LeaveRequest(
        user_id=current_user["id"],
        start_date=leave_data["start_date"],
        end_date=leave_data["end_date"],
        reason=leave_data["reason"],
        leave_type=leave_data.get("leave_type", "casual")
    )
    await db.leaves.insert_one(leave.model_dump())
    return {"message": "Leave request submitted", "id": leave.id}

@api_router.get("/leave/my-requests")
async def get_my_leaves(current_user: dict = Depends(get_current_user)):
    leaves = await db.leaves.find({"user_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return leaves

@api_router.get("/leave/pending")
async def get_pending_leaves(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "hr_manager":
        raise HTTPException(status_code=403, detail="HR Manager access required")
    leaves = await db.leaves.find({"status": "pending"}, {"_id": 0}).sort("created_at", -1).to_list(100)
    for leave in leaves:
        user = await db.users.find_one({"id": leave["user_id"]}, {"_id": 0, "password": 0})
        leave["user"] = user
    return leaves

@api_router.get("/leave/all")
async def get_all_leaves(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "hr_manager":
        raise HTTPException(status_code=403, detail="HR Manager access required")
    twenty_days_ago = (datetime.now(timezone.utc) - timedelta(days=20)).isoformat()
    leaves = await db.leaves.find(
        {"created_at": {"$gte": twenty_days_ago}}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    for leave in leaves:
        user = await db.users.find_one({"id": leave["user_id"]}, {"_id": 0, "password": 0})
        leave["user"] = user
    return leaves

@api_router.put("/leave/{leave_id}/approve")
async def approve_leave(leave_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "hr_manager":
        raise HTTPException(status_code=403, detail="HR Manager access required")
    result = await db.leaves.update_one(
        {"id": leave_id}, 
        {"$set": {
            "status": "approved",
            "approved_by": current_user["id"],
            "approved_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Leave request not found")
    return {"message": "Leave approved successfully"}

@api_router.put("/leave/{leave_id}/reject")
async def reject_leave(leave_id: str, data: dict = None, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "hr_manager":
        raise HTTPException(status_code=403, detail="HR Manager access required")
    update_data = {
        "status": "rejected",
        "approved_by": current_user["id"],
        "approved_at": datetime.now(timezone.utc).isoformat()
    }
    if data and data.get("reason"):
        update_data["rejection_reason"] = data["reason"]
    
    result = await db.leaves.update_one({"id": leave_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Leave request not found")
    return {"message": "Leave rejected"}

# ==================== ONBOARDING ROUTES (HR MANAGED) ====================

@api_router.get("/onboarding/checklist")
async def get_onboarding(current_user: dict = Depends(get_current_user)):
    """Get own onboarding checklist (read-only for interns/employees)"""
    if current_user["role"] == "hr_manager":
        return {"items": [], "completed_items": 0, "total_items": 0, "status": "completed", "is_hr": True}
    
    checklist = await db.onboarding.find_one({"user_id": current_user["id"]}, {"_id": 0})
    return checklist or {"items": [], "completed_items": 0, "total_items": 0}

@api_router.get("/onboarding/all-users")
async def get_all_onboarding(current_user: dict = Depends(get_current_user)):
    """HR Manager: Get all users with onboarding status"""
    if current_user["role"] != "hr_manager":
        raise HTTPException(status_code=403, detail="HR Manager access required")
    
    users = await db.users.find(
        {"role": {"$in": ["intern", "employee"]}}, 
        {"_id": 0, "password": 0}
    ).to_list(500)
    
    for user in users:
        checklist = await db.onboarding.find_one({"user_id": user["id"]}, {"_id": 0})
        user["onboarding"] = checklist
    
    return users

@api_router.get("/onboarding/user/{user_id}")
async def get_user_onboarding(user_id: str, current_user: dict = Depends(get_current_user)):
    """HR Manager: Get specific user's onboarding checklist"""
    if current_user["role"] != "hr_manager":
        raise HTTPException(status_code=403, detail="HR Manager access required")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    checklist = await db.onboarding.find_one({"user_id": user_id}, {"_id": 0})
    return {"user": user, "onboarding": checklist}

@api_router.put("/onboarding/user/{user_id}/item/{item_id}")
async def update_onboarding_item(user_id: str, item_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """HR Manager: Update onboarding checklist item"""
    if current_user["role"] != "hr_manager":
        raise HTTPException(status_code=403, detail="HR Manager access required")
    
    checklist = await db.onboarding.find_one({"user_id": user_id})
    if not checklist:
        raise HTTPException(status_code=404, detail="Checklist not found")
    
    items = checklist.get("items", [])
    completed = 0
    for item in items:
        if item["id"] == item_id:
            item["completed"] = data.get("completed", False)
        if item.get("completed"):
            completed += 1
    
    status = "completed" if completed == len(items) else "in_progress"
    
    await db.onboarding.update_one(
        {"user_id": user_id},
        {"$set": {
            "items": items, 
            "completed_items": completed, 
            "status": status,
            "updated_by": current_user["id"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update user's onboarded status
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_onboarded": status == "completed"}}
    )
    
    return {"message": "Checklist updated", "completed_items": completed, "status": status}

@api_router.put("/onboarding/user/{user_id}/complete-all")
async def complete_all_onboarding(user_id: str, current_user: dict = Depends(get_current_user)):
    """HR Manager: Mark all onboarding items as complete"""
    if current_user["role"] != "hr_manager":
        raise HTTPException(status_code=403, detail="HR Manager access required")
    
    checklist = await db.onboarding.find_one({"user_id": user_id})
    if not checklist:
        raise HTTPException(status_code=404, detail="Checklist not found")
    
    items = checklist.get("items", [])
    for item in items:
        item["completed"] = True
    
    await db.onboarding.update_one(
        {"user_id": user_id},
        {"$set": {
            "items": items, 
            "completed_items": len(items), 
            "status": "completed",
            "updated_by": current_user["id"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await db.users.update_one({"id": user_id}, {"$set": {"is_onboarded": True}})
    
    return {"message": "User fully onboarded"}

# ==================== MENTORSHIP ROUTES ====================

@api_router.get("/mentorship/assignments")
async def get_mentorship_assignments(current_user: dict = Depends(get_current_user)):
    """Get mentorship assignments"""
    if current_user["role"] == "hr_manager":
        # HR sees all assignments
        employees = await db.users.find({"role": "employee"}, {"_id": 0, "password": 0}).to_list(100)
        for emp in employees:
            interns = await db.users.find(
                {"role": "intern", "assigned_employee_id": emp["id"]},
                {"_id": 0, "password": 0}
            ).to_list(20)
            emp["assigned_interns"] = interns
            emp["intern_count"] = len(interns)
        return {"employees": employees}
    
    elif current_user["role"] == "employee":
        # Employee sees their assigned interns
        interns = await db.users.find(
            {"role": "intern", "assigned_employee_id": current_user["id"]},
            {"_id": 0, "password": 0}
        ).to_list(20)
        return {"is_mentor": current_user.get("is_mentor", False), "interns": interns}
    
    elif current_user["role"] == "intern":
        # Intern sees their mentor and HR
        result = {"assigned_employee": None, "hr_mentor": None}
        if current_user.get("assigned_employee_id"):
            emp = await db.users.find_one({"id": current_user["assigned_employee_id"]}, {"_id": 0, "password": 0})
            result["assigned_employee"] = emp
        if current_user.get("assigned_hr_mentor_id"):
            hr = await db.users.find_one({"id": current_user["assigned_hr_mentor_id"]}, {"_id": 0, "password": 0})
            result["hr_mentor"] = hr
        return result
    
    return {}

@api_router.post("/mentorship/assign")
async def assign_mentorship(data: dict, current_user: dict = Depends(get_current_user)):
    """HR Manager: Assign intern to employee"""
    if current_user["role"] != "hr_manager":
        raise HTTPException(status_code=403, detail="HR Manager access required")
    
    intern_id = data.get("intern_id")
    employee_id = data.get("employee_id")
    
    if not intern_id or not employee_id:
        raise HTTPException(status_code=400, detail="Intern ID and Employee ID required")
    
    # Verify intern exists
    intern = await db.users.find_one({"id": intern_id, "role": "intern"})
    if not intern:
        raise HTTPException(status_code=404, detail="Intern not found")
    
    # Verify employee exists
    employee = await db.users.find_one({"id": employee_id, "role": "employee"})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Check employee's intern count
    current_count = await db.users.count_documents({
        "role": "intern",
        "assigned_employee_id": employee_id
    })
    if current_count >= MAX_INTERNS_PER_EMPLOYEE:
        raise HTTPException(status_code=400, detail=f"Employee already has {MAX_INTERNS_PER_EMPLOYEE} interns")
    
    # Update intern assignment
    await db.users.update_one(
        {"id": intern_id},
        {"$set": {
            "assigned_employee_id": employee_id,
            "assigned_employee_name": employee["full_name"],
            "assigned_hr_mentor_id": current_user["id"],
            "assigned_hr_mentor_name": current_user["full_name"]
        }}
    )
    
    # Mark employee as mentor
    await db.users.update_one(
        {"id": employee_id},
        {"$set": {"is_mentor": True}}
    )
    
    return {"message": "Intern assigned to employee successfully"}

@api_router.put("/mentorship/appoint-mentor/{employee_id}")
async def appoint_mentor(employee_id: str, current_user: dict = Depends(get_current_user)):
    """HR Manager: Appoint an employee as mentor"""
    if current_user["role"] != "hr_manager":
        raise HTTPException(status_code=403, detail="HR Manager access required")
    
    employee = await db.users.find_one({"id": employee_id, "role": "employee"})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    await db.users.update_one(
        {"id": employee_id},
        {"$set": {"is_mentor": True}}
    )
    
    return {"message": f"{employee['full_name']} appointed as mentor"}

@api_router.get("/mentorship/unassigned-interns")
async def get_unassigned_interns(current_user: dict = Depends(get_current_user)):
    """HR Manager: Get interns not assigned to any employee"""
    if current_user["role"] != "hr_manager":
        raise HTTPException(status_code=403, detail="HR Manager access required")
    
    interns = await db.users.find(
        {"role": "intern", "$or": [{"assigned_employee_id": None}, {"assigned_employee_id": {"$exists": False}}]},
        {"_id": 0, "password": 0}
    ).to_list(100)
    
    return interns

# ==================== ANNOUNCEMENT ROUTES ====================

@api_router.post("/announcements")
async def create_announcement(data: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "hr_manager":
        raise HTTPException(status_code=403, detail="HR Manager access required")
    
    announcement = Announcement(
        title=data["title"],
        content=data["content"],
        category=data.get("category", "general"),
        author_name=current_user["full_name"],
        author_role=current_user["role"],
        cover_image=data.get("cover_image"),
        tags=data.get("tags", []),
        created_by=current_user["id"]
    )
    await db.announcements.insert_one(announcement.model_dump())
    return {"message": "Announcement created", "id": announcement.id}

@api_router.get("/announcements")
async def get_announcements(current_user: dict = Depends(get_current_user)):
    announcements = await db.announcements.find(
        {"is_active": True}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return announcements

@api_router.get("/announcements/{announcement_id}")
async def get_announcement(announcement_id: str, current_user: dict = Depends(get_current_user)):
    announcement = await db.announcements.find_one({"id": announcement_id}, {"_id": 0})
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    await db.announcements.update_one({"id": announcement_id}, {"$inc": {"views": 1}})
    return announcement

@api_router.delete("/announcements/{announcement_id}")
async def delete_announcement(announcement_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "hr_manager":
        raise HTTPException(status_code=403, detail="HR Manager access required")
    await db.announcements.update_one({"id": announcement_id}, {"$set": {"is_active": False}})
    return {"message": "Announcement deleted"}

# ==================== PERFORMANCE ROUTES ====================

@api_router.post("/performance/goals")
async def create_goal(data: dict, current_user: dict = Depends(get_current_user)):
    goal = PerformanceGoal(
        user_id=data.get("user_id", current_user["id"]),
        title=data["title"],
        description=data["description"],
        target_date=data["target_date"]
    )
    await db.goals.insert_one(goal.model_dump())
    return {"message": "Goal created", "id": goal.id}

@api_router.get("/performance/my-goals")
async def get_my_goals(current_user: dict = Depends(get_current_user)):
    goals = await db.goals.find({"user_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return goals

@api_router.put("/performance/goals/{goal_id}")
async def update_goal(goal_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    await db.goals.update_one({"id": goal_id}, {"$set": updates})
    return {"message": "Goal updated"}

# ==================== TASK ROUTES ====================

@api_router.post("/tasks")
async def create_task(data: dict, current_user: dict = Depends(get_current_user)):
    task = TaskAssignment(
        user_id=data["user_id"],
        title=data["title"],
        description=data["description"],
        priority=data.get("priority", "medium"),
        due_date=data["due_date"],
        assigned_by=current_user["id"]
    )
    await db.tasks.insert_one(task.model_dump())
    return {"message": "Task assigned", "id": task.id}

@api_router.get("/tasks/my-tasks")
async def get_my_tasks(current_user: dict = Depends(get_current_user)):
    tasks = await db.tasks.find({"user_id": current_user["id"]}, {"_id": 0}).sort("due_date", 1).to_list(100)
    return tasks

@api_router.put("/tasks/{task_id}")
async def update_task(task_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    await db.tasks.update_one({"id": task_id}, {"$set": updates})
    return {"message": "Task updated"}

# ==================== PAYROLL ROUTES ====================

@api_router.get("/payroll/my-records")
async def get_my_payroll(current_user: dict = Depends(get_current_user)):
    records = await db.payroll.find({"user_id": current_user["id"]}, {"_id": 0}).sort([("year", -1), ("month", -1)]).to_list(24)
    return records

@api_router.get("/payroll/all")
async def get_all_payroll(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "hr_manager":
        raise HTTPException(status_code=403, detail="HR Manager access required")
    records = await db.payroll.find({}, {"_id": 0}).sort([("year", -1), ("month", -1)]).to_list(500)
    return records

@api_router.post("/payroll")
async def create_payroll(data: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "hr_manager":
        raise HTTPException(status_code=403, detail="HR Manager access required")
    
    user = await db.users.find_one({"id": data["user_id"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    base_amount = float(data.get("base_amount", 0))
    bonus = float(data.get("bonus", 0))
    deductions = float(data.get("deductions", 0))
    net_amount = base_amount + bonus - deductions
    
    record = PayrollRecord(
        user_id=data["user_id"],
        user_name=user["full_name"],
        user_role=user["role"],
        month=data["month"],
        year=data["year"],
        base_amount=base_amount,
        bonus=bonus,
        deductions=deductions,
        net_amount=net_amount,
        notes=data.get("notes"),
        created_by=current_user["id"]
    )
    await db.payroll.insert_one(record.model_dump())
    return {"message": "Payroll record created", "id": record.id}

@api_router.put("/payroll/{record_id}")
async def update_payroll(record_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "hr_manager":
        raise HTTPException(status_code=403, detail="HR Manager access required")
    
    update_data = {}
    if "base_amount" in data:
        update_data["base_amount"] = float(data["base_amount"])
    if "bonus" in data:
        update_data["bonus"] = float(data["bonus"])
    if "deductions" in data:
        update_data["deductions"] = float(data["deductions"])
    if "notes" in data:
        update_data["notes"] = data["notes"]
    
    record = await db.payroll.find_one({"id": record_id}, {"_id": 0})
    if record:
        base = update_data.get("base_amount", record.get("base_amount", 0))
        bonus = update_data.get("bonus", record.get("bonus", 0))
        deductions = update_data.get("deductions", record.get("deductions", 0))
        update_data["net_amount"] = base + bonus - deductions
    
    await db.payroll.update_one({"id": record_id}, {"$set": update_data})
    return {"message": "Payroll record updated"}

@api_router.put("/payroll/{record_id}/pay")
async def mark_paid(record_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "hr_manager":
        raise HTTPException(status_code=403, detail="HR Manager access required")
    
    await db.payroll.update_one(
        {"id": record_id},
        {"$set": {"status": "paid", "payment_date": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Payment marked as paid"}

# ==================== USER MANAGEMENT ====================

@api_router.get("/users")
async def get_all_users(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "hr_manager":
        raise HTTPException(status_code=403, detail="HR Manager access required")
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return users

@api_router.get("/users/interns")
async def get_interns(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "intern":
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = {"role": "intern"}
    if current_user["role"] == "employee":
        query["assigned_employee_id"] = current_user["id"]
    
    interns = await db.users.find(query, {"_id": 0, "password": 0}).to_list(100)
    return interns

@api_router.get("/users/employees")
async def get_employees(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "hr_manager":
        raise HTTPException(status_code=403, detail="HR Manager access required")
    employees = await db.users.find({"role": "employee"}, {"_id": 0, "password": 0}).to_list(100)
    return employees

@api_router.get("/users/{user_id}")
async def get_user(user_id: str, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ==================== TEAM HIERARCHY ====================

@api_router.get("/team/my-team")
async def get_my_team(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "intern":
        result = {"assigned_employee": None, "hr_mentor": None}
        if current_user.get("assigned_employee_id"):
            emp = await db.users.find_one({"id": current_user["assigned_employee_id"]}, {"_id": 0, "password": 0})
            result["assigned_employee"] = emp
        if current_user.get("assigned_hr_mentor_id"):
            hr = await db.users.find_one({"id": current_user["assigned_hr_mentor_id"]}, {"_id": 0, "password": 0})
            result["hr_mentor"] = hr
        return result
    
    elif current_user["role"] == "employee":
        interns = await db.users.find(
            {"role": "intern", "assigned_employee_id": current_user["id"]}, 
            {"_id": 0, "password": 0}
        ).to_list(20)
        return {"is_mentor": current_user.get("is_mentor", False), "interns": interns, "intern_count": len(interns)}
    
    elif current_user["role"] == "hr_manager":
        mentees = await db.users.find(
            {"assigned_hr_mentor_id": current_user["id"]}, 
            {"_id": 0, "password": 0}
        ).to_list(100)
        
        employees = await db.users.find({"role": "employee"}, {"_id": 0, "password": 0}).to_list(100)
        for emp in employees:
            emp["intern_count"] = await db.users.count_documents({
                "role": "intern",
                "assigned_employee_id": emp["id"]
            })
        
        return {
            "mentees": mentees,
            "mentee_count": len(mentees),
            "employees": employees,
            "employee_count": len(employees)
        }
    
    return {}

# ==================== DASHBOARD STATS ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    
    total_attendance = await db.attendance.count_documents({"user_id": user_id, "date": {"$gte": thirty_days_ago}})
    present_days = await db.attendance.count_documents({"user_id": user_id, "status": "present", "date": {"$gte": thirty_days_ago}})
    pending_tasks = await db.tasks.count_documents({"user_id": user_id, "status": {"$ne": "completed"}})
    approved_leaves = await db.leaves.count_documents({"user_id": user_id, "status": "approved"})
    pending_leaves = await db.leaves.count_documents({"user_id": user_id, "status": "pending"})
    total_goals = await db.goals.count_documents({"user_id": user_id})
    completed_goals = await db.goals.count_documents({"user_id": user_id, "status": "completed"})
    today_attendance = await db.attendance.find_one({"user_id": user_id, "date": today}, {"_id": 0})
    announcements_count = await db.announcements.count_documents({"is_active": True})
    
    return {
        "attendance": {
            "total": total_attendance,
            "present": present_days,
            "attendance_rate": round((present_days / total_attendance * 100) if total_attendance > 0 else 0, 1)
        },
        "tasks": {"pending": pending_tasks},
        "leaves": {"approved": approved_leaves, "pending": pending_leaves},
        "goals": {
            "total": total_goals,
            "completed": completed_goals,
            "completion_rate": round((completed_goals / total_goals * 100) if total_goals > 0 else 0, 1)
        },
        "today_attendance": today_attendance,
        "announcements_count": announcements_count
    }

@api_router.get("/dashboard/hr-stats")
async def get_hr_stats(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "hr_manager":
        raise HTTPException(status_code=403, detail="HR Manager access required")
    
    total_employees = await db.users.count_documents({"role": "employee"})
    total_interns = await db.users.count_documents({"role": "intern"})
    total_hr = await db.users.count_documents({"role": "hr_manager"})
    pending_leaves = await db.leaves.count_documents({"status": "pending"})
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    present_today = await db.attendance.count_documents({"date": today, "check_in": {"$ne": None}})
    pending_payroll = await db.payroll.count_documents({"status": "pending"})
    pending_onboarding = await db.users.count_documents({"role": {"$in": ["intern", "employee"]}, "is_onboarded": {"$ne": True}})
    
    return {
        "total_employees": total_employees,
        "total_interns": total_interns,
        "total_hr": total_hr,
        "pending_leaves": pending_leaves,
        "present_today": present_today,
        "total_staff": total_employees + total_interns + total_hr,
        "pending_payroll": pending_payroll,
        "pending_onboarding": pending_onboarding
    }

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "HR Nexus API v1.0", "status": "running"}

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

