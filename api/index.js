import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const app = require("../dist-server/server/index.js").default;

export default app;
