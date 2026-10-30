import swaggerJsdoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "HAWL API",
      version: "1.0.0",
      description: "University of Hargeisa / CECIT Task Management API",
    },
    servers: [
      {
        url: "http://localhost:4000/api/v1",
        description: "Development Server",
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "hawl_session",
        },
      },
    },
    security: [{ cookieAuth: [] }],
    paths: {
      "/auth/login": {
        post: {
          summary: "Login with email and password",
          tags: ["Auth"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    email: { type: "string", example: "dean@mail.com" },
                    password: { type: "string", example: "12345678" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Successful login. Sets HTTP-only cookie." },
            401: { description: "Invalid credentials" },
            403: { description: "Account locked or deactivated" },
          },
        },
      },
      "/tasks": {
        get: {
          summary: "List tasks (filtered by scope)",
          tags: ["Tasks"],
          parameters: [
            { in: "query", name: "take", schema: { type: "integer", default: 100 } },
            { in: "query", name: "skip", schema: { type: "integer", default: 0 } },
            { in: "query", name: "status", schema: { type: "string" } },
            { in: "query", name: "mine", schema: { type: "string", enum: ["true", "false"] } },
          ],
          responses: {
            200: { description: "A paginated list of tasks" },
          },
        },
        post: {
          summary: "Create a new task",
          tags: ["Tasks"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    title: { type: "string", example: "Setup new lab" },
                    description: { type: "string" },
                    categoryId: { type: "string" },
                    officeId: { type: "string" },
                    priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
                    dueDate: { type: "string", format: "date-time" },
                  },
                  required: ["title", "categoryId", "officeId"],
                },
              },
            },
          },
          responses: {
            201: { description: "Task created successfully" },
          },
        },
      },
      "/tasks/board": {
        get: {
          summary: "Get tasks grouped by status for the Kanban board",
          tags: ["Tasks"],
          responses: {
            200: { description: "An object with 6 arrays (one per status)" },
          },
        },
      },
      "/reports/data": {
        get: {
          summary: "Get all data reports (R1-R8)",
          tags: ["Reports"],
          responses: {
            200: { description: "Aggregated statistics" },
          },
        },
      },
      "/reports/export": {
        get: {
          summary: "Export all tasks to CSV",
          tags: ["Reports"],
          responses: {
            200: { description: "A CSV file download" },
          },
        },
      },
    },
  },
  apis: [], // We are defining paths manually above for simplicity and speed
});
