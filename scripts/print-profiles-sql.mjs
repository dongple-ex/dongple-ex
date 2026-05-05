import fs from "node:fs";
import path from "node:path";

const sqlPath = path.resolve("scripts", "create-profiles.sql");
const sql = fs.readFileSync(sqlPath, "utf8");

console.log(sql);
