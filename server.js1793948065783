const http = require("node:http");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

const port = Number(process.env.PORT) || 3000;
const files = {
  "/": { name: "index.html", type: "text/html; charset=utf-8" },
  "/mortgage.html": { name: "mortgage.html", type: "text/html; charset=utf-8" },
  "/mortgage.css": { name: "mortgage.css", type: "text/css; charset=utf-8" }
};

const server = http.createServer(async (request, response) => {
  const file = files[request.url];
  if (request.method !== "GET" || !file) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  try {
    const content = await readFile(path.join(__dirname, file.name));
    response.writeHead(200, { "Content-Type": file.type });
    response.end(content);
  } catch (error) {
    console.error(`Failed to load ${file.name}:`, error);
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Internal server error");
  }
});

server.listen(port, () => {
  console.log(`Web app listening on http://localhost:${port}`);
});
