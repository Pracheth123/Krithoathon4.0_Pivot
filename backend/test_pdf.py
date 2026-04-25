import requests
import json
import uuid
import io
from reportlab.pdfgen import canvas

base_url = "http://localhost:8000"
user_email = f"test_{uuid.uuid4().hex[:8]}@test.com"

requests.post(f"{base_url}/register", json={"email": user_email, "password": "password"})
res = requests.post(f"{base_url}/login", json={"email": user_email, "password": "password"})
token = res.json().get("access_token")
headers = {"Authorization": f"Bearer {token}"}

# Create a test PDF
pdf_buffer = io.BytesIO()
c = canvas.Canvas(pdf_buffer)
c.drawString(100, 100, "I am a Python developer and this is a PDF.")
c.save()
pdf_buffer.seek(0)

# Upload
files = {"file": ("test_resume.pdf", pdf_buffer, "application/pdf")}
res = requests.post(f"{base_url}/parse-resume", headers=headers, files=files)

print("Parse Response:", res.status_code)
print(res.text)
