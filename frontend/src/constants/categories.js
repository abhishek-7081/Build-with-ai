export const CATEGORIES = [
  "Road Damage",
  "Garbage Collection",
  "Water Supply",
  "Water Leakage",
  "Sewage Problems",
  "Street Lights",
  "Electricity",
  "Public Transport",
  "Traffic Signals",
  "Illegal Parking",
  "Encroachment",
  "Air Pollution",
  "Tree Fallen",
  "Drainage",
  "Public Toilets",
  "Others"
];

export function getCategoryPlaceholderIcon(category) {
  switch (category) {
    case "Road Damage": return "🛣️";
    case "Garbage Collection": return "🗑️";
    case "Water Supply": return "🚰";
    case "Water Leakage": return "💧";
    case "Sewage Problems": return "🤢";
    case "Street Lights": return "💡";
    case "Electricity": return "⚡";
    case "Public Transport": return "🚌";
    case "Traffic Signals": return "🚦";
    case "Illegal Parking": return "🚗";
    case "Encroachment": return "🏪";
    case "Air Pollution": return "🌫️";
    case "Tree Fallen": return "🌳";
    case "Drainage": return "🕳️";
    case "Public Toilets": return "🚻";
    default: return "🏛️";
  }
}
