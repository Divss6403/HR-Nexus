from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'default_secret')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', '24'))

# Create the main app
app = FastAPI(title="HR Nexus API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

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
    role: str  # intern, employee, hr_manager
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

class UserResponse(UserBase):
    id: str
    created_at: str
    intern_fields: Optional[dict] = None
    employee_fields: Optional[dict] = None
    hr_manager_fields: Optional[dict] = None

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
    status: str = "present"  # present, absent, leave
    notes: Optional[str] = None

class LeaveRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    start_date: str
    end_date: str
    reason: str
    leave_type: str
    status: str = "pending"  # pending, approved, rejected
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Announcement(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    category: str
    created_by: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    is_active: bool = True

class PerformanceGoal(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: str
    target_date: str
    progress: int = 0
    status: str = "in_progress"  # in_progress, completed, overdue
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
    status: str = "pending"  # pending, in_progress, completed
    assigned_by: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PayrollRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    month: str
    year: str
    amount: float
    status: str = "pending"  # pending, paid
    payment_date: Optional[str] = None
    notes: Optional[str] = None

class OnboardingChecklist(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    items: List[dict]
    completed_items: int = 0
    total_items: int = 0
    status: str = "in_progress"

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
    
    # Generate employee ID for employees
    if user_data.role == "employee" and user_data.employee_fields:
        if not user_data.employee_fields.employee_id:
            count = await db.users.count_documents({"role": "employee"})
            user_dict["employee_fields"]["employee_id"] = f"EMP{str(count + 1001).zfill(4)}"
    
    await db.users.insert_one(user_dict)
    
    # Create default onboarding checklist
    default_items = [
        {"id": "1", "title": "Submit ID Proof", "completed": False},
        {"id": "2", "title": "Submit Resume/CV", "completed": False},
        {"id": "3", "title": "Complete Profile", "completed": False},
        {"id": "4", "title": "Read Company Policies", "completed": False},
        {"id": "5", "title": "Setup Bank Details", "completed": False}
    ]
    onboarding = OnboardingChecklist(
        user_id=user_id,
        items=default_items,
        total_items=len(default_items)
    )
    await db.onboarding.insert_one(onboarding.model_dump())
    
    token = create_token(user_id, user_data.email, user_data.role)
    
    # Get the created user from database without _id and password
    created_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    
    return TokenResponse(access_token=token, user=created_user)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: LoginRequest):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["email"], user["role"])
    user_response = {k: v for k, v in user.items() if k != "password"}
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

@api_router.put("/auth/profile")
async def update_profile(updates: dict, current_user: dict = Depends(get_current_user)):
    # Remove sensitive fields from updates
    updates.pop("password", None)
    updates.pop("id", None)
    updates.pop("email", None)
    
    await db.users.update_one({"id": current_user["id"]}, {"$set": updates})
    updated_user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "password": 0})
    return updated_user

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
    records = await db.attendance.find(
        {"user_id": current_user["id"]}, {"_id": 0}
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
    records = await db.attendance.find({}, {"_id": 0}).sort("date", -1).to_list(1000)
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
    leaves = await db.leaves.find({"status": "pending"}, {"_id": 0}).to_list(100)
    # Enrich with user data
    for leave in leaves:
        user = await db.users.find_one({"id": leave["user_id"]}, {"_id": 0, "password": 0})
        leave["user"] = user
    return leaves

@api_router.put("/leave/{leave_id}/approve")
async def approve_leave(leave_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "hr_manager":
        raise HTTPException(status_code=403, detail="HR Manager access required")
    result = await db.leaves.update_one({"id": leave_id}, {"$set": {"status": "approved"}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Leave request not found")
    return {"message": "Leave approved"}

@api_router.put("/leave/{leave_id}/reject")
async def reject_leave(leave_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "hr_manager":
        raise HTTPException(status_code=403, detail="HR Manager access required")
    result = await db.leaves.update_one({"id": leave_id}, {"$set": {"status": "rejected"}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Leave request not found")
    return {"message": "Leave rejected"}

# ==================== ANNOUNCEMENT ROUTES ====================

@api_router.post("/announcements")
async def create_announcement(data: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "hr_manager":
        raise HTTPException(status_code=403, detail="HR Manager access required")
    
    announcement = Announcement(
        title=data["title"],
        content=data["content"],
        category=data.get("category", "general"),
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

@api_router.get("/performance/all-goals")
async def get_all_goals(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "hr_manager":
        raise HTTPException(status_code=403, detail="HR Manager access required")
    goals = await db.goals.find({}, {"_id": 0}).to_list(500)
    return goals

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

@api_router.post("/payroll")
async def create_payroll(data: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "hr_manager":
        raise HTTPException(status_code=403, detail="HR Manager access required")
    
    record = PayrollRecord(
        user_id=data["user_id"],
        month=data["month"],
        year=data["year"],
        amount=data["amount"],
        notes=data.get("notes")
    )
    await db.payroll.insert_one(record.model_dump())
    return {"message": "Payroll record created", "id": record.id}

@api_router.put("/payroll/{record_id}/pay")
async def mark_paid(record_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "hr_manager":
        raise HTTPException(status_code=403, detail="HR Manager access required")
    
    await db.payroll.update_one(
        {"id": record_id},
        {"$set": {"status": "paid", "payment_date": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Payment marked as paid"}

# ==================== ONBOARDING ROUTES ====================

@api_router.get("/onboarding/checklist")
async def get_onboarding(current_user: dict = Depends(get_current_user)):
    checklist = await db.onboarding.find_one({"user_id": current_user["id"]}, {"_id": 0})
    return checklist or {"items": [], "completed_items": 0, "total_items": 0}

@api_router.put("/onboarding/checklist/{item_id}")
async def update_checklist_item(item_id: str, current_user: dict = Depends(get_current_user)):
    checklist = await db.onboarding.find_one({"user_id": current_user["id"]})
    if not checklist:
        raise HTTPException(status_code=404, detail="Checklist not found")
    
    items = checklist.get("items", [])
    completed = 0
    for item in items:
        if item["id"] == item_id:
            item["completed"] = not item.get("completed", False)
        if item.get("completed"):
            completed += 1
    
    status = "completed" if completed == len(items) else "in_progress"
    await db.onboarding.update_one(
        {"user_id": current_user["id"]},
        {"$set": {"items": items, "completed_items": completed, "status": status}}
    )
    return {"message": "Checklist updated"}

# ==================== USER MANAGEMENT (HR) ====================

@api_router.get("/users")
async def get_all_users(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "hr_manager":
        raise HTTPException(status_code=403, detail="HR Manager access required")
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return users

@api_router.get("/users/{user_id}")
async def get_user(user_id: str, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@api_router.put("/users/{user_id}/status")
async def update_user_status(user_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "hr_manager":
        raise HTTPException(status_code=403, detail="HR Manager access required")
    await db.users.update_one({"id": user_id}, {"$set": {"application_status": data.get("status")}})
    return {"message": "Status updated"}

# ==================== DASHBOARD STATS ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Get attendance stats
    total_attendance = await db.attendance.count_documents({"user_id": user_id})
    present_days = await db.attendance.count_documents({"user_id": user_id, "status": "present"})
    
    # Get pending tasks
    pending_tasks = await db.tasks.count_documents({"user_id": user_id, "status": {"$ne": "completed"}})
    
    # Get leaves
    approved_leaves = await db.leaves.count_documents({"user_id": user_id, "status": "approved"})
    pending_leaves = await db.leaves.count_documents({"user_id": user_id, "status": "pending"})
    
    # Get goals
    total_goals = await db.goals.count_documents({"user_id": user_id})
    completed_goals = await db.goals.count_documents({"user_id": user_id, "status": "completed"})
    
    # Get today's attendance
    today_attendance = await db.attendance.find_one({"user_id": user_id, "date": today}, {"_id": 0})
    
    # Get announcements count
    announcements_count = await db.announcements.count_documents({"is_active": True})
    
    return {
        "attendance": {
            "total": total_attendance,
            "present": present_days,
            "attendance_rate": round((present_days / total_attendance * 100) if total_attendance > 0 else 0, 1)
        },
        "tasks": {
            "pending": pending_tasks
        },
        "leaves": {
            "approved": approved_leaves,
            "pending": pending_leaves
        },
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
    
    return {
        "total_employees": total_employees,
        "total_interns": total_interns,
        "total_hr": total_hr,
        "pending_leaves": pending_leaves,
        "present_today": present_today,
        "total_staff": total_employees + total_interns + total_hr
    }

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "HR Nexus API v1.0", "status": "running"}

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
