import { createApp } from "./app.ts";
import { migrate } from "./config/db.ts";

migrate();
createApp().listen(3000, () => console.log("http://192.168.68.81:3000"));
