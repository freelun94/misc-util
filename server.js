import express from "express";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import apiApp from "./server/app.js";

const app = express();
const projectRoot = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 3001;

app.use(express.static(resolve(projectRoot, "public")));
app.use(apiApp);

export default app;

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`象棋服務已在連接埠 ${port} 啟動。`);
  });
}
