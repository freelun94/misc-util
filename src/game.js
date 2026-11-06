export const PIECE_NAMES = {
  red: {
    general: "帥",
    advisor: "仕",
    elephant: "相",
    horse: "傌",
    chariot: "俥",
    cannon: "炮",
    soldier: "兵"
  },
  black: {
    general: "將",
    advisor: "士",
    elephant: "象",
    horse: "馬",
    chariot: "車",
    cannon: "砲",
    soldier: "卒"
  }
};

const FILE_NUMERALS = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];
const MOVE_NUMERALS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
const PIECE_VALUES = {
  general: 10000,
  chariot: 600,
  cannon: 300,
  horse: 300,
  advisor: 120,
  elephant: 120,
  soldier: 70
};
const PIECE_TYPES = new Set(Object.keys(PIECE_VALUES));

export class GameRuleError extends Error {}

function isInside(x, y) {
  return x >= 0 && x < 9 && y >= 0 && y < 10;
}

function otherSide(side) {
  return side === "red" ? "black" : "red";
}

function inPalace(side, x, y) {
  return x >= 3 && x <= 5 && (side === "red" ? y >= 7 && y <= 9 : y >= 0 && y <= 2);
}

function copyBoard(board) {
  return board.map((row) => row.map((piece) => piece && { ...piece }));
}

function makePiece(side, type) {
  return { side, type };
}

export function createGame(mode, id) {
  if (mode !== "local" && mode !== "ai") {
    throw new GameRuleError("請選擇有效的遊戲模式。");
  }

  const board = Array.from({ length: 10 }, () => Array(9).fill(null));
  const backRow = ["chariot", "horse", "elephant", "advisor", "general", "advisor", "elephant", "horse", "chariot"];

  backRow.forEach((type, x) => {
    board[0][x] = makePiece("black", type);
    board[9][x] = makePiece("red", type);
  });

  [1, 7].forEach((x) => {
    board[2][x] = makePiece("black", "cannon");
    board[7][x] = makePiece("red", "cannon");
  });

  [0, 2, 4, 6, 8].forEach((x) => {
    board[3][x] = makePiece("black", "soldier");
    board[6][x] = makePiece("red", "soldier");
  });

  return {
    id,
    mode,
    board,
    turn: "red",
    status: "playing",
    winner: null,
    inCheck: false,
    result: "輪到紅方走棋",
    moves: [],
    captured: []
  };
}

export function isValidGameState(game) {
  return Boolean(
    game &&
    typeof game.id === "string" &&
    game.id.length > 0 &&
    (game.mode === "local" || game.mode === "ai") &&
    (game.turn === "red" || game.turn === "black") &&
    ["playing", "finished", "draw"].includes(game.status) &&
    (game.winner === null || game.winner === "red" || game.winner === "black") &&
    typeof game.inCheck === "boolean" &&
    typeof game.result === "string" &&
    Array.isArray(game.board) &&
    game.board.length === 10 &&
    game.board.every((row) =>
      Array.isArray(row) &&
      row.length === 9 &&
      row.every((piece) =>
        piece === null ||
        (piece &&
          (piece.side === "red" || piece.side === "black") &&
          PIECE_TYPES.has(piece.type))
      )
    ) &&
    Array.isArray(game.moves) &&
    game.moves.length <= 512 &&
    Array.isArray(game.captured) &&
    game.captured.length <= 32
  );
}

function addDestination(board, piece, moves, x, y) {
  if (!isInside(x, y)) return;
  const target = board[y][x];
  if (!target || target.side !== piece.side) moves.push({ x, y });
}

function pseudoMoves(board, x, y) {
  const piece = board[y]?.[x];
  if (!piece) return [];

  const moves = [];
  const add = (toX, toY) => addDestination(board, piece, moves, toX, toY);

  if (piece.type === "general") {
    [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([dx, dy]) => {
      const toX = x + dx;
      const toY = y + dy;
      if (inPalace(piece.side, toX, toY)) add(toX, toY);
    });

    for (let scanY = y + (piece.side === "red" ? -1 : 1); isInside(x, scanY); scanY += piece.side === "red" ? -1 : 1) {
      const target = board[scanY][x];
      if (!target) continue;
      if (target.side !== piece.side && target.type === "general") moves.push({ x, y: scanY });
      break;
    }
  } else if (piece.type === "advisor") {
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dy]) => {
      const toX = x + dx;
      const toY = y + dy;
      if (inPalace(piece.side, toX, toY)) add(toX, toY);
    });
  } else if (piece.type === "elephant") {
    [[-2, -2], [2, -2], [-2, 2], [2, 2]].forEach(([dx, dy]) => {
      const toX = x + dx;
      const toY = y + dy;
      const crossedRiver = piece.side === "red" ? toY < 5 : toY > 4;
      if (!isInside(toX, toY) || crossedRiver || board[y + dy / 2][x + dx / 2]) return;
      add(toX, toY);
    });
  } else if (piece.type === "horse") {
    [
      [-1, -2, 0, -1], [1, -2, 0, -1],
      [-1, 2, 0, 1], [1, 2, 0, 1],
      [-2, -1, -1, 0], [-2, 1, -1, 0],
      [2, -1, 1, 0], [2, 1, 1, 0]
    ].forEach(([dx, dy, legX, legY]) => {
      const toX = x + dx;
      const toY = y + dy;
      if (isInside(toX, toY) && !board[y + legY][x + legX]) add(toX, toY);
    });
  } else if (piece.type === "chariot" || piece.type === "cannon") {
    [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([dx, dy]) => {
      let screened = false;
      for (let toX = x + dx, toY = y + dy; isInside(toX, toY); toX += dx, toY += dy) {
        const target = board[toY][toX];
        if (piece.type === "chariot") {
          if (!target) {
            moves.push({ x: toX, y: toY });
          } else {
            if (target.side !== piece.side) moves.push({ x: toX, y: toY });
            break;
          }
        } else if (!screened) {
          if (!target) {
            moves.push({ x: toX, y: toY });
          } else {
            screened = true;
          }
        } else if (target) {
          if (target.side !== piece.side) moves.push({ x: toX, y: toY });
          break;
        }
      }
    });
  } else if (piece.type === "soldier") {
    const forward = piece.side === "red" ? -1 : 1;
    add(x, y + forward);
    const crossedRiver = piece.side === "red" ? y <= 4 : y >= 5;
    if (crossedRiver) {
      add(x - 1, y);
      add(x + 1, y);
    }
  }

  return moves;
}

function findGeneral(board, side) {
  for (let y = 0; y < 10; y += 1) {
    for (let x = 0; x < 9; x += 1) {
      const piece = board[y][x];
      if (piece?.side === side && piece.type === "general") return { x, y };
    }
  }
  return null;
}

function isSquareAttacked(board, x, y, bySide) {
  for (let fromY = 0; fromY < 10; fromY += 1) {
    for (let fromX = 0; fromX < 9; fromX += 1) {
      const piece = board[fromY][fromX];
      if (piece?.side !== bySide) continue;
      if (pseudoMoves(board, fromX, fromY).some((move) => move.x === x && move.y === y)) return true;
    }
  }
  return false;
}

export function isInCheck(board, side) {
  const general = findGeneral(board, side);
  return !general || isSquareAttacked(board, general.x, general.y, otherSide(side));
}

function moveLeavesKingSafe(board, from, to, side) {
  const nextBoard = copyBoard(board);
  nextBoard[to.y][to.x] = nextBoard[from.y][from.x];
  nextBoard[from.y][from.x] = null;
  return !isInCheck(nextBoard, side);
}

export function getLegalMoves(board, side, from = null, { allowSelfCheck = false } = {}) {
  const legalMoves = [];
  for (let y = 0; y < 10; y += 1) {
    for (let x = 0; x < 9; x += 1) {
      const piece = board[y][x];
      if (piece?.side !== side || (from && (from.x !== x || from.y !== y))) continue;
      pseudoMoves(board, x, y).forEach((to) => {
        const start = { x, y };
        if (allowSelfCheck || moveLeavesKingSafe(board, start, to, side)) {
          legalMoves.push({ from: start, to });
        }
      });
    }
  }
  return legalMoves;
}

function chineseNumeral(number) {
  return MOVE_NUMERALS[number] ?? String(number);
}

function notationFor(piece, from, to) {
  const file = (x) => FILE_NUMERALS[piece.side === "red" ? 8 - x : x];
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const forward = piece.side === "red" ? -dy : dy;
  let action;
  let amount;

  if (dy === 0) {
    action = "平";
    amount = file(to.x);
  } else {
    action = forward > 0 ? "進" : "退";
    amount = dx === 0 ? chineseNumeral(Math.abs(dy)) : file(to.x);
  }

  return `${PIECE_NAMES[piece.side][piece.type]}${file(from.x)}${action}${amount}`;
}

function updateStatus(game, capturedGeneral = false) {
  if (capturedGeneral) {
    game.status = "finished";
    game.winner = otherSide(game.turn);
    game.inCheck = false;
    game.result = `${game.winner === "red" ? "紅方" : "黑方"}勝！`;
    return game;
  }

  game.inCheck = isInCheck(game.board, game.turn);
  const hasMoves = getLegalMoves(
    game.board,
    game.turn,
    null,
    { allowSelfCheck: game.mode === "local" }
  ).length > 0;
  if (!hasMoves) {
    if (game.mode === "local") {
      game.status = "draw";
      game.winner = null;
      game.result = "雙方和棋";
    } else if (game.inCheck) {
      game.status = "finished";
      game.winner = otherSide(game.turn);
      game.result = `將軍！${game.winner === "red" ? "紅方" : "黑方"}勝！`;
    } else {
      game.status = "draw";
      game.winner = null;
      game.result = "雙方和棋";
    }
    return game;
  }

  game.result = game.inCheck
    ? `將軍！輪到${game.turn === "red" ? "紅方" : "黑方"}走棋`
    : `輪到${game.turn === "red" ? "紅方" : "黑方"}走棋`;
  return game;
}

export function applyMove(game, from, to) {
  if (
    !from || !to ||
    !Number.isInteger(from.x) || !Number.isInteger(from.y) ||
    !Number.isInteger(to.x) || !Number.isInteger(to.y) ||
    !isInside(from.x, from.y) || !isInside(to.x, to.y)
  ) {
    throw new GameRuleError("棋步座標無效。");
  }
  if (game.status !== "playing") throw new GameRuleError("棋局已結束，請重新開始。");

  const piece = game.board[from.y][from.x];
  if (!piece || piece.side !== game.turn) throw new GameRuleError("請選擇輪到的一方棋子。");
  if (!getLegalMoves(game.board, game.turn, from, { allowSelfCheck: game.mode === "local" })
    .some((move) => move.to.x === to.x && move.to.y === to.y)) {
    throw new GameRuleError("此著法不符合棋規。");
  }

  const board = copyBoard(game.board);
  const capturedPiece = board[to.y][to.x];
  board[to.y][to.x] = board[from.y][from.x];
  board[from.y][from.x] = null;

  const nextGame = {
    ...game,
    board,
    turn: otherSide(game.turn),
    moves: [
      ...game.moves,
      {
        side: game.turn,
        piece: piece.type,
        from: { ...from },
        to: { ...to },
        captured: capturedPiece ? { ...capturedPiece } : null,
        notation: notationFor(piece, from, to)
      }
    ],
    captured: capturedPiece ? [...game.captured, capturedPiece] : [...game.captured]
  };

  return updateStatus(nextGame, capturedPiece?.type === "general");
}

function captureValue(board, move) {
  const target = board[move.to.y][move.to.x];
  return target ? PIECE_VALUES[target.type] : 0;
}

function evaluate(board, perspective) {
  let score = 0;
  for (let y = 0; y < 10; y += 1) {
    for (let x = 0; x < 9; x += 1) {
      const piece = board[y][x];
      if (!piece) continue;
      let value = PIECE_VALUES[piece.type];
      if (piece.type === "soldier") {
        const advanced = piece.side === "red" ? 6 - y : y - 3;
        value += Math.max(0, advanced) * 7;
        if (piece.side === "red" ? y <= 4 : y >= 5) value += 25;
      }
      score += piece.side === perspective ? value : -value;
    }
  }
  return score;
}

function minimax(board, side, depth, alpha, beta, perspective, ply) {
  const moves = getLegalMoves(board, side);
  if (moves.length === 0) {
    if (!isInCheck(board, side)) return 0;
    return side === perspective ? -100000 + ply : 100000 - ply;
  }
  if (depth === 0) return evaluate(board, perspective);

  moves.sort((a, b) => captureValue(board, b) - captureValue(board, a));
  const maximizing = side === perspective;
  let best = maximizing ? -Infinity : Infinity;

  for (const move of moves) {
    const nextBoard = copyBoard(board);
    nextBoard[move.to.y][move.to.x] = nextBoard[move.from.y][move.from.x];
    nextBoard[move.from.y][move.from.x] = null;
    const score = minimax(nextBoard, otherSide(side), depth - 1, alpha, beta, perspective, ply + 1);
    if (maximizing) {
      best = Math.max(best, score);
      alpha = Math.max(alpha, best);
    } else {
      best = Math.min(best, score);
      beta = Math.min(beta, best);
    }
    if (beta <= alpha) break;
  }

  return best;
}

export function chooseBestMove(board, side) {
  const moves = getLegalMoves(board, side);
  if (moves.length === 0) return null;

  moves.sort((a, b) => captureValue(board, b) - captureValue(board, a));
  let bestMove = moves[0];
  let bestScore = -Infinity;
  let alpha = -Infinity;

  for (const move of moves) {
    const nextBoard = copyBoard(board);
    nextBoard[move.to.y][move.to.x] = nextBoard[move.from.y][move.from.x];
    nextBoard[move.from.y][move.from.x] = null;
    const score = minimax(nextBoard, otherSide(side), 1, alpha, Infinity, side, 1);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
    alpha = Math.max(alpha, bestScore);
  }

  return bestMove;
}
