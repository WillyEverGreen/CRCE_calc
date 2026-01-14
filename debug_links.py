import requests
from bs4 import BeautifulSoup
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

URLS_TO_CHECK = [
    "https://www.frcrce.ac.in/"
]

def check_url(url):
    try:
        print(f"\nFetching {url}...")
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        response = requests.get(url, headers=headers, verify=False, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Find any link with 'pdf' or 'syllabus' or 'academics'
            relevant_links = []
            for a in soup.find_all('a', href=True):
                href = a['href']
                text = a.get_text(strip=True).lower()
                if 'syllabus' in text or 'academic' in text:
                    relevant_links.append(f"{text} -> {href}")
            
            print(f"Found {len(relevant_links)} navigation links.")
            for l in relevant_links:
                print(l)
    except Exception as e:
        print(f"Error fetching {url}: {e}")

if __name__ == "__main__":
    for url in URLS_TO_CHECK:
        check_url(url)
