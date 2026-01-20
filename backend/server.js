import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt, { hash } from 'bcryptjs';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';


dotenv.config();

const salt = 10;

const app = express();
app.use(express.json());
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));

app.use(cookieParser());

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: process.env.MYSQL_DB_PASS,
    database: 'plantro'
});

app.post('/register', (req, res) => {
    const sql = `
        INSERT INTO users (role_id, full_name, email, phone, password)
        SELECT role_id, ?, ?, ?, ? 
        FROM roles 
        WHERE role_name = 'WORKER';

    `;

    bcrypt.hash(req.body.password, salt, (err, hash) => {
        if (err) return res.status(500).json({ error: "Hashing failed" });

        const values = [
            req.body.name,
            req.body.email,
            req.body.phone,
            hash
        ];

        db.query(sql, values, (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: "User already exists or DB error" });
            }
            return res.json({ status: "Worker registered successfully" });
        });
    });
});


app.listen(8081, () => {
    console.log("DB connected")
})