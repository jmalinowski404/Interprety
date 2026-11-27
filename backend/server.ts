import "dotenv/config";
import mongoose from "mongoose";
import app from "./app";

const port = process.env.PORT;

mongoose
    .connect(process.env.MONGO_URI as string)
    .then(async () => {
        console.log('Połączono z bazą');
    })
    .catch((err) => {
        console.error('Błąd połączenia z bazą:', err.message);
    });

app.listen(port, () => {
    console.log(`Backend działa na porcie ${port}`);
})
