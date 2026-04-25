import requests
import uuid

base_url = "http://localhost:8000"
user_email = f"test_{uuid.uuid4().hex[:8]}@test.com"

requests.post(f"{base_url}/register", json={"email": user_email, "password": "password"})
res = requests.post(f"{base_url}/login", json={"email": user_email, "password": "password"})
token = res.json().get("access_token")
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# 1. Embed document
res = requests.post(f"{base_url}/embed-store", headers=headers, json={
    "candidate_id": "test_empty_jd",
    "sanitized_text": "I use React and python.",
    "metadata": {}
})

payload = {
    "candidate_id": "test_empty_jd",
    "job_description": "",
    "pow_data": {}
}

res = requests.post(f"{base_url}/evaluate-candidate", headers=headers, json=payload)
print("Evaluate Status:", res.status_code)
print(res.text)
