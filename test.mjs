import assert from "node:assert/strict";
import { addItem, toggle, remove, archive, suggestions } from "./app.js";

const s = { items: [], history: {} };
addItem(s, "Milk"); addItem(s, " milk "); addItem(s, "eggs");
assert.equal(s.items.length, 2, "dedupe by case/space");
assert.deepEqual(suggestions(s), ["milk", "eggs"], "ranked by count");

toggle(s, "Milk");
assert.ok(s.items[0].doneAt, "toggle marks done");
addItem(s, "milk");
assert.equal(s.items[0].doneAt, null, "re-add un-dones");

const yesterday = new Date(Date.now() - 864e5).toISOString();
s.items.push({ name: "old", doneAt: yesterday });
toggle(s, "eggs");
archive(s);
assert.deepEqual(s.items.map((i) => i.name), ["Milk", "eggs"], "archive drops yesterday, keeps today");

remove(s, "eggs");
assert.deepEqual(s.items.map((i) => i.name), ["Milk"]);
assert.equal(s.history.eggs, 1, "remove keeps history");
console.log("ok");
