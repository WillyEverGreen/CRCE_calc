import requests
from bs4 import BeautifulSoup
import time

URL_BASE = "https://crce-students.contineo.in/parents"
URL_LOGIN = f"{URL_BASE}/"

# User Credentials
USERNAME = "MU0341120240233054"
DOB_DD = "10 " # Note the space
DOB_MM = "03"
DOB_YYYY = "2006"

def test_login():
    s = requests.Session()
    s.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Referer": URL_LOGIN
    })

    print("1. Fetching Login Page...")
    r = s.get(URL_LOGIN)
    soup = BeautifulSoup(r.text, "html.parser")

    # Extract form inputs
    data = {}
    form = soup.find("form")
    if not form:
        print("Error: No login form found")
        return

    action = form.get("action", "")
    url_post = f"{URL_BASE}/{action}"

    for inp in form.find_all(["input", "select"]):
        name = inp.get("name")
        val = inp.get("value", "")
        if name:
            data[name] = val
    
    # Fill credentials
    data["username"] = USERNAME
    data["dd"] = DOB_DD
    data["mm"] = DOB_MM
    data["yyyy"] = DOB_YYYY
    
    # Remove conflicting fields
    if "password" in data: del data["password"]
    if "captcha-response" in data: del data["captcha-response"]

    print(f"2. Posting Login to {url_post}...")
    # print(data)

    r_post = s.post(url_post, data=data, allow_redirects=True)
    
    if "Dashboard" in r_post.text or "Logout" in r_post.text:
        print("✅ SUCCESS! Login worked with Python Requests.")
        print(f"Dashboard URL: {r_post.url}")
        
        # Try finding subjects
        soup_dash = BeautifulSoup(r_post.text, "html.parser")
        links = soup_dash.find_all("a", href=True)
        exam_links = [l for l in links if "task=ciedetails" in l['href']]
        print(f"Found {len(exam_links)} subject links.")
        
        if exam_links:
            print("Fetching first subject...")
            r_sub = s.get(exam_links[0]['href'])
            print(f"Subject Page Status: {r_sub.status_code}")
            if "Total" in r_sub.text or "/" in r_sub.text:
                 print("✅ Marks data found in HTML!")
            else:
                 print("⚠️ Marks data NOT found (JS required?)")
            
    else:
        print("❌ FAILED. Login did not redirect to Dashboard.")
        print("Final URL:", r_post.url)
        # print("Response Preview:", r_post.text[:500])

if __name__ == "__main__":
    test_login()
