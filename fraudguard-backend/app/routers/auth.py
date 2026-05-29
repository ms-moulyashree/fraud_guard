"""
app/routers/auth.py
"""

from datetime import datetime, timedelta, timezone
import uuid
import bcrypt

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
import asyncpg

from app.config import get_settings
from app.database import get_db
from app.models.schemas import RegisterRequest, LoginResponse, UserOut, MicrosoftLoginRequest

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def _hash(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify(plain: str, hashed: str) -> bool:
    try:
        plain_bytes  = plain.encode("utf-8")
        hashed_bytes = hashed.encode("utf-8")
        result = bcrypt.checkpw(plain_bytes, hashed_bytes)
        print(f"[AUTH] verify plain={repr(plain)} hash={hashed[:20]} result={result}", flush=True)
        return result
    except Exception as e:
        print(f"[AUTH] verify ERROR: {e}", flush=True)
        return False


def _make_token(user_id: str, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    return jwt.encode(
        {"sub": user_id, "email": email, "exp": expire},
        settings.secret_key,
        algorithm=settings.algorithm,
    )


def _decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: asyncpg.Connection = Depends(get_db),
) -> UserOut:
    payload = _decode_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    row = await db.fetchrow(
        "SELECT id, email, display_name, avatar, job_title, tenant_id FROM users WHERE id = $1",
        uuid.UUID(user_id),
    )
    if not row:
        raise HTTPException(status_code=401, detail="User not found")

    return UserOut(
        id=str(row["id"]),
        email=row["email"],
        display_name=row["display_name"],
        avatar=row["avatar"],
        job_title=row["job_title"] or "",
        tenant_id=row["tenant_id"] or "",
    )


@router.post("/register", response_model=LoginResponse, status_code=201)
async def register(body: RegisterRequest, db: asyncpg.Connection = Depends(get_db)):
    existing = await db.fetchrow("SELECT id FROM users WHERE email = $1", body.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user_id = uuid.uuid4()
    avatar  = "".join(w[0].upper() for w in body.display_name.split()[:2])
    pw_hash = _hash(body.password)

    await db.execute(
        """INSERT INTO users (id, email, display_name, avatar, job_title, tenant_id, password_hash)
           VALUES ($1,$2,$3,$4,$5,$6,$7)""",
        user_id, body.email, body.display_name, avatar,
        body.job_title, body.tenant_id, pw_hash,
    )

    user = UserOut(
        id=str(user_id),
        email=body.email,
        display_name=body.display_name,
        avatar=avatar,
        job_title=body.job_title,
        tenant_id=body.tenant_id,
    )
    return LoginResponse(
        access_token=_make_token(str(user_id), body.email),
        token_type="bearer",
        user=user,
    )


@router.post("/login", response_model=LoginResponse)
async def login(form: OAuth2PasswordRequestForm = Depends(), db: asyncpg.Connection = Depends(get_db)):
    print(f"[AUTH] login attempt: username={form.username}", flush=True)

    row = await db.fetchrow(
        "SELECT id, email, display_name, avatar, job_title, tenant_id, password_hash FROM users WHERE email = $1",
        form.username,
    )

    if not row:
        print(f"[AUTH] user not found: {form.username}", flush=True)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not row["password_hash"]:
        print(f"[AUTH] no password hash for: {form.username}", flush=True)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not _verify(form.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user = UserOut(
        id=str(row["id"]),
        email=row["email"],
        display_name=row["display_name"],
        avatar=row["avatar"],
        job_title=row["job_title"] or "",
        tenant_id=row["tenant_id"] or "",
    )
    return LoginResponse(
        access_token=_make_token(str(row["id"]), row["email"]),
        token_type="bearer",
        user=user,
    )


@router.post("/microsoft", response_model=LoginResponse)
async def microsoft_login(
    body: MicrosoftLoginRequest,
    db: asyncpg.Connection = Depends(get_db),
):
    # Verify the MS token and get real user info from Graph API
    import httpx
    async with httpx.AsyncClient() as client:
        graph_res = await client.get(
            "https://graph.microsoft.com/v1.0/me",
            headers={"Authorization": f"Bearer {body.access_token}"},
        )
        if graph_res.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid Microsoft token")
        graph_user = graph_res.json()

    email = graph_user.get("userPrincipalName") or graph_user.get("mail") or "msuser@example.com"
    display_name = graph_user.get("displayName") or "Microsoft User"
    job_title = graph_user.get("jobTitle") or "Auditor"
    tenant_id = graph_user.get("id") or "microsoft"
    avatar = "".join(w[0].upper() for w in display_name.split()[:2])

    row = await db.fetchrow("SELECT id, email, display_name, avatar, job_title, tenant_id FROM users WHERE email = $1", email)

    if not row:
        user_id = uuid.uuid4()
        await db.execute(
            """INSERT INTO users (id, email, display_name, avatar, job_title, tenant_id, password_hash)
               VALUES ($1,$2,$3,$4,$5,$6,$7)""",
            user_id, email, display_name, avatar, job_title, tenant_id, None,
        )
        row = await db.fetchrow("SELECT id, email, display_name, avatar, job_title, tenant_id FROM users WHERE id = $1", user_id)

    user = UserOut(
        id=str(row["id"]),
        email=row["email"],
        display_name=row["display_name"],
        avatar=row["avatar"],
        job_title=row["job_title"] or "",
        tenant_id=row["tenant_id"] or "",
    )
    return LoginResponse(
        access_token=_make_token(str(row["id"]), row["email"]),
        token_type="bearer",
        user=user,
    )


@router.get("/me", response_model=UserOut)
async def me(current_user: UserOut = Depends(get_current_user)):
    return current_user