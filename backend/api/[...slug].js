const serverless = require("serverless-http");
const app = require("../server");

// Vercel routes any request under /api/* to this catch-all function.
// serverless-http adapts the existing Express app (with its /api/auth,
// /api/admin, /api/student routers already mounted) to Vercel's Node runtime.
module.exports = serverless(app);
