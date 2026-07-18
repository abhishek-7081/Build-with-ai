from flask import Flask, request, jsonify
from datetime import datetime
import os
import json
from openai import OpenAI

app = Flask(__name__)

# Initialize the client pointed at OpenRouter's endpoint[cite: 5]
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
)

# Constants[cite: 5]
DEPARTMENTS = [
    "PWD", "MCD", "DJB", "DTL / DISCOM", "Edistrict Delhi",
    "DTC", "Delhi Police", "Delhi Traffic Police", "DPCC", "Delhi Civic helpline",
]

SEVERITY_LEVELS = ["High", "Medium", "Low"] #[cite: 5]

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
] #[cite: 5]

def get_final_categorization(problem_text):
    """Sends the problem text to the AI to extract final details."""
    system_prompt = f"""
    You are an intelligent civic issue router for Delhi. Analyze the input.
    
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
    """ #[cite: 5]

    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-20b", 
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": problem_text}
            ]
        ) #[cite: 5]
        
        result_text = response.choices[0].message.content.strip() #[cite: 5]
        return json.loads(result_text) #[cite: 5]
        
    except Exception as e:
        print(f"An API error occurred: {e}") #[cite: 5]
        return None

@app.route('/api/submit-problem', methods=['POST'])
def handle_problem():
    # Grab the JSON payload sent by the frontend[cite: 6]
    data = request.get_json() #[cite: 6]
    
    if not data:
        return jsonify({"status": "error", "message": "Missing JSON payload"}), 400 #[cite: 6]
        
    # Extract the frontend fields[cite: 6]
    problem_description = data.get('problem_description') #[cite: 6]
    location = data.get('location') #[cite: 6]
    
    # Basic validation check
    if not all([problem_description, location]):
        return jsonify({"status": "error", "message": "Missing required fields"}), 400
        
    # Get the final categorization from AI
    ai_result = get_final_categorization(problem_description)
    
    if not ai_result:
        return jsonify({"status": "error", "message": "AI Processing Failed"}), 500

    # Build the final structured JSON object mapping `None` to python objects which convert to `null` in JSON
    formatted_data = {
        "id": None,
        "status": None,
        "received_at": datetime.utcnow().isoformat() + "Z",
        "description": ai_result.get("Description", "Unknown issue"),
        "severity": ai_result.get("Severity", "Low"),
        "department": ai_result.get("Department", "Unknown"),
        "location": ai_result.get("Location") if ai_result.get("Location") else location,
        "resolved_date": None
    }
    
    # Return the clean JSON back to the frontend (or save it to a database)[cite: 6]
    return jsonify(formatted_data), 200 #[cite: 6]

if __name__ == '__main__':
    # Doppler can inject a PORT variable; default to 5000 if not set[cite: 6]
    port = int(os.environ.get("PORT", 5000)) #[cite: 6]
    app.run(debug=True, host='0.0.0.0', port=port) #[cite: 6]