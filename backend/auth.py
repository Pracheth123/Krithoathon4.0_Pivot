import sqlite3
import jwt
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
import bcrypt

# Configuration
SECRET_KEY = "HACKATHON_SUPER_SECRET_KEY"  # In production, use env variables
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours
DB_FILE = "auth.db"

# Password Hashing Utilities
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

auth_router = APIRouter()

# --- Database Initialization ---
def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS roles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)
    conn.commit()
    conn.close()

init_db()

# --- Pydantic Models ---
class UserRegister(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class RoleCreate(BaseModel):
    title: str
    description: str

# --- JWT Functions ---
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# --- FastAPI Dependency to Protect Routes ---
async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return email
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_user_id_from_email(email: str) -> int:
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=401, detail="User not found")
    return row[0]

# --- Auth Endpoints ---
@auth_router.post("/register")
def register(user: UserRegister):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Check if user exists
    cursor.execute("SELECT id FROM users WHERE email = ?", (user.email,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Email already registered")
        
    # Hash password and insert
    hashed_password = hash_password(user.password)
    cursor.execute("INSERT INTO users (email, password_hash) VALUES (?, ?)", (user.email, hashed_password))
    conn.commit()
    conn.close()
    
    return {"message": "User registered successfully"}

@auth_router.post("/login")
def login(user: UserLogin):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    cursor.execute("SELECT password_hash FROM users WHERE email = ?", (user.email,))
    row = cursor.fetchone()
    conn.close()
    
    if not row or not verify_password(user.password, row[0]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

# --- Role Endpoints (Multi-Tenant ATS) ---
@auth_router.post("/roles")
def create_role(role: RoleCreate, current_user_email: str = Depends(get_current_user)):
    user_id = get_user_id_from_email(current_user_email)
    
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO roles (user_id, title, description) VALUES (?, ?, ?)", 
                   (user_id, role.title, role.description))
    role_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {"id": role_id, "title": role.title, "message": "Role created successfully"}

@auth_router.get("/roles")
def get_roles(current_user_email: str = Depends(get_current_user)):
    user_id = get_user_id_from_email(current_user_email)
    
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT id, title, description FROM roles WHERE user_id = ? ORDER BY id DESC", (user_id,))
    rows = cursor.fetchall()
    conn.close()
    
    roles = [{"id": r[0], "title": r[1], "description": r[2]} for r in rows]
    return {"roles": roles}
