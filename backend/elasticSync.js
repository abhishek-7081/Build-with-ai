import { Client } from "@elastic/elasticsearch";
import { Complaint } from "./models/Complaint.js";
import dotenv from "dotenv";

dotenv.config();

const esUrl = process.env.ELASTICSEARCH_URL || "https://my-elasticsearch-project-f84f1b.es.us-central1.gcp.elastic.cloud:443";
const esApiKey = process.env.ELASTICSEARCH_API_KEY || "";

let esClient = null;

try {
  const clientOpts = { node: esUrl };
  if (esApiKey) {
    clientOpts.auth = { apiKey: esApiKey };
  }
  esClient = new Client(clientOpts);
  console.log(`Elasticsearch integration configured for: ${esUrl}`);
} catch (err) {
  console.error("Failed to construct Elasticsearch Client:", err.message);
}

// 1. Setup Index and Mappings on server start
export async function connectElasticsearch() {
  if (!esClient) {
    console.warn("Elasticsearch client is not initialized. Running in MongoDB-only mode.");
    return;
  }

  try {
    const indexExists = await esClient.indices.exists({ index: "complaints" });
    if (!indexExists) {
      console.log("Creating 'complaints' index in Elasticsearch with geo_point mapping...");
      await esClient.indices.create({
        index: "complaints",
        body: {
          mappings: {
            properties: {
              title: { type: "text" },
              description: { type: "text" },
              category: { type: "keyword" },
              department: { type: "keyword" },
              status: { type: "keyword" },
              priority: { type: "integer" },
              priorityLevel: { type: "keyword" },
              location: { type: "text" },
              locationCoords: { type: "geo_point" },
              reportCount: { type: "integer" },
              createdAt: { type: "date" },
              updatedAt: { type: "date" },
              comments: {
                properties: {
                  userName: { type: "text" },
                  commentText: { type: "text" },
                  createdAt: { type: "date" }
                }
              }
            }
          }
        }
      });
      console.log("Elasticsearch 'complaints' index initialized successfully.");
    } else {
      console.log("Elasticsearch 'complaints' index verification success.");
    }

    // Sync all MongoDB complaints to Elasticsearch
    await syncAllFromMongo();
  } catch (err) {
    console.error("Elasticsearch initialization failed. Falling back softly to MongoDB:", err.message);
  }
}

// 2. Index / Sync a Single Complaint (Create or Update)
export async function indexComplaint(complaint) {
  if (!esClient) return;
  try {
    const doc = {
      title: complaint.title,
      description: complaint.description,
      category: complaint.category,
      department: complaint.department,
      status: complaint.status,
      priority: complaint.priority,
      priorityLevel: complaint.priorityLevel,
      location: complaint.location,
      reportCount: complaint.reportCount,
      createdAt: complaint.createdAt,
      updatedAt: complaint.updatedAt,
      comments: (complaint.comments || []).map(c => ({
        userName: c.userName,
        commentText: c.commentText,
        createdAt: c.createdAt
      }))
    };

    // Convert coordinates to standard geo_point layout { lat, lon }
    if (complaint.locationCoords && typeof complaint.locationCoords.lat === "number" && typeof complaint.locationCoords.lng === "number") {
      doc.locationCoords = {
        lat: complaint.locationCoords.lat,
        lon: complaint.locationCoords.lng
      };
    }

    await esClient.index({
      index: "complaints",
      id: complaint._id.toString(),
      body: doc,
      refresh: "wait_for" // Ensure real-time query visibility
    });
  } catch (err) {
    console.error(`Failed to index complaint ${complaint._id} in Elasticsearch:`, err.message);
  }
}

// 3. Delete Complaint from Index
export async function deleteComplaint(complaintId) {
  if (!esClient) return;
  try {
    await esClient.delete({
      index: "complaints",
      id: complaintId.toString(),
      refresh: "wait_for"
    });
    console.log(`Successfully deleted complaint ${complaintId} from Elasticsearch index.`);
  } catch (err) {
    console.error(`Failed to delete complaint ${complaintId} from Elasticsearch:`, err.message);
  }
}

// 4. Bootstrap sync
export async function syncAllFromMongo() {
  if (!esClient) return;
  try {
    const total = await Complaint.countDocuments();
    console.log(`Synchronizing ${total} complaints from MongoDB to Elasticsearch...`);
    const all = await Complaint.find();
    for (const comp of all) {
      await indexComplaint(comp);
    }
    console.log("Elasticsearch sync bootstrap complete.");
  } catch (err) {
    console.error("Elasticsearch bootstrap sync failed:", err.message);
  }
}

// 5. Search Nearby Complaints using geo-distance query (500m - 1.5km)
export async function searchNearbyComplaints(lat, lng, radiusKm = 1.5) {
  if (!esClient) return null; // Let endpoint fallback to Mongo query
  try {
    const result = await esClient.search({
      index: "complaints",
      body: {
        query: {
          bool: {
            must: { match_all: {} },
            filter: {
              geo_distance: {
                distance: `${radiusKm}km`,
                locationCoords: { lat, lon: lng }
              }
            }
          }
        }
      }
    });

    return result.hits.hits.map(hit => ({
      _id: hit._id,
      id: hit._id,
      ...hit._source,
      locationCoords: {
        lat: hit._source.locationCoords.lat,
        lng: hit._source.locationCoords.lon
      }
    }));
  } catch (err) {
    console.error("Elasticsearch geo-distance search failed. Falling back to Mongo query:", err.message);
    return null;
  }
}

// 6. Proximity-aware full-text duplicate detector (hybrid score search)
export async function findSimilarElasticComplaints(description, lat, lng, radiusKm = 1.5) {
  if (!esClient) return null;
  try {
    const result = await esClient.search({
      index: "complaints",
      body: {
        query: {
          bool: {
            must: [
              {
                match: {
                  description: {
                    query: description,
                    fuzziness: "AUTO"
                  }
                }
              }
            ],
            filter: [
              {
                term: { status: "Pending" } // Match active complaints
              },
              {
                geo_distance: {
                  distance: `${radiusKm}km`,
                  locationCoords: { lat, lon: lng }
                }
              }
            ]
          }
        }
      }
    });

    return result.hits.hits.map(hit => ({
      score: hit._score,
      complaint: {
        _id: hit._id,
        id: hit._id,
        ...hit._source,
        locationCoords: {
          lat: hit._source.locationCoords.lat,
          lng: hit._source.locationCoords.lon
        }
      }
    }));
  } catch (err) {
    console.error("Elasticsearch hybrid duplicate check failed:", err.message);
    return null;
  }
}
