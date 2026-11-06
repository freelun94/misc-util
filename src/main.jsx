import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { getLegalMoves, PIECE_NAMES } from "./game.js";
import "./styles.css";

const SIDE_NAMES = { red: "紅方", black: "黑方" };
const MODE_NAMES = { local: "雙人對弈", ai: "人機對戰" };

async function request(path, body) {
  let response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  } catch {
    throw new Error("無法連接棋局服務，請確認服務已啟動。");
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || "棋局服務暫時無法使用。");
  return data;
}

function App() {
  const [game, setGame] = useState(null);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [undoStack, setUndoStack] = useState([]);

  const legalMoves = useMemo(() => {
    if (!game || !selected || game.status !== "playing") return [];
    return getLegalMoves(game.board, game.turn, selected, { allowSelfCheck: game.mode === "local" });
  }, [game, selected]);

  async function startGame(mode) {
    setBusy(true);
    setError("");
    try {
      const data = await request("/api/games", { mode });
      setGame(data.game);
      setSelected(null);
      setUndoStack([]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitMove(from, to) {
    setBusy(true);
    setError("");
    try {
      const data = await request(`/api/games/${game.id}/moves`, { game, from, to });
      setUndoStack((history) => [...history, game]);
      setGame(data.game);
      setSelected(null);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  function choosePoint(x, y) {
    if (!game || busy || game.status !== "playing") return;
    const piece = game.board[y][x];

    if (selected && legalMoves.some((move) => move.to.x === x && move.to.y === y)) {
      submitMove(selected, { x, y });
      return;
    }

    if (piece?.side === game.turn) {
      setSelected({ x, y });
    } else {
      setSelected(null);
    }
  }

  function undoMove() {
    if (busy || undoStack.length === 0) return;
    setGame(undoStack[undoStack.length - 1]);
    setUndoStack((history) => history.slice(0, -1));
    setSelected(null);
    setError("");
  }

  function returnToMenu() {
    if (busy) return;
    setGame(null);
    setSelected(null);
    setUndoStack([]);
    setError("");
  }

  const lastMove = game?.moves[game.moves.length - 1];
  const lastMoveHas = (x, y) =>
    lastMove && (
      (lastMove.from.x === x && lastMove.from.y === y) ||
      (lastMove.to.x === x && lastMove.to.y === y)
    );

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" onClick={(event) => { event.preventDefault(); returnToMenu(); }}>
          <span className="brand-seal" aria-hidden="true">棋</span>
          <span>楚河漢界</span>
        </a>
        <span className="topbar-caption">中國象棋</span>
      </header>

      {!game ? (
        <main className="menu">
          <div className="menu-ornament" aria-hidden="true">
            <span>帥</span><i>楚河漢界</i><span>將</span>
          </div>
          <p className="eyebrow">一局棋，半卷風雲</p>
          <h1>楚河漢界</h1>
          <p className="menu-intro">在方寸棋盤之間，落子從容，運籌帷幄。</p>

          <section className="mode-cards" aria-label="選擇遊戲模式">
            <button className="mode-card" onClick={() => startGame("local")} disabled={busy}>
              <span className="mode-icon">雙</span>
              <span className="mode-title">雙人對弈</span>
              <span className="mode-description">與身旁的對手輪流落子</span>
              <span className="mode-action">開始對局 <span aria-hidden="true">→</span></span>
            </button>
            <button className="mode-card" onClick={() => startGame("ai")} disabled={busy}>
              <span className="mode-icon">弈</span>
              <span className="mode-title">人機對戰</span>
              <span className="mode-description">執紅先行，挑戰電腦棋手</span>
              <span className="mode-action">開始對局 <span aria-hidden="true">→</span></span>
            </button>
          </section>

          {busy && <p className="notice">正在備好棋盤……</p>}
          {error && <p className="error-banner" role="alert">{error}</p>}
          <p className="menu-footnote">紅方先行・棋盤共九路十橫</p>
        </main>
      ) : (
        <main className="game-layout">
          <section className="board-column">
            <div className="game-heading">
              <div>
                <p className="eyebrow">{MODE_NAMES[game.mode]}</p>
                <h1>棋局進行中</h1>
              </div>
              <button className="text-button back-button" onClick={returnToMenu}>返回選單</button>
            </div>

            <div className={`turn-banner ${game.inCheck ? "turn-banner--check" : ""}`}>
              <span className={`turn-dot turn-dot--${game.turn}`} aria-hidden="true" />
              <span>{game.result}</span>
              {busy && <span className="thinking">電腦思考中…</span>}
            </div>

            <div className="board-frame">
              <div className="board" role="grid" aria-label="中國象棋棋盤">
                <svg className="board-lines" viewBox="0 0 9 10" preserveAspectRatio="none" aria-hidden="true">
                  {Array.from({ length: 9 }, (_, x) => (
                    <line key={`v-${x}`} x1={x + 0.5} y1="0.5" x2={x + 0.5} y2="9.5" />
                  ))}
                  {Array.from({ length: 5 }, (_, y) => (
                    <React.Fragment key={`h-${y}`}>
                      <line x1="0.5" y1={y + 0.5} x2="8.5" y2={y + 0.5} />
                      <line x1="0.5" y1={y + 5.5} x2="8.5" y2={y + 5.5} />
                    </React.Fragment>
                  ))}
                  <line x1="3.5" y1="0.5" x2="5.5" y2="2.5" />
                  <line x1="5.5" y1="0.5" x2="3.5" y2="2.5" />
                  <line x1="3.5" y1="7.5" x2="5.5" y2="9.5" />
                  <line x1="5.5" y1="7.5" x2="3.5" y2="9.5" />
                </svg>
                <div className="river-label river-label--left" aria-hidden="true">楚河</div>
                <div className="river-label river-label--right" aria-hidden="true">漢界</div>
                {game.board.map((row, y) => row.map((piece, x) => {
                  const isSelected = selected?.x === x && selected?.y === y;
                  const isTarget = legalMoves.some((move) => move.to.x === x && move.to.y === y);
                  return (
                    <button
                      key={`${x}-${y}`}
                      className={`intersection${isSelected ? " intersection--selected" : ""}${lastMoveHas(x, y) ? " intersection--last" : ""}`}
                      style={{ left: `${(x + 0.5) * (100 / 9)}%`, top: `${(y + 0.5) * 10}%` }}
                      onClick={() => choosePoint(x, y)}
                      role="gridcell"
                      aria-label={`${piece ? `${SIDE_NAMES[piece.side]}${PIECE_NAMES[piece.side][piece.type]}` : "空位"}，第${y + 1}橫，第${x + 1}路`}
                      aria-pressed={isSelected}
                      disabled={busy || game.status !== "playing"}
                    >
                      {isTarget && <span className={`move-mark${piece ? " move-mark--capture" : ""}`} aria-hidden="true" />}
                      {piece && (
                        <span className={`piece piece--${piece.side}`} aria-hidden="true">
                          {PIECE_NAMES[piece.side][piece.type]}
                        </span>
                      )}
                    </button>
                  );
                }))}
              </div>
            </div>
            <p className="board-hint">點選棋子，再點選標示位置即可落子</p>
          </section>

          <aside className="side-panel">
            <section className="panel-card players-card">
              <p className="panel-label">對弈雙方</p>
              <div className={`player-row ${game.turn === "red" && game.status === "playing" ? "player-row--active" : ""}`}>
                <span className="player-piece player-piece--red">帥</span>
                <span><strong>紅方</strong><small>{game.mode === "ai" ? "你執紅先行" : "先行"}</small></span>
                {game.turn === "red" && game.status === "playing" && <span className="active-tag">走棋</span>}
              </div>
              <div className="player-divider" />
              <div className={`player-row ${game.turn === "black" && game.status === "playing" ? "player-row--active" : ""}`}>
                <span className="player-piece player-piece--black">將</span>
                <span><strong>黑方</strong><small>{game.mode === "ai" ? "電腦棋手" : "後行"}</small></span>
                {game.turn === "black" && game.status === "playing" && <span className="active-tag">走棋</span>}
              </div>
              {game.status !== "playing" && <p className="result-banner">{game.result}</p>}
            </section>

            <section className="panel-card">
              <div className="panel-heading">
                <h2>行棋紀錄</h2>
                <span>{game.moves.length} 手</span>
              </div>
              <div className="move-list" aria-live="polite">
                {game.moves.length === 0 ? (
                  <p className="empty-state">棋局尚未開始落子</p>
                ) : (
                  <ol>
                    {game.moves.slice().reverse().map((move, index) => (
                      <li key={`${game.moves.length - index}-${move.notation}`}>
                        <span className="move-number">{game.moves.length - index}</span>
                        <span className={`move-side move-side--${move.side}`}>{SIDE_NAMES[move.side]}</span>
                        <span className="move-notation">{move.notation}</span>
                        {move.captured && <span className="capture-note">吃</span>}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </section>

            <section className="panel-card captured-card">
              <div className="panel-heading"><h2>已吃棋子</h2></div>
              <div className="captured-row">
                <span className="captured-label">紅方失子</span>
                <span className="captured-pieces">
                  {game.captured.filter((piece) => piece.side === "red").map((piece, index) => (
                    <span key={`red-${index}`} className="captured-piece captured-piece--red">{PIECE_NAMES.red[piece.type]}</span>
                  ))}
                  {!game.captured.some((piece) => piece.side === "red") && <span className="captured-empty">尚無</span>}
                </span>
              </div>
              <div className="captured-row">
                <span className="captured-label">黑方失子</span>
                <span className="captured-pieces">
                  {game.captured.filter((piece) => piece.side === "black").map((piece, index) => (
                    <span key={`black-${index}`} className="captured-piece captured-piece--black">{PIECE_NAMES.black[piece.type]}</span>
                  ))}
                  {!game.captured.some((piece) => piece.side === "black") && <span className="captured-empty">尚無</span>}
                </span>
              </div>
            </section>

            <section className="panel-card piece-guide">
              <div className="panel-heading"><h2>棋子一覽</h2></div>
              <p><span className="guide-red">帥・仕・相・傌・俥・炮・兵</span></p>
              <p><span className="guide-black">將・士・象・馬・車・砲・卒</span></p>
            </section>

            {error && <p className="error-banner" role="alert">{error}</p>}
            <div className="game-actions">
              <button className="secondary-button" onClick={undoMove} disabled={busy || undoStack.length === 0}>悔棋</button>
              <button className="primary-button" onClick={() => startGame(game.mode)} disabled={busy}>重新開始</button>
            </div>
            <p className="rules-note">棋規依中國象棋走法判定；人機模式由電腦即時應招。</p>
          </aside>
        </main>
      )}
      <footer className="footer">落子無悔，棋逢知己</footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
