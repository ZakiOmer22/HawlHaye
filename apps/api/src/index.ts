import { createApp } from "./app";
import { loadEnv } from "./config/env";

const env = loadEnv();
createApp(env).listen(env.PORT, () => {
  console.error(`HAWL API listening on port ${env.PORT} (${env.NODE_ENV})`);
});
