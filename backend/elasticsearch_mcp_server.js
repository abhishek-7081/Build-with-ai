import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Client } from "@elastic/elasticsearch";
import { z } from "zod";

const url = process.env.ELASTICSEARCH_URL || "https://my-elasticsearch-project-f84f1b.es.us-central1.gcp.elastic.cloud:443";
const apiKey = process.env.ELASTICSEARCH_API_KEY || "";

const esClient = new Client({
  node: url,
  auth: {
    apiKey: apiKey,
  },
});

const server = new McpServer({
  name: "elasticsearch-mcp-server",
  version: "0.1.0",
});

// Register document search tool
server.tool(
  "search",
  {
    index: z.string().describe("Name of the index to search in"),
    query: z.object({}).describe("Elasticsearch query DSL object")
  },
  async ({ index, query }) => {
    try {
      const response = await esClient.search({
        index,
        body: query
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Search error: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
);

// Register list_indices tool
server.tool(
  "list_indices",
  {},
  async () => {
    try {
      const response = await esClient.cat.indices({ format: "json" });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to list indices: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Elasticsearch MCP Server running on STDIO");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
