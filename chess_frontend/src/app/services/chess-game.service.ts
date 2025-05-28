import { Injectable } from '@angular/core';
import { ChessPiece, PieceColor, PieceType } from '../models/chess-piece';
import { BehaviorSubject, firstValueFrom, Observable, Subject } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Game } from '../models/game';
import * as signalR from '@microsoft/signalr';
import { LoginService } from './login.service';

type Board = (ChessPiece | null)[][];
type MoveDto = { moveNumber: number; notation: string; player: number };

@Injectable({
  providedIn: 'root'
})
export class ChessGameService {
  private url = 'https://localhost:7189';
  private hubConnection!: signalR.HubConnection;

  private isConnected$ = new BehaviorSubject<boolean>(false);

  private colorAssigned$ = new BehaviorSubject<'w' | 'b' | null>(null);
  private currentTurn$ = new BehaviorSubject<'w' | 'b'>('w');

  private bothPlayersReady$ = new BehaviorSubject<boolean>(false);
  public bothPlayersReady = this.bothPlayersReady$.asObservable();
  private gameOverSource = new Subject<number>();
  gameOver$ = this.gameOverSource.asObservable();
  private lastSentMove: string | null = null;
  private gameCode = '';
  private moves: any = [];
  board: (ChessPiece | null)[][] = [];
  private boardSource = new BehaviorSubject<Board | null>(null);
  board$ = this.boardSource.asObservable();
  turn$ = this.currentTurn$.asObservable();

  constructor(private http: HttpClient, private userService: LoginService) {
    
  }

  createStartBoard(): Board {

    const board: Board = Array.from({ length: 8 },() => Array<ChessPiece | null>(8).fill(null));
    const place = (row: number, col: number,type: PieceType, color: PieceColor, id: string) => {board[row][col] = new ChessPiece(type, color, row, col, id);};

    for (let c = 0; c < 8; c++) {
      place(1, c, 'pawn', 'b', `bP${c + 1}`);
      place(6, c, 'pawn', 'w', `wP${c + 1}`);
    }

    place(0, 0, 'rook', 'b', 'bR1'); place(0, 7, 'rook', 'b', 'bR2');
    place(7, 0, 'rook', 'w', 'wR1'); place(7, 7, 'rook', 'w', 'wR2');

    place(0, 1, 'knight', 'b', 'bN1'); place(0, 6, 'knight', 'b', 'bN2');
    place(7, 1, 'knight', 'w', 'wN1'); place(7, 6, 'knight', 'w', 'wN2');

    place(0, 2, 'bishop', 'b', 'bB1'); place(0, 5, 'bishop', 'b', 'bB2');
    place(7, 2, 'bishop', 'w', 'wB1'); place(7, 5, 'bishop', 'w', 'wB2');

    place(0, 3, 'queen', 'b', 'bQ');
    place(7, 3, 'queen', 'w', 'wQ');

    place(0, 4, 'king', 'b', 'bK');
    place(7, 4, 'king', 'w', 'wK');

    return board;
  }

  private setBoard(b: Board){
    this.boardSource.next(b);
  }
  getBoard(): Board | null{
    return this.boardSource.value;
  }
private applyMove(notation: string): void {
  const board = this.boardSource.value;
  if (!board) return;
  const idx = notation.lastIndexOf('#');
  if (idx < 0) return;
  const movePart = notation.slice(0, idx);
  const pieceId  = notation.slice(idx + 1);

  const flat = board.flat().filter(p => p) as ChessPiece[];
  const pawn  = flat.find(p => p.id === pieceId);
  if (!pawn) return;
  const newBoard = board.map(r => r.slice());

  if (movePart === 'O-O' || movePart === 'O-O-O') {
    const row        = pawn.row;
    const kingside   = movePart === 'O-O';
    const kingToCol  = kingside ? 6 : 2;
    const rookFrom   = kingside ? 7 : 0;
    const rookToCol  = kingside ? 5 : 3;

    newBoard[row][pawn.col] = null;
    pawn.moveTo(row, kingToCol);
    newBoard[row][kingToCol] = pawn;
    const rook = newBoard[row][rookFrom]!;
    newBoard[row][rookFrom] = null;
    rook.moveTo(row, rookToCol);
    newBoard[row][rookToCol] = rook;

  } else {
    const promoMatch = movePart.match(/^([a-h]x)?([a-h][18])=([QRBN])$/);
    let promotion: PieceType | null = null;
    let dest = movePart.slice(-2);

    if (promoMatch) {
      dest = promoMatch[2];
      const P = promoMatch[3];
      promotion = P === 'Q' ? 'queen'
                : P === 'R' ? 'rook'
                : P === 'B' ? 'bishop'
                : 'knight';
    }

    const files  = ['a','b','c','d','e','f','g','h'];
    const toCol  = files.indexOf(dest[0]);
    const toRow  = 8 - parseInt(dest[1], 10);
    newBoard[pawn.row][pawn.col] = null;

    if (promotion) {
      const newId = `${pawn.id}-${promotion}`;
      newBoard[toRow][toCol] = new ChessPiece(promotion, pawn.color, toRow, toCol, newId);

    } else {
      pawn.moveTo(toRow, toCol);
      newBoard[toRow][toCol] = pawn;
    }
  }
  const next = this.currentTurn$.value === 'w' ? 'b' : 'w';
  this.currentTurn$.next(next);
  this.boardSource.next(newBoard);
}
  createGame(playerId: number): Observable<Game> {
    this.bothPlayersReady$.next(false);
    return this.http.post<Game>(
      `${this.url}/api/Game/CreateGame`,
      { creatorPlayerId: playerId },
      { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) }
    );
  }

  joinGame(gameCode: string, playerId: number): Observable<Game> {
    return this.http.post<Game>(
      `${this.url}/api/Game/JoinGame`,
      { PlayerId: playerId, GameCode: gameCode },
      { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) }
    );
  }

  getMoves(gameCode: string): Observable<any> {
    return this.http.get<MoveDto[]>(`${this.url}/api/Game/GetMoves/${gameCode}`);

  }

  async startConnection(gameId: string): Promise<void> {
    this.gameCode = gameId;
    let playerId = localStorage.getItem('playerId');
    const moves = await firstValueFrom(this.getMoves(gameId));
    const board = this.buildBoardFromHistory(this.createStartBoard(), moves);
    this.setBoard(board);
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${this.url}/chessHub`)
      .withAutomaticReconnect()
      .build();

    this.setupListeners();

    try {
      await this.hubConnection.start();
      this.isConnected$.next(true);
      this.bothPlayersReady$.next(false);
      await this.hubConnection.invoke('JoinGame', gameId, playerId);
    } catch (err) {
      this.isConnected$.next(false);
    }
  }

  async sendMove(gameId: string, userId: number, move: string): Promise<void> {
    if (!this.isMyTurn()) {
      console.warn("It's not your turn!");
      return;  
  }
    if (!this.hubConnection || this.hubConnection.state !== signalR.HubConnectionState.Connected) {
      await this.waitForConnection();
    }
    this.lastSentMove = move;
    this.applyMove(move);
    await this.hubConnection.invoke('MakeMove', gameId, userId, move)
      .catch((err) => {
        console.error('Error sending move:', err);
      });
  }

  private async waitForConnection(): Promise<void> {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (this.hubConnection.state === signalR.HubConnectionState.Connected) {
          clearInterval(interval);
          resolve();
        }
      }, 500);
    });
  }

  getPlayerColor(): 'w' | 'b' | null {
    return this.colorAssigned$.value;
  }
  getColorAssigned(): 'w' | 'b' | null {
    return this.colorAssigned$.value;
  }
  onColorReceived(callback: (color: 'w' | 'b') => void) {
    this.colorAssigned$.subscribe((c) => {
      if (c) callback(c);
    });
  }
  getCurrentTurn(): 'w' | 'b' {
    return this.currentTurn$.value;
  }
  isMyTurn(): boolean {
    const myColor = this.colorAssigned$.value;
    const currentTurn = this.currentTurn$.value;

    return myColor !== null && myColor === currentTurn;
  }
  notationToMove(notation: string,board: (ChessPiece|null)[][],currentPlayer: 'w'|'b'): { piece: ChessPiece, toRow: number, toCol: number, promotion?: PieceType, castlingDir?: 1|-1 } | null {
    if (notation.startsWith('O-O')) {
      const isQueenSide = notation.startsWith('O-O-O');
      const king = board.flat().find(p => p?.type === 'king' && p.color === currentPlayer)!;

      const fromRow = king.row;
      const fromCol = king.col;
      const castlingDir: 1|-1 = isQueenSide ? -1 : +1;
      const toCol = fromCol + 2 * castlingDir;

      return { piece: king, toRow: fromRow, toCol, castlingDir };
    }

    const [fullMove, pawnId] = notation.split('#');
    if (!pawnId) return null;

    const [movePart, promoPart] = fullMove.split('=');
    const file = movePart.slice(-2, -1);
    const rank = movePart.slice(-1);
    const toCol = 'abcdefgh'.indexOf(file);
    const toRow = 8 - parseInt(rank, 10);

    const piece = board.flat().find(p => p?.id === pawnId);
    if (!piece) return null;

    let promotion: PieceType|undefined;
    if (promoPart) {
      promotion = promoPart === 'Q' ? 'queen'
                : promoPart === 'R' ? 'rook'
                : promoPart === 'B' ? 'bishop'
                : 'knight';
    }

    return { piece, toRow, toCol, promotion };
  }
  cloneBoard(board: (ChessPiece | null)[][]): (ChessPiece | null)[][] {
    return board.map(row => row.map(square =>
        square ? Object.assign(
          Object.create(Object.getPrototypeOf(square)),
          square
        ) : null
      ));
  }
  getPlayers(gameCode: string): Observable<any> {
    return this.http.get<any>(`${this.url}/api/Game/GetPlayers/${gameCode}`);
  }
  promotionId(pawnId: string, type: PieceType): string {
    return `${pawnId}-${type}`;
  }
  buildBoardFromHistory(initialBoard: Board, moves: { notation: string }[]): Board {
    const board = this.cloneBoard(initialBoard);
    let turn: 'w'|'b' = 'w';

    for (const m of moves) {
      const decoded = this.notationToMove(m.notation, board, turn);
      if (!decoded) continue;

      const { piece, toRow, toCol, promotion, castlingDir } = decoded;
      board[piece.row][piece.col] = null;

      if (promotion) {
        const newId = this.promotionId(piece.id, promotion);
        board[toRow][toCol] = new ChessPiece(promotion, piece.color, toRow, toCol, newId);

      } else if (castlingDir) {
        piece.row = toRow;
        piece.col = toCol;
        board[toRow][toCol] = piece;
        const rookFromCol = castlingDir === 1 ? 7 : 0;
        const rookToCol   = castlingDir === 1 ? 5 : 3;
        const rook = board[toRow][rookFromCol]!;
        board[toRow][rookFromCol] = null;
        rook.row = toRow;
        rook.col = rookToCol;
        board[toRow][rookToCol] = rook;

      } else {
        piece.row = toRow;
        piece.col = toCol;
        board[toRow][toCol] = piece;
      }

      turn = turn === 'w' ? 'b' : 'w';
    }

    return board;
  }
  async notifyGameOver(gameCode: string, winnerId: number) {
    await this.hubConnection.invoke('EndGame', gameCode, winnerId);
  }
  private setupListeners() {
    this.hubConnection.on('ReceiveColor', (color: 'w' | 'b') => {
      this.colorAssigned$.next(color);
    });

    this.hubConnection.on('TurnChanged', (newTurn: 'w' | 'b') => {
      this.currentTurn$.next(newTurn);  
      
    });
    this.hubConnection.on('ReceiveMove', (notation: string) => {
      if (notation === this.lastSentMove) { return; }
      this.applyMove(notation);
    });
    this.hubConnection.on("GameReady", message => {
      this.bothPlayersReady$.next(true);
    });

    this.hubConnection.onclose(() => {
      console.warn('SignalR disconnected');
      this.isConnected$.next(false);
      this.bothPlayersReady$.next(false);
    });

    this.hubConnection.onreconnected(() => {
      this.isConnected$.next(true);
      if (this.gameCode) {
        this.hubConnection.invoke('RequestPlayerColor', this.gameCode);
      }
    });
    this.hubConnection.on('GameOver', (winnerId: number) => {
      this.gameOverSource.next(winnerId);
      this.bothPlayersReady$.next(false);
    });
  }
}