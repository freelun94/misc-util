import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import app from "./app.js";

let server;
let origin;

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

async function create(mode) {
  const response = await fetch(`${origin}/api/games`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode })
  });
  return { response, data: await response.json() };
}

test("建立棋局並在紅方落子後由伺服器回應電腦棋步", async () => {
  const { response, data } = await create("ai");
  assert.equal(response.status, 201);

  const moveResponse = await fetch(`${origin}/api/games/${data.game.id}/moves`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      game: data.game,
      from: { x: 0, y: 6 },
      to: { x: 0, y: 5 }
    })
  });
  const moveData = await moveResponse.json();

  assert.equal(moveResponse.status, 200);
  assert.equal(moveData.lastMoves.length, 2);
  assert.equal(moveData.game.moves.length, 2);
  assert.equal(moveData.game.turn, "red");
});

test("伺服器拒絕不符合棋規的棋步", async () => {
  const { data } = await create("local");
  const response = await fetch(`${origin}/api/games/${data.game.id}/moves`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      game: data.game,
      from: { x: 0, y: 9 },
      to: { x: 1, y: 8 }
    })
  });

  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "此著法不符合棋規。");
});

test("伺服器拒絕未支援的遊戲模式", async () => {
  const { response, data } = await create("invalid");
  assert.equal(response.status, 400);
  assert.equal(data.error, "請選擇有效的遊戲模式。");
});
