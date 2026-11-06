Act as an expert full-stack developer and UI/UX designer. Create a new page and build a complete, playable Chinese Chess (Xiangqi / 中國象棋) game using React (Vite) for the frontend and Node.js (Express) for the backend.

Please structure the application with a traditional Chinese visual interface and standard client/server architecture based on the following requirements:

1. Game Modes (遊戲模式):
- Implement a Start/Menu Screen entirely in Traditional Chinese allowing the user to choose between two modes:
  1. 雙人對弈 (Local 2-Player): Two human players take turns on the same screen (Red vs. Black).
  2. 人機對戰 (Player vs. AI): A single human player plays as Red (紅方) against a server-driven AI playing as Black (黑方).

2. Round Chess Piece Design (棋子) & UI Layout:
- Piece Shape: Every chess piece must be strictly round (circular shape) using responsive layout rules (e.g., rounded-full).
- Piece Aesthetics: Give the round pieces a dimensional, physical look using CSS shadows, borders, or gradients to mimic traditional carved wooden tokens with beveled edges and a slightly recessed center where the character sits.
- Piece Characters (Traditional Nomenclature): Render the standard Traditional Chinese characters precisely centered inside the round shapes using distinct colors and characters for each side:
  * Red Side (Red Text): 帥 (General), 仕 (Advisor), 相 (Elephant), 傌 (Horse), 俥 (Chariot), 炮 (Cannon), 兵 (Soldier)
  * Black Side (Black Text): 將 (General), 士 (Advisor), 象 (Elephant), 馬 (Horse), 車 (Chariot), 砲 (Cannon), 卒 (Soldier)
- Board Styling: Design a 9x10 grid board using a traditional parchment or wooden texture background.
- River (楚河 漢界): The central river space must clearly display the traditional calligraphy characters "楚河" on the left and "漢界" on the right, written horizontally in Traditional Chinese characters.
- Palaces (九宮): The 3x3 diagonal lines for the starter palaces must be correctly drawn for both sides.
- Language Localization: Every single text string in the entire system must use Traditional Chinese (繁體中文). Do not use any Simplified Chinese characters (e.g., use 雙人對弈, 人機對戰, 將軍 for Check, 雙方和棋 for Stalemate, 紅方勝 for Red Wins, 悔棋 for Undo, 重新開始 for Restart).

3. Game Logic & AI Backend:
- Rules: Implement full movement constraints for all 7 piece types, including the "Flying General" rule (王不見王 / 飛將) and movement boundaries (仕/帥 stay in 九宮, 相 cannot cross the river).
- Node.js Backend: Expose REST API endpoints to:
  - Initialize a game session with the chosen mode.
  - Validate and process human player moves (coordinates from-x, from-y to to-x, to-y).
  - Handle AI Move Generation: For the "人機對戰" mode, when a human player finishes their turn, the server must automatically calculate and return the AI's best next move. Implement a lightweight Minimax algorithm with basic material evaluation or a prioritized random valid move generator if Minimax is too heavy.

4. Frontend Integration:
- React: Implement smooth drag-and-drop or click-to-move interactions for the round pieces. Highlight valid positions in a subtle traditional ink-bleed or soft glowing circle effect when a piece is selected. Maintain state for active turn, game mode, captured pieces, and move history (formatted in traditional move notation).

Provide the complete file structure and full code for the main frontend components (including the menu screen), backend server file, AI logic, and the core validation system. All UI elements, comments, and logs intended for the user must be in Traditional Chinese.
