import { createApp } from "./app.ts";
import { migrate } from "./config/db.ts";

const port = Number(process.env.PORT ?? 3000);

migrate();
createApp().listen(port, () => console.log(`Escuchando en el puerto ${port}`));
