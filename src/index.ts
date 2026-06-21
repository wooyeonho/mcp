import { createHttpApp } from "./server.js";
const port = Number(process.env.PORT ?? 3000);
createHttpApp().listen(port, () => console.log(`oneulgil_mcp listening on :${port}`));
