import os
import json
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize the client pointed at OpenRouter's endpoint
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
)

# Constants
DEPARTMENTS = [
    "PWD", "MCD", "DJB", "DTL / DISCOM", "Edistrict Delhi",
    "DTC", "Delhi Police", "Delhi Traffic Police", "DPCC", "Delhi Civic helpline",
]

SEVERITY_LEVELS = ["High", "Medium", "Low"]

DELHI_PLACES = [
    "Anand Vihar", "Ashok Vihar", "Babarpur", "Badarpur", "Bawana", "Bhajanpura",
    "Bijwasan", "Chanakyapuri", "Chandni Chowk", "Chhatarpur", "Civil Lines",
    "Connaught Place", "Daryaganj", "Defense Colony", "Delhi Cantonment",
    "Dilshad Garden", "Dwarka", "Geeta Colony", "Gokulpuri", "Gole Market",
    "Govindpuri", "Greater Kailash", "Green Park", "GTB Nagar", "Hari Nagar",
    "Hauz Khas", "ITO", "Jamia Nagar", "Janakpuri", "Jor Bagh", "Kalkaji",
    "Kamla Nagar", "Kapashera", "Karol Bagh", "Kashmere Gate", "Kirti Nagar",
    "Kotwali", "Lajpat Nagar", "Laxmi Nagar", "Lodhi Colony", "Mahipalpur",
    "Malviya Nagar", "Mangolpuri", "Mayur Vihar", "Mehrauli", "Model Town",
    "Moti Nagar", "Mukherjee Nagar", "Munirka", "Najafgarh", "Nand Nagri",
    "Narela", "Nehru Place", "New Friends Colony", "Nizamuddin", "Okhla",
    "Paharganj", "Palam", "Pandav Nagar", "Paschim Vihar", "Patel Nagar",
    "Patparganj", "Pitampura", "Pragati Maidan", "Preet Vihar", "Punjabi Bagh",
    "R.K. Puram", "Rajendra Nagar", "Rajouri Garden", "Rohini", "Sadar Bazaar",
    "Safdarjung Enclave", "Saket", "Saraswati Vihar", "Sarita Vihar", "Seelampur",
    "Seemapuri", "Shahdara", "Shalimar Bagh", "Shastri Park", "South Extension",
    "Sultanpuri", "Tilak Nagar", "Timarpur", "Uttam Nagar", "Vasant Kunj",
    "Vasant Vihar", "Vasundhara Enclave", "Vikaspuri", "Vivek Vihar", "Yamuna Vihar"
]

def analyze_single_item(single_issue_dict):
    """Sends a single issue payload to the AI and prints the formatted string."""
    system_prompt = f"""
    You are an intelligent civic issue router for Delhi. Analyze the JSON input.
    
    1. CATEGORY: Map the issue to EXACTLY ONE department: {json.dumps(DEPARTMENTS)}
    2. SEVERITY: Assign severity based on safety risks: {json.dumps(SEVERITY_LEVELS)}
    3. LOCATION: Extract the location mentioned in the input and match it to one of these places: {json.dumps(DELHI_PLACES)}. 
       IMPORTANT: If the location does not exactly match the list, extract the specific street, road, landmark, or local area mentioned in the text (e.g., "Outer Ring Road"). 
       If absolutely no location or landmark is mentioned, use null.
    4. DESCRIPTION: Create a concise, 1-sentence summary of the problem.

    Output ONLY a valid JSON object with these exact keys, no markdown, no extra text:
    {{
        "Description": "Concise summary",
        "Severity": "High/Medium/Low",
        "Department": "Matched Department",
        "Location": "Matched Location, Extracted Landmark, or null"
    }}
    """

    try:
        response = client.chat.completions.create(
            # Alternatively use "openai/gpt-oss-20b:free" for OpenRouter's free tier
            model="openai/gpt-oss-20b", 
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(single_issue_dict)}
            ]
        )
        
        result_text = response.choices[0].message.content.strip()
        
        try:
            parsed = json.loads(result_text)
            
            # Format output -> "problem description",severity,department,location
            desc = parsed.get("Description", "Unknown issue")
            sev = parsed.get("Severity", "Low")
            dept = parsed.get("Department", "Unknown")
            loc = parsed.get("Location")
            
            if loc is None:
                loc = "null"
                
            print(f'"{desc}",{sev},{dept},{loc}')
            
        except json.JSONDecodeError:
            print(f"Error: AI did not return valid JSON. Raw output: {result_text}")
            
    except Exception as e:
        print(f"An API error occurred: {e}")

def process_issue(json_input_str):
    # Verify input is valid JSON before sending to AI
    try:
        user_data = json.loads(json_input_str)
    except json.JSONDecodeError:
        print("Error: Input is not valid JSON.")
        return

    # Check if input is a list of multiple issues or just one
    if isinstance(user_data, list):
        for item in user_data:
            analyze_single_item(item)
    elif isinstance(user_data, dict):
        analyze_single_item(user_data)
    else:
        print("Error: Invalid JSON structure. Must be an object or an array of objects.")

if __name__ == "__main__":
    # Your multi-item test payload
    user_input = """[
      {
        "problem": "Large pothole on Outer Ring Road causing traffic congestion and accidents.",
        "category": "Roads",
        "image": "road_pothole_001.jpg"
      },
      {
        "problem": "Broken road surface near the residential colony entrance creating safety hazards at Janakpuri.",
        "category": "Roads",
        "image": "road_damage_002.jpg"
      }
    ]"""
    
    process_issue(user_input)