import mysql from "mysql2/promise"; 
import dotenv from "dotenv";
dotenv.config();

export const db = await mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_DB_PASS,
  database: process.env.MYSQL_DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
});

console.log("MySQL Connected (Promise)");
