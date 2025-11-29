import type { Board, GameMove, Player } from "./types.js";

export class TicTacToeGame {
  private board: Board;
  private currentPlayer: Player;
  private moves: GameMove[];

  constructor() {
    this.board = this.createEmptyBoard();
    this.currentPlayer = "X";
    this.moves = [];
  }

  private createEmptyBoard(): Board {
    return [
      [null, null, null],
      [null, null, null],
      [null, null, null],
    ];
  }

  getCurrentPlayer(): Player {
    return this.currentPlayer;
  }

  getBoard(): Board {
    return this.board.map((row) => [...row]);
  }

  getBoardString(): string {
    return this.board
      .map((row) => row.map((cell) => cell || "-").join(" "))
      .join("\n");
  }

  getMoves(): GameMove[] {
    return [...this.moves];
  }

  isValidMove(row: number, col: number): boolean {
    if (row < 0 || row > 2 || col < 0 || col > 2) {
      return false;
    }
    return this.board[row][col] === null;
  }

  makeMove(row: number, col: number): boolean {
    if (!this.isValidMove(row, col)) {
      return false;
    }

    this.board[row][col] = this.currentPlayer;
    this.moves.push({
      player: this.currentPlayer,
      row,
      col,
      timestamp: Date.now(),
    });

    this.currentPlayer = this.currentPlayer === "X" ? "O" : "X";
    return true;
  }

  checkWinner(): Player | "draw" | null {
    // Check rows
    for (let row = 0; row < 3; row++) {
      if (
        this.board[row][0] &&
        this.board[row][0] === this.board[row][1] &&
        this.board[row][1] === this.board[row][2]
      ) {
        return this.board[row][0] as Player;
      }
    }

    // Check columns
    for (let col = 0; col < 3; col++) {
      if (
        this.board[0][col] &&
        this.board[0][col] === this.board[1][col] &&
        this.board[1][col] === this.board[2][col]
      ) {
        return this.board[0][col] as Player;
      }
    }

    // Check diagonals
    if (
      this.board[0][0] &&
      this.board[0][0] === this.board[1][1] &&
      this.board[1][1] === this.board[2][2]
    ) {
      return this.board[0][0] as Player;
    }

    if (
      this.board[0][2] &&
      this.board[0][2] === this.board[1][1] &&
      this.board[1][1] === this.board[2][0]
    ) {
      return this.board[0][2] as Player;
    }

    // Check for draw
    const isFull = this.board.every((row) =>
      row.every((cell) => cell !== null)
    );
    if (isFull) {
      return "draw";
    }

    return null;
  }

  isGameOver(): boolean {
    return this.checkWinner() !== null;
  }

  reset(): void {
    this.board = this.createEmptyBoard();
    this.currentPlayer = "X";
    this.moves = [];
  }
}
