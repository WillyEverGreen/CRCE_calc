import requests
from bs4 import BeautifulSoup
from pypdf import PdfReader
import os
import json
import re
from urllib.parse import urljoin

SYLLABUS_URL = "https://www.frcrce.ac.in/index.php/academics/tlp/syllabus"
DOWNLOAD_DIR = "syllabus_pdfs"

if not os.path.exists(DOWNLOAD_DIR):
    os.makedirs(DOWNLOAD_DIR)

def extract_credits_from_pdf(pdf_path, filename):
    credits_map = {}
    print(f"Processing {filename}...")
    try:
        reader = PdfReader(pdf_path)
        for page in reader.pages:
            text = page.extract_text()
            if not text: continue
            
            lines = text.split('\n')
            for line in lines:
                # Regex heuristic to find lines with Code and Credits
                # Look for lines like "25PCC12CE01 ... 3"
                # Or table rows that look like: "Code Name ... Credits"
                
                # Normalize spaces
                line = re.sub(r'\s+', ' ', line).strip()
                
                # Pattern: Code (at start) ... Number (at end or near end)
                # Codes start with 25 or consist of alphanumeric chars (e.g. ECC701)
                # It's fuzzy, but let's try to capture obvious ones
                
                # Match typical code pattern: 
                # (25[A-Z0-9]{4,} | [A-Z]{2,}\d{3,}[A-Z]?) -> Code
                # ...
                # (\d+(\.\d+)?) -> Credit
                
                # Example: "25PCC12CE01 Data Structures 3"
                match = re.search(r'\b(25[A-Z0-9]{5,}|[A-Z]{2,}\d{3,}[A-Z0-9]*)\b.*\b(\d+(\.\d+)?)\s*$', line)
                
                if match:
                    code = match.group(1)
                    credit = float(match.group(2))
                    
                    # Validation
                    if credit > 10 or credit < 0.5: continue # unlikely
                    if len(code) > 15: continue
                    
                    if code not in credits_map:
                         # Try to extract name? It's between code and credit
                        name_match = re.search(f"{re.escape(code)}\s+(.*)\s+{re.escape(match.group(2))}", line)
                        name = name_match.group(1).strip() if name_match else "Unknown"
                        
                        credits_map[code] = {
                            "credit": credit,
                            "name": name,
                            "source": filename
                        }
                        print(f"  Found: {code} -> {credit}")

    except Exception as e:
        print(f"Error reading {filename}: {e}")
        
    return credits_map

def main():
    print("Fetching syllabus page...")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    try:
        response = requests.get(SYLLABUS_URL, headers=headers, verify=False, timeout=30)
        print(f"Status Code: {response.status_code}")
        # Debug: check content start
        print(f"HTML Preview: {response.text[:500]}...")
    except Exception as e:
        print(f"Failed to fetch page: {e}")
        return

    soup = BeautifulSoup(response.content, 'html.parser')
    
    links_found = 0
    all_credits = {}
    
    # Heuristic: Find all links ending in .pdf OR containing 'syllabus' and having an href
    for a in soup.find_all('a', href=True):
        href = a['href']
        text = a.get_text(strip=True).lower()
        
        # Debug print keys
        # print(f"Checking link: {text} -> {href}")
        
        if 'pdf' in href.lower() or 'syllabus' in href.lower() or 'scheme' in href.lower():
            text_lower = text.lower()
            href_lower = href.lower()
            
            # STRICT FILTER:
            # Must have 'syllabus' or 'scheme' or 'curriculum' OR ('sem' and 'pdf') 
            # in either text or href.
            # And exclude common junk.
            
            is_valid = False
            keywords = ['syllabus', 'scheme', 'curriculum', 'portion']
            for k in keywords:
                if k in text_lower or k in href_lower:
                    is_valid = True
                    break
            
            if not is_valid:
                # check for semester patterns if it's a PDF
                if 'pdf' in href_lower and ('sem' in text_lower or 'sem' in href_lower or 'fe' in text_lower or 'se' in text_lower or 'te' in text_lower or 'be' in text_lower):
                     is_valid = True
            
            # Exclude known junk
            junk_terms = ['achievements', 'placed', 'student', 'report', 'ssr', 'aqar', 'committee', 'calendar', 'timetable', 'notice']
            for j in junk_terms:
                if j in text_lower or j in href_lower:
                    is_valid = False
                    break
            
            if not is_valid:
                # print(f"  Skipping non-syllabus: {text} -> {href}")
                continue

            full_url = urljoin(SYLLABUS_URL, href)
            
            # Construct a filename
            if href.lower().endswith('.pdf'):
                filename = href.split('/')[-1]
            else:
                # Try to guess or use a hash
                filename = f"doc_{abs(hash(href))}.pdf"

            local_path = os.path.join(DOWNLOAD_DIR, filename)
            
            # Download if not exists
            if not os.path.exists(local_path):
                print(f"Downloading {filename} from {full_url} ...")
                try:
                    pdf_resp = requests.get(full_url, verify=False, timeout=30)
                    if 'application/pdf' in pdf_resp.headers.get('Content-Type', ''):
                        with open(local_path, 'wb') as f:
                            f.write(pdf_resp.content)
                        print("  Success")
                    else:
                        print(f"  Skipping: Content-Type is {pdf_resp.headers.get('Content-Type')}")
                        continue
                except Exception as e:
                    print(f"  Failed: {e}")
                    continue
            else:
                 print(f"File {filename} exists, skipping download.")
            
            # Process PDF
            extracted = extract_credits_from_pdf(local_path, filename)
            if extracted:
                all_credits.update(extracted)
                links_found += 1
            
    print(f"\nTotal Key-Value pairs extracted: {len(all_credits)}")
    
    with open('final_credits_all.json', 'w') as f:
        json.dump(all_credits, f, indent=2)
        
    print("Saved to final_credits_all.json")

if __name__ == "__main__":
    # Suppress SSL warnings
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    main()
