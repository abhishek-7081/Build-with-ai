import { Client } from '@elastic/elasticsearch';

const ELASTICSEARCH_NODE = process.env.ELASTICSEARCH_NODE || 'http://localhost:9200';
const INDEX_NAME = 'complaints';

let client = null;
let isElasticConnected = false;

export async function connectElasticsearch() {
  try {
    client = new Client({ node: ELASTICSEARCH_NODE });
    const health = await client.cluster.health({});
    isElasticConnected = true;
    console.log(`Elasticsearch connected successfully at ${ELASTICSEARCH_NODE}. Cluster status: ${health.status}`);
    await createIndexIfNotExists();
  } catch (err) {
    console.warn(`Elasticsearch connection fallback: Local MongoDB search will handle queries (${err.message}).`);
    isElasticConnected = false;
  }
}

async function createIndexIfNotExists() {
  if (!isElasticConnected || !client) return;

  try {
    const exists = await client.indices.exists({ index: INDEX_NAME });
    if (!exists) {
      await client.indices.create({
        index: INDEX_NAME,
        body: {
          mappings: {
            properties: {
              title: { type: 'text' },
              description: { type: 'text' },
              category: { type: 'keyword' },
              department: { type: 'keyword' },
              severity: { type: 'keyword' },
              priority: { type: 'integer' },
              priorityLevel: { type: 'keyword' },
              status: { type: 'keyword' },
              location: { type: 'text' },
              locationCoords: { type: 'geo_point' },
              reportCount: { type: 'integer' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' }
            }
          }
        }
      });
      console.log(`Created Elasticsearch index '${INDEX_NAME}' with geo_point mapping.`);
    }
  } catch (err) {
    console.error(`Error verifying Elasticsearch index '${INDEX_NAME}':`, err.message);
  }
}

export async function indexComplaint(complaintDoc) {
  if (!isElasticConnected || !client) return;

  try {
    const compObj = complaintDoc.toObject ? complaintDoc.toObject() : complaintDoc;
    const docId = compObj._id ? compObj._id.toString() : compObj.id;

    let geoPoint = null;
    if (compObj.locationCoords && compObj.locationCoords.lat && compObj.locationCoords.lng) {
      geoPoint = {
        lat: compObj.locationCoords.lat,
        lon: compObj.locationCoords.lng
      };
    }

    await client.index({
      index: INDEX_NAME,
      id: docId,
      body: {
        title: compObj.title,
        description: compObj.description,
        category: compObj.category,
        department: compObj.department,
        severity: compObj.severity,
        priority: compObj.priority,
        priorityLevel: compObj.priorityLevel,
        status: compObj.status,
        location: compObj.location,
        locationCoords: geoPoint,
        reportCount: compObj.reportCount,
        createdAt: compObj.createdAt,
        updatedAt: compObj.updatedAt
      }
    });
  } catch (err) {
    console.error("Failed to index complaint document in Elasticsearch:", err.message);
  }
}

export async function deleteComplaint(complaintId) {
  if (!isElasticConnected || !client) return;

  try {
    await client.delete({
      index: INDEX_NAME,
      id: complaintId.toString()
    });
  } catch (err) {
    console.error(`Failed to delete complaint '${complaintId}' from Elasticsearch:`, err.message);
  }
}

export async function searchNearbyComplaints(lat, lng, radiusKm = 1.5) {
  if (!isElasticConnected || !client) return null;

  try {
    const response = await client.search({
      index: INDEX_NAME,
      body: {
        query: {
          bool: {
            must_not: [
              { term: { status: 'Resolved' } }
            ],
            filter: {
              geo_distance: {
                distance: `${radiusKm}km`,
                locationCoords: {
                  lat: parseFloat(lat),
                  lon: parseFloat(lng)
                }
              }
            }
          }
        }
      }
    });

    return response.hits.hits.map((hit) => ({
      _id: hit._id,
      id: hit._id,
      ...hit._source
    }));
  } catch (err) {
    console.error("Elasticsearch nearby search query failed:", err.message);
    return null;
  }
}

export async function findSimilarElasticComplaints(description, lat, lng, distanceKm = 1.0) {
  if (!isElasticConnected || !client) return null;

  try {
    const response = await client.search({
      index: INDEX_NAME,
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
            must_not: [
              { term: { status: 'Resolved' } }
            ],
            filter: {
              geo_distance: {
                distance: `${distanceKm}km`,
                locationCoords: {
                  lat: parseFloat(lat),
                  lon: parseFloat(lng)
                }
              }
            }
          }
        }
      }
    });

    return response.hits.hits.map((hit) => ({
      complaint: { _id: hit._id, id: hit._id, ...hit._source },
      score: hit._score
    }));
  } catch (err) {
    console.error("Elasticsearch similarity search query failed:", err.message);
    return null;
  }
}
