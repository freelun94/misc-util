import test from "node:test";
import assert from "node:assert/strict";
import { applyMove, createGame, getLegalMoves, GameRuleError } from "./game.js";

function emptyBoard() {
  return Array.from({ length: 10 }, () => Array(9).fill(null));
}

function place(board, x, y, side, type) {
  board[y][x] = { side, type };
}

function fixture() {
  const game = createGame("local", "測試棋局");
  game.board = emptyBoard();
  place(game.board, 4, 9, "red", "general");
  place(game.board, 4, 0, "black", "general");
  place(game.board, 4, 8, "red", "soldier");
  return game;
}

test("開局棋盤包含雙方各十六枚棋子", () => {
  const game = createGame("local", "測試棋局");
  assert.equal(game.board.flat().filter(Boolean).length, 32);
  assert.equal(getLegalMoves(game.board, "red").length > 0, true);
});

test("馬腿受阻時不可走過", () => {
  const game = fixture();
  place(game.board, 4, 5, "red", "horse");
  place(game.board, 4, 4, "red", "soldier");
  const moves = getLegalMoves(game.board, "red", { x: 4, y: 5 });
  assert.equal(moves.some((move) => move.to.x === 3 && move.to.y === 3), false);
  assert.equal(moves.some((move) => move.to.x === 5 && move.to.y === 3), false);
});

test("象不可過河，且象眼受阻時不能斜行", () => {
  const game = fixture();
  place(game.board, 4, 5, "red", "elephant");
  place(game.board, 3, 6, "red", "soldier");
  place(game.board, 4, 4, "red", "soldier");
  const moves = getLegalMoves(game.board, "red", { x: 4, y: 5 });
  assert.equal(moves.some((move) => move.to.x === 2 && move.to.y === 3), false);
  assert.equal(moves.some((move) => move.to.x === 6 && move.to.y === 7), true);
});

test("炮須隔一枚棋子才能吃子", () => {
  const game = fixture();
  place(game.board, 4, 5, "red", "cannon");
  place(game.board, 4, 2, "black", "soldier");
  let moves = getLegalMoves(game.board, "red", { x: 4, y: 5 });
  assert.equal(moves.some((move) => move.to.x === 4 && move.to.y === 2), false);

  place(game.board, 4, 4, "red", "soldier");
  moves = getLegalMoves(game.board, "red", { x: 4, y: 5 });
  assert.equal(moves.some((move) => move.to.x === 4 && move.to.y === 2), true);
});

test("將帥同線無阻隔時可飛將取勝", () => {
  const game = fixture();
  game.board[8][4] = null;
  const next = applyMove(game, { x: 4, y: 9 }, { x: 4, y: 0 });
  assert.equal(next.status, "finished");
  assert.equal(next.winner, "red");
  assert.equal(next.result, "紅方勝！");
});

test("不能走子令將帥照面", () => {
  const game = fixture();
  game.board[8][4] = null;
  place(game.board, 4, 5, "red", "horse");
  const moves = getLegalMoves(game.board, "red", { x: 4, y: 5 });
  assert.equal(moves.length, 0);
});

test("雙人模式允許落子後令己方將帥受將", () => {
  const game = fixture();
  game.board[8][4] = null;
  place(game.board, 4, 5, "red", "chariot");

  const next = applyMove(game, { x: 4, y: 5 }, { x: 3, y: 5 });
  assert.equal(next.status, "playing");
  assert.equal(next.inCheck, true);
});

test("人機模式仍拒絕令己方將帥受將的棋步", () => {
  const game = fixture();
  game.mode = "ai";
  game.board[8][4] = null;
  place(game.board, 4, 5, "red", "chariot");

  assert.throws(
    () => applyMove(game, { x: 4, y: 5 }, { x: 3, y: 5 }),
    GameRuleError
  );
});

test("非法棋步會被拒絕", () => {
  const game = createGame("local", "測試棋局");
  assert.throws(
    () => applyMove(game, { x: 0, y: 9 }, { x: 1, y: 8 }),
    GameRuleError
  );
});
