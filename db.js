import pgPromise from 'pg-promise';
import dotenv from 'dotenv';
dotenv.config();

const pgp = pgPromise();

let useSSL = false;
let local = process.env.LOCAL || false;
useSSL = true;

const connectionString = process.env.DATABASE_URL;
const db = pgp(connectionString);
db.connect();

export { db, pgp };
