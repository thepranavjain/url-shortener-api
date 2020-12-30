require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const bodyParser = require("body-parser");
const mysql = require("mysql");
const urlPkg = require("url");
const { lookup } = require("dns").promises;
const { promisify } = require("util");

// Basic Configuration
const port = process.env.PORT || 3000;

const db = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});
db.connect((err, args) => {
  if (err) {
    console.error(err.message);
    throw err;
  }
  console.log(`Connected to MySQL Database`);
});

const query = promisify(db.query).bind(db);

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));

app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Your first API endpoint
app.get("/api/hello", (req, res) => {
  res.json({ greeting: "hello API" });
});

// URL Regex source - https://stackoverflow.com/a/3809435
const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/gi;

app.post("/api/shorturl/new", async (req, res) => {
  try {
    let { url } = req.body;

    // Validate url
    if (typeof url !== "string") throw new Error();
    url = url.trim();
    if (!urlRegex.test(url)) throw new Error();
    const urlObj = new urlPkg.URL(url);

    // dns lookup before storing url
    // replace http or https before doing the dns lookup
    // this will throw an error if the url is not found
    await lookup(urlObj.host);

    // Check if url already exists in the db
    const queryUrlExistsAlready = `SELECT * FROM url.short_urls WHERE url = ?;`;
    let results = await query(queryUrlExistsAlready, [url]);
    if (results.length === 0) {
      const queryCreateShortUrl = `INSERT INTO url.short_urls (url) VALUES (?);`;
      await query(queryCreateShortUrl, [url]);
      results = await query(queryUrlExistsAlready, [url]);
    }
    const { _id } = results[0];
    res.json({ original_url: url, short_url: _id });
  } catch (err) {
    res.json({ error: "invalid url" });
  }
});

app.get("/api/shorturl/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw new Error("Wrong format");
    const queryGetShortUrl = `SELECT * FROM url.short_urls WHERE _id = ?;`;
    let results = await query(queryGetShortUrl, [id]);
    if (results.length === 0) throw new Error("not found");
    const { url } = results[0];
    res.redirect(url);
  } catch (err) {
    if (err.message === "not found")
      res.json({ error: "No short URL found for the given input" });
    else res.json({ error: "Wrong format" });
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
