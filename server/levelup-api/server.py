from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlparse
import base64
import hashlib
import hmac
import html
import json
import os
import secrets
import smtplib
import sqlite3
import time
import uuid
import urllib.parse
import urllib.request
from email.message import EmailMessage


BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def load_env_file(path):
    if not os.path.isfile(path):
        return
    try:
        with open(path, "r", encoding="utf-8") as handle:
            for raw in handle:
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = value
    except Exception as exc:
        print(f"Could not load env file {path}: {exc}")


load_env_file(os.path.abspath(os.path.join(BASE_DIR, "..", "..", ".env")))
load_env_file(os.path.join(BASE_DIR, ".env"))

HOST = os.getenv("LEVELUP_API_HOST", "127.0.0.1")
PORT = int(os.getenv("LEVELUP_API_PORT", "8080"))
DB_PATH = os.getenv("LEVELUP_DB_PATH", os.path.join(BASE_DIR, "levelup.sqlite3"))
UPLOAD_DIR = os.getenv("LEVELUP_UPLOAD_DIR", os.path.join(BASE_DIR, "uploads"))
SEED_PATH = os.getenv("LEVELUP_SEED_PATH", os.path.join(BASE_DIR, "seed_data.json"))
JWT_SECRET = os.getenv("LEVELUP_JWT_SECRET", "dev-secret-change-me")
CORS_ORIGIN = os.getenv("LEVELUP_CORS_ORIGIN", "*")
DEFAULT_ADMINS = {
    "sa3doon": "sa3doon123",
    "fares": "fares123",
    "mahmoud": "mahmoud123",
}
DEFAULT_GOOGLE_CLIENT_ID = "617436995759-t2tp11j582kfupng4s4qcvbivoe0jj1p.apps.googleusercontent.com"


def get_admin_email():
    return (
        os.getenv("LEVELUP_ADMIN_EMAIL")
        or os.getenv("ADMIN_EMAIL")
        or os.getenv("SMTP_TO")
        or os.getenv("SMTP_USER")
        or ""
    ).strip()


def get_resend_from():
    return (os.getenv("RESEND_FROM") or os.getenv("EMAIL_FROM") or "LevelUP <onboarding@resend.dev>").strip()


def has_resend_config():
    return bool(os.getenv("RESEND_API_KEY") and get_admin_email())


def has_smtp_config():
    return bool(os.getenv("SMTP_HOST") and os.getenv("SMTP_USER") and os.getenv("SMTP_PASS") and get_admin_email())


def mask_email(value=""):
    raw = str(value or "").strip()
    if not raw:
        return ""
    if "<" in raw and ">" in raw:
        raw = raw.split("<", 1)[1].split(">", 1)[0].strip()
    if "@" not in raw:
        return raw[:2] + "****" + raw[-2:] if len(raw) > 4 else "****"
    name, domain = raw.split("@", 1)
    return f"{name[:2]}***@{domain}"


def smtp_status():
    port = int(os.getenv("SMTP_PORT", "465"))
    from_addr = os.getenv("SMTP_FROM") or (f"LevelUp <{os.getenv('SMTP_USER')}>" if os.getenv("SMTP_USER") else "")
    return {
        "configured": has_resend_config() or has_smtp_config(),
        "provider": "resend" if has_resend_config() else "smtp",
        "resend": {
            "configured": has_resend_config(),
            "hasApiKey": bool(os.getenv("RESEND_API_KEY")),
            "apiKeyLength": len(os.getenv("RESEND_API_KEY", "")),
            "from": mask_email(get_resend_from()),
        },
        "smtp": {
            "configured": has_smtp_config(),
            "host": os.getenv("SMTP_HOST", ""),
            "port": port,
            "secure": os.getenv("SMTP_SECURE", "").lower() == "true" or port == 465,
            "hasUser": bool(os.getenv("SMTP_USER")),
            "user": mask_email(os.getenv("SMTP_USER", "")),
            "hasPass": bool(os.getenv("SMTP_PASS")),
            "passLength": len(os.getenv("SMTP_PASS", "")),
            "hasFrom": bool(os.getenv("SMTP_FROM")),
            "from": mask_email(from_addr),
        },
        "host": os.getenv("SMTP_HOST", ""),
        "port": port,
        "secure": os.getenv("SMTP_SECURE", "").lower() == "true" or port == 465,
        "hasUser": bool(os.getenv("SMTP_USER")),
        "user": mask_email(os.getenv("SMTP_USER", "")),
        "hasPass": bool(os.getenv("SMTP_PASS")),
        "passLength": len(os.getenv("SMTP_PASS", "")),
        "hasAdminEmail": bool(get_admin_email()),
        "adminEmail": mask_email(get_admin_email()),
        "hasFrom": bool(os.getenv("SMTP_FROM")),
        "from": mask_email(from_addr),
    }


def make_guest_instructor_user_id(email):
    digest = hashlib.sha256(str(email or "").lower().encode("utf-8")).hexdigest()
    return f"guest_{digest[:20]}"


def build_instructor_email(item):
    rows = [
        ("Name", item.get("name")),
        ("Email", item.get("email")),
        ("Phone", item.get("phone")),
        ("Category", item.get("category")),
        ("Courses Taken", item.get("coursesTaken")),
        ("Experience Years", item.get("experienceYears")),
        ("Notes", item.get("notes")),
        ("Request ID", item.get("id")),
        ("Status", item.get("status")),
    ]
    filled = [(label, str(value).strip()) for label, value in rows if value is not None and str(value).strip()]
    text = "\n".join(f"{label}: {value}" for label, value in filled)
    html_rows = "".join(
        "<tr>"
        f"<th align='left' style='padding:8px;border-bottom:1px solid #e5e7eb;'>{html.escape(label)}</th>"
        f"<td style='padding:8px;border-bottom:1px solid #e5e7eb;'>{html.escape(value)}</td>"
        "</tr>"
        for label, value in filled
    )
    html_body = (
        "<div style='font-family:Arial,sans-serif;color:#111827;'>"
        "<h2>New instructor application</h2>"
        "<table cellspacing='0' cellpadding='0' style='border-collapse:collapse;width:100%;max-width:720px;'>"
        f"{html_rows}</table></div>"
    )
    return text, html_body


def send_instructor_request_email(item):
    if has_resend_config():
        return send_instructor_request_email_with_resend(item)

    if not has_smtp_config():
        print("Instructor request email skipped: Resend/SMTP is not configured.")
        return None

    text, html_body = build_instructor_email(item)
    msg = EmailMessage()
    msg["From"] = os.getenv("SMTP_FROM") or f"LevelUp <{os.getenv('SMTP_USER')}>"
    msg["To"] = get_admin_email()
    if item.get("email"):
        msg["Reply-To"] = item.get("email")
    msg["Subject"] = f"New instructor application: {item.get('name') or item.get('email') or 'Candidate'}"
    msg.set_content(text)
    msg.add_alternative(html_body, subtype="html")

    host = os.getenv("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT", "465"))
    secure = os.getenv("SMTP_SECURE", "").lower() == "true" or port == 465
    if secure:
        with smtplib.SMTP_SSL(host, port, timeout=15) as smtp:
            smtp.login(os.getenv("SMTP_USER"), os.getenv("SMTP_PASS"))
            return smtp.send_message(msg)
    with smtplib.SMTP(host, port, timeout=15) as smtp:
        smtp.starttls()
        smtp.login(os.getenv("SMTP_USER"), os.getenv("SMTP_PASS"))
        return smtp.send_message(msg)


def send_instructor_request_email_with_resend(item):
    text, html_body = build_instructor_email(item)
    payload = {
        "from": get_resend_from(),
        "to": [get_admin_email()],
        "reply_to": item.get("email") or None,
        "subject": f"New instructor application: {item.get('name') or item.get('email') or 'Candidate'}",
        "text": text,
        "html": html_body,
    }
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {os.getenv('RESEND_API_KEY')}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            return json.loads(response.read().decode("utf-8") or "{}")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise Exception(f"Resend email failed: {exc.code} {body}") from exc


def notify_instructor_request(item):
    try:
        return send_instructor_request_email(item)
    except Exception as exc:
        print(f"Instructor request email failed: {exc}")
        return None


def now_iso():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def make_id(prefix=""):
    raw = uuid.uuid4().hex
    return f"{prefix}{raw}" if prefix else raw


def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def row_to_dict(row):
    if row is None:
        return None
    data = dict(row)
    for key in ("features", "sections", "attachments", "metadata"):
        if key in data and isinstance(data[key], str):
            try:
                data[key] = json.loads(data[key]) if data[key] else [] if key != "metadata" else {}
            except json.JSONDecodeError:
                data[key] = [] if key != "metadata" else {}
    return data


def hash_password(password, salt=None):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120000)
    return f"{salt}${digest.hex()}"


def verify_password(password, stored):
    if not stored or "$" not in stored:
        return False
    salt, expected = stored.split("$", 1)
    candidate = hash_password(password, salt).split("$", 1)[1]
    return hmac.compare_digest(candidate, expected)


def b64url_encode(raw):
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def b64url_decode(value):
    padded = value + "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(padded.encode("ascii"))


def sign_token(user):
    header = b64url_encode(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    payload = {
        "sub": user["id"],
        "email": user["email"],
        "role": user["role"],
        "exp": int(time.time()) + 60 * 60 * 24 * 14,
    }
    body = b64url_encode(json.dumps(payload, separators=(",", ":")).encode())
    sig = hmac.new(JWT_SECRET.encode("utf-8"), f"{header}.{body}".encode("ascii"), hashlib.sha256).digest()
    return f"{header}.{body}.{b64url_encode(sig)}"


def verify_token(token):
    try:
        header, body, sig = token.split(".", 2)
        expected = hmac.new(JWT_SECRET.encode("utf-8"), f"{header}.{body}".encode("ascii"), hashlib.sha256).digest()
        if not hmac.compare_digest(b64url_encode(expected), sig):
            return None
        payload = json.loads(b64url_decode(body))
        if payload.get("exp", 0) < int(time.time()):
            return None
        with db() as conn:
            return row_to_dict(conn.execute("select * from users where id = ?", (payload.get("sub"),)).fetchone())
    except Exception:
        return None


def verify_google_id_token(id_token, client_id):
    params = urllib.parse.urlencode({"id_token": id_token})
    url = f"https://oauth2.googleapis.com/tokeninfo?{params}"
    try:
        with urllib.request.urlopen(url, timeout=8) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        raise Exception("Could not verify Google sign-in. Check your network and Google client id.") from exc

    aud = (payload.get("aud") or "").strip()
    allowed = {
        (client_id or "").strip(),
        (os.getenv("LEVELUP_GOOGLE_CLIENT_ID") or "").strip(),
        DEFAULT_GOOGLE_CLIENT_ID,
    }
    allowed = {item for item in allowed if item}
    if aud not in allowed:
        raise Exception("Google token was issued for a different client id.")

    exp = int(payload.get("exp") or "0")
    if exp and exp < int(time.time()):
        raise Exception("Google sign-in token expired. Try again.")
    return payload


def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    with db() as conn:
        conn.executescript(
            """
            create table if not exists users (
              id text primary key,
              email text unique not null,
              password_hash text not null,
              name text default '',
              role text default 'student',
              status text default 'active',
              approved integer default 0,
              photoUrl text default '',
              emailOtpVerified integer default 1,
              createdAt text not null,
              updatedAt text not null
            );
            create table if not exists courses (
              id text primary key,
              category text default '',
              title text not null,
              level text default '',
              features text default '[]',
              mentorName text default '',
              mentorSubtitle text default '',
              mentorImagePath text default '',
              coverImagePath text default '',
              mentorId text default '',
              price text default '',
              oldPrice text default '',
              rating text default '',
              students text default '',
              classes integer default 0,
              hours integer default 0,
              bookmarked integer default 0,
              sections text default '[]',
              featuredRank integer,
              createdAt text not null,
              updatedAt text not null
            );
            create table if not exists mentors (
              id text primary key,
              name text not null,
              category text default 'General',
              subtitle text default '',
              courses text default '0',
              students text default '0',
              ratings text default '0',
              imagePath text default '',
              bio text default '',
              featuredRank integer,
              createdAt text not null,
              updatedAt text not null
            );
            create table if not exists transactions (
              id text primary key,
              userId text default '',
              userName text default '',
              userEmail text default '',
              courseId text default '',
              mentorId text default '',
              mentorName text default '',
              courseTitle text default '',
              courseCategory text default '',
              priceLabel text default '',
              status text default 'waiting',
              receiptCode text default '',
              barcodeLeft text default '',
              barcodeRight text default '',
              courseCoverImagePath text default '',
              coverImage text default '',
              paymentMethod text default '',
              senderNumber text default '',
              attachmentPath text default '',
              attachmentName text default '',
              createdAt text not null,
              updatedAt text not null
            );
            create table if not exists instructor_requests (
              id text primary key,
              userId text unique not null,
              name text default '',
              email text default '',
              phone text default '',
              category text default 'General',
              coursesTaken text default '',
              experienceYears text default '',
              notes text default '',
              cvUrl text default '',
              idUrl text default '',
              status text default 'pending',
              requestedAt text not null,
              updatedAt text not null,
              resolvedAt text
            );
            create table if not exists notifications (
              id text primary key,
              userId text default '',
              title text not null,
              message text default '',
              icon text default '',
              isRead integer default 0,
              createdAt text not null,
              updatedAt text not null
            );
            create table if not exists chats (
              id text primary key,
              conversationKey text unique not null,
              userId text not null,
              mentorId text not null,
              mentorName text default 'Mentor',
              mentorRole text default 'Mentor',
              mentorImagePath text default '',
              userName text default '',
              userImagePath text default '',
              lastMessage text default '',
              lastMessageAt text,
              lastMessageFromUser integer default 0,
              lastSeenByMentor integer default 1,
              activeForMentor integer default 0,
              unreadForUser integer default 0,
              lastUserMessageId text default '',
              createdAt text not null,
              updatedAt text not null
            );
            create table if not exists chat_messages (
              id text primary key,
              conversationKey text not null,
              senderRole text default 'user',
              senderId text default '',
              text text not null,
              type text default 'text',
              attachments text default '[]',
              seenByMentor integer default 0,
              createdAt text not null
            );
            """
        )
        ensure_column(conn, "chat_messages", "type", "text default 'text'")
        ensure_column(conn, "chat_messages", "attachments", "text default '[]'")
    bootstrap_admins()
    seed_catalog()


def bootstrap_admins():
    created_at = now_iso()
    with db() as conn:
        for alias, password in DEFAULT_ADMINS.items():
            for domain in ("levelup.admin", "levelup.app"):
                email = f"{alias}@{domain}"
                existing = conn.execute("select id from users where email = ?", (email,)).fetchone()
                if existing:
                    conn.execute(
                        "update users set role = 'admin', status = 'active', approved = 1, updatedAt = ? where email = ?",
                        (created_at, email),
                    )
                    continue
                conn.execute(
                    """insert into users
                    (id,email,password_hash,name,role,status,approved,photoUrl,emailOtpVerified,createdAt,updatedAt)
                    values (?,?,?,?,?,?,?,?,?,?,?)""",
                    (
                        make_id("usr_"),
                        email,
                        hash_password(password),
                        alias.capitalize(),
                        "admin",
                        "active",
                        1,
                        "",
                        1,
                        created_at,
                        created_at,
                    ),
                )


def ensure_column(conn, table, column, definition):
    columns = {row["name"] for row in conn.execute(f"pragma table_info({table})").fetchall()}
    if column not in columns:
        conn.execute(f"alter table {table} add column {column} {definition}")


def seed_catalog():
    if not os.path.isfile(SEED_PATH):
        return
    try:
        with open(SEED_PATH, "r", encoding="utf-8") as handle:
            seed = json.load(handle)
    except Exception:
        return
    created_at = now_iso()
    with db() as conn:
        course_count = conn.execute("select count(*) as c from courses").fetchone()["c"]
        if course_count == 0:
            for raw in seed.get("courses", []):
                item = course_payload(raw)
                item.update({
                    "id": raw.get("id") or make_id("crs_"),
                    "createdAt": created_at,
                    "updatedAt": created_at,
                })
                conn.execute(
                    f"insert or ignore into courses ({','.join(item.keys())}) values ({','.join(':' + k for k in item.keys())})",
                    item,
                )

        mentor_count = conn.execute("select count(*) as c from mentors").fetchone()["c"]
        if mentor_count == 0:
            for raw in seed.get("mentors", []):
                item = mentor_payload(raw)
                item.update({
                    "id": raw.get("id") or make_id("mnt_"),
                    "createdAt": created_at,
                    "updatedAt": created_at,
                })
                conn.execute(
                    f"insert or ignore into mentors ({','.join(item.keys())}) values ({','.join(':' + k for k in item.keys())})",
                    item,
                )


def sanitize_status(value):
    value = (value or "").strip().lower()
    if value in ("paid", "approved", "accept", "accepted", "success"):
        return "paid"
    if value in ("rejected", "declined", "denied"):
        return "rejected"
    return "waiting"


class Handler(BaseHTTPRequestHandler):
    server_version = "LevelUpAPI/1.0"

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", CORS_ORIGIN)
        self.send_header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def read_json(self):
        length = int(self.headers.get("Content-Length") or "0")
        if length <= 0:
            return {}
        raw = self.rfile.read(length).decode("utf-8")
        return json.loads(raw or "{}")

    def send_json(self, data, status=200):
        raw = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def error(self, message, status=400):
        self.send_json({"error": message}, status)

    def current_user(self):
        auth = self.headers.get("Authorization", "")
        if not auth.lower().startswith("bearer "):
            return None
        return verify_token(auth.split(" ", 1)[1].strip())

    def require_user(self):
        user = self.current_user()
        if not user:
            self.error("Authentication required.", 401)
            return None
        return user

    def require_adminish(self):
        user = self.require_user()
        if not user:
            return None
        if user.get("role") not in ("admin", "instructor"):
            self.error("Admin or instructor access required.", 403)
            return None
        return user

    def route(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"
        parts = [unquote(p) for p in path.split("/") if p]
        query = {k: v[0] if len(v) == 1 else v for k, v in parse_qs(parsed.query).items()}
        return path, parts, query

    def do_GET(self):
        path, parts, query = self.route()
        if path == "/health":
            return self.send_json({"ok": True, "time": now_iso()})
        if path == "/debug/smtp":
            return self.send_json(smtp_status())
        if path == "/debug/smtp-test":
            return self.smtp_test(query)
        if path.startswith("/uploads/"):
            return self.serve_upload(path[len("/uploads/"):])
        if path == "/auth/me":
            user = self.require_user()
            return None if not user else self.send_json({"user": public_user(user)})
        if path == "/courses":
            return self.list_table("courses", "coalesce(featuredRank, 999999), datetime(createdAt) desc")
        if path == "/mentors":
            return self.list_table("mentors", "coalesce(featuredRank, 999999), name asc")
        if path == "/transactions":
            return self.list_transactions(query)
        if path == "/instructor-requests":
            return self.list_instructor_requests(query)
        if path == "/notifications":
            return self.list_notifications(query)
        if len(parts) == 3 and parts[0] == "chats" and parts[2] == "messages":
            return self.list_messages(parts[1])
        if path == "/chats":
            return self.list_chats(query)
        return self.error("Not found.", 404)

    def do_POST(self):
        path, parts, _ = self.route()
        if path == "/auth/signup":
            return self.signup()
        if path == "/auth/signin":
            return self.signin()
        if path == "/auth/google":
            return self.google_signin()
        if path == "/uploads/base64":
            return self.upload_base64()
        if path == "/courses":
            return self.create_course()
        if path == "/mentors":
            return self.create_mentor()
        if path == "/transactions":
            return self.create_transaction()
        if path == "/instructor-requests":
            return self.create_instructor_request()
        if path == "/notifications":
            return self.create_notification()
        if path == "/chats/ensure":
            return self.ensure_chat()
        if len(parts) == 3 and parts[0] == "chats" and parts[2] == "messages":
            return self.create_message(parts[1])
        return self.error("Not found.", 404)

    def do_PATCH(self):
        path, parts, _ = self.route()
        if path == "/users/me":
            return self.update_me()
        if len(parts) == 2 and parts[0] == "courses":
            return self.update_course(parts[1])
        if len(parts) == 2 and parts[0] == "mentors":
            return self.update_mentor(parts[1])
        if len(parts) == 3 and parts[0] == "transactions" and parts[2] == "status":
            return self.update_transaction_status(parts[1])
        if len(parts) == 3 and parts[0] == "instructor-requests" and parts[2] == "status":
            return self.update_instructor_status(parts[1])
        if len(parts) == 3 and parts[0] == "notifications" and parts[2] == "read":
            return self.mark_notification_read(parts[1])
        if len(parts) == 3 and parts[0] == "chats" and parts[2] == "read":
            return self.mark_chat_read(parts[1])
        return self.error("Not found.", 404)

    def do_DELETE(self):
        _, parts, _ = self.route()
        if len(parts) == 2 and parts[0] == "courses":
            return self.delete_row("courses", parts[1], adminish=True)
        if len(parts) == 2 and parts[0] == "mentors":
            return self.delete_row("mentors", parts[1], adminish=True)
        if len(parts) == 2 and parts[0] == "notifications":
            return self.delete_row("notifications", parts[1], owner_field="userId")
        return self.error("Not found.", 404)

    def signup(self):
        body = self.read_json()
        email = (body.get("email") or "").strip().lower()
        password = body.get("password") or ""
        name = (body.get("name") or body.get("fullName") or "").strip()
        if not email or "@" not in email:
            return self.error("Valid email is required.")
        if len(password) < 6:
            return self.error("Password must be at least 6 characters.")
        user = {
            "id": make_id("usr_"),
            "email": email,
            "password_hash": hash_password(password),
            "name": name,
            "role": "student",
            "status": "active",
            "approved": 0,
            "photoUrl": "",
            "emailOtpVerified": 1,
            "createdAt": now_iso(),
            "updatedAt": now_iso(),
        }
        try:
            with db() as conn:
                conn.execute(
                    """insert into users
                    (id,email,password_hash,name,role,status,approved,photoUrl,emailOtpVerified,createdAt,updatedAt)
                    values (:id,:email,:password_hash,:name,:role,:status,:approved,:photoUrl,:emailOtpVerified,:createdAt,:updatedAt)""",
                    user,
                )
        except sqlite3.IntegrityError:
            return self.error("Email is already in use.", 409)
        return self.send_json({"token": sign_token(user), "user": public_user(user)}, 201)

    def signin(self):
        body = self.read_json()
        email = (body.get("email") or "").strip().lower()
        password = body.get("password") or ""
        with db() as conn:
            user = row_to_dict(conn.execute("select * from users where email = ?", (email,)).fetchone())
        if not user or not verify_password(password, user.get("password_hash")):
            return self.error("Invalid email or password.", 401)
        return self.send_json({"token": sign_token(user), "user": public_user(user)})

    def google_signin(self):
        body = self.read_json()
        credential = (body.get("credential") or body.get("idToken") or "").strip()
        client_id = (body.get("clientId") or os.getenv("LEVELUP_GOOGLE_CLIENT_ID") or DEFAULT_GOOGLE_CLIENT_ID).strip()
        if not credential:
            return self.error("Missing Google credential.")
        try:
            profile = verify_google_id_token(credential, client_id)
        except Exception as exc:
            return self.error(str(exc) or "Google sign-in failed.", 401)

        email = (profile.get("email") or "").strip().lower()
        if not email:
            return self.error("Google account did not return an email.", 401)
        if str(profile.get("email_verified", "")).lower() not in ("true", "1"):
            return self.error("Google email is not verified.", 401)

        name = (profile.get("name") or email.split("@")[0]).strip()
        picture = (profile.get("picture") or "").strip()
        updated_at = now_iso()
        with db() as conn:
            existing = row_to_dict(conn.execute("select * from users where email = ?", (email,)).fetchone())
            if existing:
                conn.execute(
                    """update users
                    set name = coalesce(nullif(?, ''), name),
                        photoUrl = coalesce(nullif(?, ''), photoUrl),
                        emailOtpVerified = 1,
                        updatedAt = ?
                    where id = ?""",
                    (name, picture, updated_at, existing["id"]),
                )
                user = row_to_dict(conn.execute("select * from users where id = ?", (existing["id"],)).fetchone())
            else:
                user = {
                    "id": make_id("usr_"),
                    "email": email,
                    "password_hash": hash_password(secrets.token_urlsafe(32)),
                    "name": name,
                    "role": "student",
                    "status": "active",
                    "approved": 0,
                    "photoUrl": picture,
                    "emailOtpVerified": 1,
                    "createdAt": updated_at,
                    "updatedAt": updated_at,
                }
                conn.execute(
                    """insert into users
                    (id,email,password_hash,name,role,status,approved,photoUrl,emailOtpVerified,createdAt,updatedAt)
                    values (:id,:email,:password_hash,:name,:role,:status,:approved,:photoUrl,:emailOtpVerified,:createdAt,:updatedAt)""",
                    user,
                )
        return self.send_json({"token": sign_token(user), "user": public_user(user)})

    def update_me(self):
        user = self.require_user()
        if not user:
            return
        body = self.read_json()
        fields = pick(body, ["name", "photoUrl", "role", "status", "approved", "emailOtpVerified"])
        if not fields:
            return self.send_json({"user": public_user(user)})
        if "role" in fields and user.get("role") != "admin":
            fields.pop("role", None)
        fields["updatedAt"] = now_iso()
        update_by_id("users", user["id"], fields)
        with db() as conn:
            updated = row_to_dict(conn.execute("select * from users where id = ?", (user["id"],)).fetchone())
        return self.send_json({"user": public_user(updated)})

    def list_table(self, table, order):
        with db() as conn:
            rows = conn.execute(f"select * from {table} order by {order}").fetchall()
        return self.send_json({"items": [row_to_dict(r) for r in rows]})

    def create_course(self):
        if not self.require_adminish():
            return
        body = self.read_json()
        item = course_payload(body)
        item.update({"id": make_id("crs_"), "createdAt": now_iso(), "updatedAt": now_iso()})
        insert("courses", item)
        return self.send_json({"item": item}, 201)

    def update_course(self, item_id):
        if not self.require_adminish():
            return
        fields = course_payload(self.read_json(), partial=True)
        fields["updatedAt"] = now_iso()
        update_by_id("courses", item_id, fields)
        return self.send_row("courses", item_id)

    def create_mentor(self):
        if not self.require_adminish():
            return
        body = self.read_json()
        item = mentor_payload(body)
        item.update({"id": make_id("mnt_"), "createdAt": now_iso(), "updatedAt": now_iso()})
        insert("mentors", item)
        return self.send_json({"item": item}, 201)

    def update_mentor(self, item_id):
        if not self.require_adminish():
            return
        fields = mentor_payload(self.read_json(), partial=True)
        fields["updatedAt"] = now_iso()
        update_by_id("mentors", item_id, fields)
        return self.send_row("mentors", item_id)

    def create_transaction(self):
        user = self.require_user()
        if not user:
            return
        body = self.read_json()
        item = pick(body, [
            "userId", "userName", "userEmail", "courseId", "mentorId", "mentorName",
            "courseTitle", "courseCategory", "priceLabel", "receiptCode", "barcodeLeft",
            "barcodeRight", "courseCoverImagePath", "coverImage", "paymentMethod",
            "senderNumber", "attachmentPath", "attachmentName",
        ])
        item["id"] = make_id("tx_")
        item["userId"] = item.get("userId") or user["id"]
        item["userEmail"] = item.get("userEmail") or user["email"]
        item["userName"] = item.get("userName") or user.get("name") or user["email"].split("@")[0]
        item["status"] = "waiting"
        item["createdAt"] = now_iso()
        item["updatedAt"] = now_iso()
        insert("transactions", item)
        return self.send_json({"item": item}, 201)

    def list_transactions(self, query):
        user = self.require_user()
        if not user:
            return
        role = (query.get("role") or user.get("role") or "student").strip()
        sql = "select * from transactions"
        args = []
        if role == "admin" and user.get("role") == "admin":
            pass
        elif role == "instructor":
            sql += " where mentorId = ?"
            args.append(query.get("mentorId") or user["id"])
        else:
            sql += " where userId = ?"
            args.append(query.get("userId") or user["id"])
        sql += " order by datetime(createdAt) desc"
        with db() as conn:
            rows = conn.execute(sql, args).fetchall()
        return self.send_json({"items": [row_to_dict(r) for r in rows]})

    def update_transaction_status(self, item_id):
        user = self.require_adminish()
        if not user:
            return
        status = sanitize_status(self.read_json().get("status"))
        update_by_id("transactions", item_id, {"status": status, "updatedAt": now_iso()})
        return self.send_row("transactions", item_id)

    def create_instructor_request(self):
        user = self.current_user()
        body = self.read_json()
        email = (body.get("email") or "").strip().lower()
        user_id = (body.get("userId") or (user["id"] if user else "") or make_guest_instructor_user_id(email)).strip()
        item = pick(body, ["name", "email", "phone", "category", "coursesTaken", "experienceYears", "notes", "cvUrl", "idUrl"])
        item["email"] = email
        if not item.get("name") or not item.get("email") or not item.get("phone") or not item.get("category"):
            return self.error("Missing required instructor application fields.")
        item.update({
            "id": make_id("irq_"),
            "userId": user_id,
            "status": "pending",
            "requestedAt": now_iso(),
            "updatedAt": now_iso(),
            "resolvedAt": None,
        })
        with db() as conn:
            existing = conn.execute("select id from instructor_requests where userId = ?", (user_id,)).fetchone()
        if existing:
            item.pop("id")
            item.pop("requestedAt")
            update_by_where("instructor_requests", "userId", user_id, item)
            with db() as conn:
                row = conn.execute("select * from instructor_requests where userId = ?", (user_id,)).fetchone()
            saved = row_to_dict(row)
            notify_instructor_request(saved)
            return self.send_json({"item": saved})
        insert("instructor_requests", item)
        notify_instructor_request(item)
        return self.send_json({"item": item}, 201)

    def smtp_test(self, query):
        expected = os.getenv("LEVELUP_EMAIL_TEST_SECRET", "")
        provided = str(query.get("secret") or self.headers.get("x-levelup-test-secret") or "")
        if not expected:
            return self.error("LEVELUP_EMAIL_TEST_SECRET is not configured.", 503)
        if not provided or provided != expected:
            return self.error("Invalid email test secret.", 403)
        if not has_smtp_config():
            return self.send_json({"ok": False, "error": "SMTP is not fully configured.", "smtp": smtp_status()}, 503)
        item = {
            "id": make_id("debug_"),
            "name": "SMTP Test",
            "email": get_admin_email(),
            "phone": "test",
            "category": "diagnostic",
            "coursesTaken": "Diagnostic SMTP email",
            "experienceYears": "0",
            "notes": "This is a LevelUp SMTP test email.",
            "status": "test",
        }
        try:
            result = send_instructor_request_email(item)
            return self.send_json({"ok": True, "result": result or {}})
        except Exception as exc:
            return self.send_json({"ok": False, "error": str(exc), "smtp": smtp_status()}, 500)

    def list_instructor_requests(self, query):
        if not self.require_adminish():
            return
        status = (query.get("status") or "").strip()
        sql = "select * from instructor_requests"
        args = []
        if status:
            sql += " where status = ?"
            args.append(status)
        sql += " order by datetime(requestedAt) desc"
        with db() as conn:
            rows = conn.execute(sql, args).fetchall()
        return self.send_json({"items": [row_to_dict(r) for r in rows]})

    def update_instructor_status(self, item_id):
        user = self.require_adminish()
        if not user:
            return
        status = (self.read_json().get("status") or "pending").strip().lower()
        if status not in ("pending", "approved", "rejected", "revoked"):
            return self.error("Invalid status.")
        fields = {"status": status, "updatedAt": now_iso(), "resolvedAt": now_iso() if status != "pending" else None}
        update_by_id("instructor_requests", item_id, fields)
        if status == "approved":
            with db() as conn:
                req = row_to_dict(conn.execute("select * from instructor_requests where id = ?", (item_id,)).fetchone())
            if req:
                update_by_id("users", req["userId"], {"role": "instructor", "approved": 1, "updatedAt": now_iso()})
        return self.send_row("instructor_requests", item_id)

    def list_notifications(self, query):
        user = self.require_user()
        if not user:
            return
        with db() as conn:
            rows = conn.execute(
                "select * from notifications where userId in ('', ?) order by datetime(createdAt) desc",
                (user["id"],),
            ).fetchall()
        return self.send_json({"items": [row_to_dict(r) for r in rows]})

    def create_notification(self):
        user = self.require_adminish()
        if not user:
            return
        body = self.read_json()
        title = (body.get("title") or "").strip()
        if not title:
            return self.error("Notification title is required.")
        item = pick(body, ["userId", "title", "message", "icon", "isRead"])
        item.update({"id": make_id("ntf_"), "createdAt": now_iso(), "updatedAt": now_iso()})
        insert("notifications", item)
        return self.send_json({"item": item}, 201)

    def mark_notification_read(self, item_id):
        if not self.require_user():
            return
        update_by_id("notifications", item_id, {"isRead": 1, "updatedAt": now_iso()})
        return self.send_row("notifications", item_id)

    def ensure_chat(self):
        user = self.require_user()
        if not user:
            return
        body = self.read_json()
        key = (body.get("conversationKey") or body.get("conversationId") or "").strip()
        if not key:
            return self.error("conversationKey is required.")
        item = chat_payload(body)
        item["conversationKey"] = key
        item["updatedAt"] = now_iso()
        with db() as conn:
            existing = conn.execute("select id from chats where conversationKey = ?", (key,)).fetchone()
        if existing:
            update_by_id("chats", existing["id"], item)
            return self.send_row("chats", existing["id"])
        item.update({"id": make_id("cht_"), "createdAt": now_iso(), "lastMessageAt": now_iso()})
        insert("chats", item)
        return self.send_json({"item": item}, 201)

    def list_chats(self, query):
        user = self.require_user()
        if not user:
            return
        participant = (query.get("participantId") or user["id"]).strip()
        role = (query.get("role") or user.get("role") or "student").strip()
        with db() as conn:
            if role == "admin" and user.get("role") == "admin":
                rows = conn.execute("select * from chats order by datetime(lastMessageAt) desc").fetchall()
            else:
                field = "mentorId" if role == "instructor" else "userId"
                rows = conn.execute(f"select * from chats where {field} = ? order by datetime(lastMessageAt) desc", (participant,)).fetchall()
        return self.send_json({"items": [row_to_dict(r) for r in rows]})

    def list_messages(self, conversation_key):
        user = self.require_user()
        if not user:
            return
        with db() as conn:
            rows = conn.execute(
                "select * from chat_messages where conversationKey = ? order by datetime(createdAt) asc",
                (conversation_key,),
            ).fetchall()
        return self.send_json({"items": [row_to_dict(r) for r in rows]})

    def create_message(self, conversation_key):
        user = self.require_user()
        if not user:
            return
        body = self.read_json()
        text = (body.get("text") or "").strip()
        if not text:
            return self.error("Message text is required.")
        sender_role = (body.get("senderRole") or "user").strip()
        item = {
            "id": make_id("msg_"),
            "conversationKey": conversation_key,
            "senderRole": sender_role,
            "senderId": body.get("senderId") or user["id"],
            "text": text,
            "type": body.get("type") or "text",
            "attachments": json_field(body.get("attachments"), []),
            "seenByMentor": 0 if sender_role == "user" else 1,
            "createdAt": now_iso(),
        }
        insert("chat_messages", item)
        with db() as conn:
            chat = conn.execute("select * from chats where conversationKey = ?", (conversation_key,)).fetchone()
        preview = text if len(text) <= 60 else text[:60] + "..."
        if chat:
            unread = int(chat["unreadForUser"] or 0) + (0 if sender_role == "user" else 1)
            update_by_id("chats", chat["id"], {
                "lastMessage": preview,
                "lastMessageAt": item["createdAt"],
                "lastMessageFromUser": 1 if sender_role == "user" else 0,
                "lastSeenByMentor": 0 if sender_role == "user" else 1,
                "unreadForUser": unread,
                "lastUserMessageId": item["id"] if sender_role == "user" else chat["lastUserMessageId"],
                "updatedAt": now_iso(),
            })
        return self.send_json({"item": item}, 201)

    def mark_chat_read(self, conversation_key):
        user = self.require_user()
        if not user:
            return
        update_by_where("chats", "conversationKey", conversation_key, {"unreadForUser": 0, "updatedAt": now_iso()})
        with db() as conn:
            row = conn.execute("select * from chats where conversationKey = ?", (conversation_key,)).fetchone()
        return self.send_json({"item": row_to_dict(row)})

    def upload_base64(self):
        user = self.require_user()
        if not user:
            return
        body = self.read_json()
        filename = safe_filename(body.get("filename") or "upload.bin")
        raw_data = body.get("data") or ""
        if "," in raw_data:
            raw_data = raw_data.split(",", 1)[1]
        try:
            content = base64.b64decode(raw_data)
        except Exception:
            return self.error("Invalid base64 data.")
        stored = f"{int(time.time())}_{uuid.uuid4().hex}_{filename}"
        path = os.path.join(UPLOAD_DIR, stored)
        with open(path, "wb") as handle:
            handle.write(content)
        return self.send_json({"url": f"/uploads/{stored}", "filename": stored}, 201)

    def serve_upload(self, name):
        safe = safe_filename(name)
        path = os.path.join(UPLOAD_DIR, safe)
        if not os.path.isfile(path):
            return self.error("File not found.", 404)
        with open(path, "rb") as handle:
            content = handle.read()
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", CORS_ORIGIN)
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def delete_row(self, table, item_id, adminish=False, owner_field=None):
        user = self.require_adminish() if adminish else self.require_user()
        if not user:
            return
        if owner_field and user.get("role") != "admin":
            with db() as conn:
                row = conn.execute(f"select * from {table} where id = ?", (item_id,)).fetchone()
            if row and row[owner_field] not in ("", user["id"]):
                return self.error("Access denied.", 403)
        with db() as conn:
            conn.execute(f"delete from {table} where id = ?", (item_id,))
        return self.send_json({"ok": True})

    def send_row(self, table, item_id):
        with db() as conn:
            row = conn.execute(f"select * from {table} where id = ?", (item_id,)).fetchone()
        if not row:
            return self.error("Not found.", 404)
        return self.send_json({"item": row_to_dict(row)})


def public_user(user):
    data = row_to_dict(user) if not isinstance(user, dict) else dict(user)
    data.pop("password_hash", None)
    data["uid"] = data.get("id")
    data["displayName"] = data.get("name", "")
    data["emailVerified"] = bool(data.get("emailOtpVerified", 0))
    data["approved"] = bool(data.get("approved", 0))
    return data


def pick(source, keys):
    return {key: source[key] for key in keys if key in source}


def json_field(value, fallback):
    if value is None:
        value = fallback
    return json.dumps(value if isinstance(value, (list, dict)) else fallback, ensure_ascii=False)


def course_payload(body, partial=False):
    allowed = ["category", "title", "level", "mentorName", "mentorSubtitle", "mentorImagePath", "coverImagePath",
               "mentorId", "price", "oldPrice", "rating", "students", "classes", "hours", "bookmarked", "featuredRank"]
    data = pick(body, allowed)
    if not partial and not (data.get("title") or "").strip():
        data["title"] = "Untitled Course"
    if "features" in body:
        data["features"] = json_field(body.get("features"), [])
    elif not partial:
        data["features"] = "[]"
    if "sections" in body:
        data["sections"] = json_field(body.get("sections"), [])
    elif not partial:
        data["sections"] = "[]"
    return data


def mentor_payload(body, partial=False):
    allowed = ["name", "category", "subtitle", "courses", "students", "ratings", "imagePath", "bio", "featuredRank"]
    data = pick(body, allowed)
    if not partial and not (data.get("name") or "").strip():
        data["name"] = "Mentor"
    return data


def chat_payload(body):
    return pick(body, ["userId", "mentorId", "mentorName", "mentorRole", "mentorImagePath", "userName", "userImagePath",
                       "lastMessage", "lastMessageAt", "lastMessageFromUser", "lastSeenByMentor", "activeForMentor",
                       "unreadForUser", "lastUserMessageId"])


def insert(table, item):
    keys = list(item.keys())
    placeholders = ",".join([f":{key}" for key in keys])
    with db() as conn:
        conn.execute(f"insert into {table} ({','.join(keys)}) values ({placeholders})", item)


def update_by_id(table, item_id, fields):
    if not fields:
        return
    assignments = ", ".join([f"{key} = :{key}" for key in fields.keys()])
    values = dict(fields)
    values["id"] = item_id
    with db() as conn:
        conn.execute(f"update {table} set {assignments} where id = :id", values)


def update_by_where(table, field, value, fields):
    assignments = ", ".join([f"{key} = :{key}" for key in fields.keys()])
    values = dict(fields)
    values["_where_value"] = value
    with db() as conn:
        conn.execute(f"update {table} set {assignments} where {field} = :_where_value", values)


def safe_filename(value):
    name = os.path.basename(str(value).replace("\\", "/"))
    cleaned = "".join(ch for ch in name if ch.isalnum() or ch in "._-")
    return cleaned or "upload.bin"


if __name__ == "__main__":
    init_db()
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"LevelUp API running on http://{HOST}:{PORT}")
    print(f"SQLite database: {DB_PATH}")
    server.serve_forever()
