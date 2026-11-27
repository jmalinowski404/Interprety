import "dotenv/config";
import mongoose from "mongoose";
import app from "./app";
import { initDatabase } from "./services/dbInit";

const port = process.env.PORT;

const start = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI as string);
        console.log('Połączono z bazą');

        await initDatabase();
        console.log('Struktura bazy i dane słownikowe gotowe');
    } catch (err) {
        console.error('Błąd inicjalizacji bazy:', (err as Error).message);
        process.exit(1);
    }

    app.listen(port, () => {
        console.log(`Backend działa na porcie ${port}`);
    });
};

start();
