import express from "express";
import { randomUUID } from "node:crypto";
import {
  applyMove,
  chooseBestMove,
  createGame,
  GameRuleError,
  isValidGameState
} from "../src/game.js";

const app = express();

app.use(express.json({ limit: "64kb" }));

app.post("/api/games", (request, response) => {
  const { mode } = request.body ?? {};
  if (mode !== "local" && mode !== "ai") {
    response.status(400).json({ error: "請選擇有效的遊戲模式。" });
    return;
  }

  response.status(201).json({ game: createGame(mode, randomUUID()) });
});

app.post("/api/games/:id/moves", (request, response) => {
  const { game, from, to } = request.body ?? {};
  if (!isValidGameState(game) || game.id !== request.params.id) {
    response.status(400).json({ error: "棋局資料無效，請重新開始。" });
    return;
  }

  if (game.mode === "ai" && game.turn !== "red") {
    response.status(403).json({ error: "現在不是紅方的回合。" });
    return;
  }

  try {
    let updatedGame = applyMove(game, from, to);
    const lastMoves = [updatedGame.moves[updatedGame.moves.length - 1]];

    if (updatedGame.mode === "ai" && updatedGame.status === "playing") {
      const aiMove = chooseBestMove(updatedGame.board, updatedGame.turn);
      if (aiMove) {
        updatedGame = applyMove(updatedGame, aiMove.from, aiMove.to);
        lastMoves.push(updatedGame.moves[updatedGame.moves.length - 1]);
      }
    }

    response.json({ game: updatedGame, lastMoves });
  } catch (error) {
    if (error instanceof GameRuleError) {
      response.status(400).json({ error: error.message });
      return;
    }

    console.error("處理棋步時發生錯誤：", error);
    response.status(500).json({ error: "棋局處理失敗，請稍後再試。" });
  }
});

app.use((request, response) => {
  response.status(404).json({ error: "找不到這項棋局服務。" });
});

app.use((error, request, response, next) => {
  if (error instanceof SyntaxError && "body" in error) {
    response.status(400).json({ error: "棋局資料格式錯誤。" });
    return;
  }

  console.error("象棋服務發生錯誤：", error);
  response.status(500).json({ error: "服務暫時無法使用，請稍後再試。" });
});

export default app;
