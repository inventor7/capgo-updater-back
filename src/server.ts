if (process.env.NODE_ENV === "production") {
  require("module-alias/register");
}

import { app } from "./app";

app.start();
