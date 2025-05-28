import { Component, Input, Output, ChangeDetectorRef, EventEmitter, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { from, Subscription } from 'rxjs';
import { ChessPiece, PieceType } from 'src/app/models/chess-piece';
import { ChessGameService } from 'src/app/services/chess-game.service';
import { LoginService } from 'src/app/services/login.service';

@Component({
  selector: 'app-chess-board',
  templateUrl: './chess-board.component.html',
  styleUrls: ['./chess-board.component.scss']
})
export class ChessBoardComponent implements OnInit {
  @Input() board: any[][] = [];
  @Input() currentPlayer: 'w' | 'b' | null = null;
  @Input() gameCode: string | null = null;
  @Output() boardChange = new EventEmitter<any[][]>();
  @Output() newMove = new EventEmitter<string>();

  selectedPiece: { row: number, col: number } | null = null;
  enPassantSquare: { row: number, col: number } | null = null;
  promotionOptions: Array<'queen' | 'rook' | 'bishop' | 'knight'> = ['queen', 'rook', 'bishop', 'knight'];
  isPromotion = false;
  myPromotion = false;
  isMyTurn = false;
  opponentPromotion = false;
  promotionSquare: { row: number, col: number } | null = null;
  promotionSquareFrom: { row: number, col: number } | null = null;
  highlightedMoves: Array<{ row: number; col: number }> = [];
  dragValidMoves: Array<{ row: number; col: number }> = [];
  bothPlayersReady: boolean = false;
  myName: string = '';
  opponentName: string = '';
  myPicture: string = '';
  opponentPicture: string = '';
  gameFinished: boolean = false;
  gameWinnerId: number | null = null;
  private promotionNotationCache: string | null = null;
  private sub = new Subscription();
  constructor(private chessGameService: ChessGameService, public userService: LoginService, private router: Router) {

  }

  ngOnInit() {
    this.chessGameService.bothPlayersReady.subscribe((bothPlayersReady) => {
      if (bothPlayersReady) {
        this.bothPlayersReady = bothPlayersReady;
        this.chessGameService.getPlayers(this.gameCode!).subscribe(p => {
          const myusername = this.userService.getUserProfile()?.username;
          const ids: number[] = [];
          if (p.playerWhiteId) ids.push(p.playerWhiteId);
          if (p.playerBlackId) ids.push(p.playerBlackId);

          ids.forEach(id => {
            this.userService.getProfileNameAndPicture(id).subscribe(u => {
              let profilePicture = "https://localhost:7189/" + u.profilePicture;
              if (u.userName === myusername) {
                this.myName = u.userName;
                this.myPicture = profilePicture;
              } else {
                this.opponentName = u.userName;
                this.opponentPicture = profilePicture;
              }
            });
          });
        });
        }
    });
    this.sub.add(this.chessGameService.gameOver$.subscribe(winnerId => {
      this.gameFinished = true;
      this.gameWinnerId = winnerId;
    }));
    this.chessGameService.turn$.subscribe(turn => {
      this.isMyTurn = (turn === this.currentPlayer);
    });
    this.userService.getProfileNameAndPicture(this.userService.getUserProfile()!.userId).subscribe(u => {
      this.myName = u.userName;
      this.myPicture = "https://localhost:7189/" + u.profilePicture;
    }
    );
  }

  applyMove(move: string) {
    const moveData = this.chessGameService.notationToMove(move, this.board, this.getOpponentColor());
    if (moveData) {
      const { piece, toRow, toCol } = moveData;
      this.movePiece(piece.row, piece.col, toRow, toCol, true);
    }
  }
  getOpponentColor() {
    return this.currentPlayer === 'w' ? 'b' : 'w';
  }
  updateTurnStatus() {
    this.isMyTurn = this.chessGameService.isMyTurn();
  }
  onCellClick(rowIndex: number, colIndex: number) {
    const clickedPiece = this.board[rowIndex][colIndex];
    if (!this.selectedPiece) {
      if (clickedPiece) {
        this.selectedPiece = { row: rowIndex, col: colIndex };
        this.highlightedMoves = this.getAllPossibleMoves(clickedPiece);
      }
    } 
    else {
      const isLegal = this.highlightedMoves.some(move => move.row === rowIndex && move.col === colIndex);
      if (isLegal) {
        this.movePiece(this.selectedPiece.row,this.selectedPiece.col,rowIndex,colIndex);
      }
      else{
        this.selectedPiece = clickedPiece ? { row: rowIndex, col: colIndex } : null;
        this.highlightedMoves = this.selectedPiece ? this.getAllPossibleMoves(clickedPiece) : [];
      }

    }
  }

  getAllPossibleMoves(piece: ChessPiece): Array<{ row: number; col: number }> {
    const moves = [];
    if(!this.isMyTurn || !this.bothPlayersReady) return [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (r === piece.row && c === piece.col) continue;

        if (this.isMoveLegal(piece, this.board, r, c, this.currentPlayer)) {
          moves.push({ row: r, col: c });
        }
      }
    }
    return moves;
  }

  isHighlighted(r: number, c: number) {
    return this.highlightedMoves.some(m => m.row === r && m.col === c);
  }

  movePiece(fromRow: number, fromCol: number, toRow: number, toCol: number, applyMove = false) {
    const newBoard = this.board.map(row => [...row]);
    const piece = newBoard[fromRow][fromCol];
    if (!piece) return;
    var move = this.moveToNotation(piece, toRow, toCol, newBoard);
    const isPawnPromotion = piece.type === 'pawn' && ((piece.color === 'w' && toRow === 0) || (piece.color === 'b' && toRow === 7));
    if(!applyMove && !isPawnPromotion) this.newMove.emit(move);

    piece.moveTo(toRow, toCol);
    newBoard[toRow][toCol] = piece;
    newBoard[fromRow][fromCol] = null;

    if (isPawnPromotion) {
      this.isPromotion = true;
      this.promotionNotationCache = piece.id;
      this.promotionSquare = { row: toRow, col: toCol };
      this.promotionSquareFrom = { row: fromRow, col: fromCol };
      if (piece.color === 'w') {
        this.myPromotion = true;
        this.opponentPromotion = false;
      }
      else {
        this.myPromotion = false;
        this.opponentPromotion = true;
      }
      
    }

    this.highlightedMoves = [];
    if (piece.type === 'pawn' && Math.abs(toCol - fromCol) === 1 && this.board[toRow][toCol] === null&& this.enPassantSquare&& this.enPassantSquare.row === toRow && this.enPassantSquare.col === toCol){
      const direction = (piece.color === 'w') ? -1 : 1;
      const capturedRow = toRow - direction;
      const capturedCol = toCol;
      newBoard[capturedRow][capturedCol] = null; 
    }
    if (piece.type === 'pawn') {
      const rowDiff = toRow - fromRow;
      if (Math.abs(rowDiff) === 2) {
        const enPassantRow = fromRow + Math.sign(rowDiff);
        this.enPassantSquare = { row: enPassantRow, col: toCol };
      } else {
        this.enPassantSquare = null;
      }
    } else {
      this.enPassantSquare = null;
    }
    if (piece.type === 'king' && Math.abs(toCol - fromCol) === 2 && fromRow === toRow) {
      const direction = toCol > fromCol ? 1 : -1;
      newBoard[toRow][toCol] = piece;
      newBoard[fromRow][fromCol] = null;
      piece.row = toRow;
      piece.col = toCol;
      piece.hasMoved = true;
      const rookCol = direction === 1 ? 7 : 0;
      const rookNewCol = direction === 1 ? 5 : 3;
      const rook = newBoard[toRow][rookCol];
      if (rook) {
        newBoard[toRow][rookNewCol] = rook;
        newBoard[toRow][rookCol] = null;
        rook.hasMoved = true;
        rook.moveTo(toRow, rookNewCol);
      }
    }
    if(piece.type === 'rook' || piece.type === 'king'){
      piece.hasMoved = true;
    }

    this.boardChange.emit(newBoard);
    if(!this.isPromotion){
      const opponent = this.currentPlayer === 'w' ? 'b' : 'w';

      if (this.isKingInCheck(newBoard, opponent)) {
        if (this.isCheckmate(newBoard, opponent)) {
          console.log('Checkmate! Game over.');
          this.chessGameService.notifyGameOver(this.gameCode!, this.userService.getUserProfile()!.userId);
        } else {
          console.log('Check!');
        }
      }
      if (this.isStalemate(newBoard, opponent)) {
        console.log('Stalemate! Game over.');
        this.chessGameService.notifyGameOver(this.gameCode!, 0);

      }
    }
  }

  cloneBoard(board: (ChessPiece|null)[][]): (ChessPiece|null)[][] {
    return board.map(row => [...row]);
  }
  simulateMove(board: (ChessPiece|null)[][],fromRow: number, fromCol: number,toRow: number, toCol: number): void {
    board[toRow][toCol] = board[fromRow][fromCol];
    board[fromRow][fromCol] = null;
  }

  canBasicMove(piece: ChessPiece, board: (ChessPiece|null)[][], toRow: number, toCol: number): boolean {
    const target = board[toRow][toCol];
    if (target && target.color === piece.color) {
      return false;
    }
    switch (piece.type) {
      case 'pawn':
        return this.canPawnMove(piece, board, toRow, toCol);
      case 'rook':
        return this.canRookMove(piece, board, toRow, toCol);
      case 'knight':
        return this.canKnightMove(piece, board, toRow, toCol);
      case 'bishop':
        return this.canBishopMove(piece, board, toRow, toCol);
      case 'queen':
        return this.canQueenMove(piece, board, toRow, toCol);
      case 'king':
        return this.canKingMove(piece, board, toRow, toCol);
      default:
        return false;
    }
  }
  isMoveLegal(piece: ChessPiece,board: (ChessPiece|null)[][],toRow: number,toCol: number,currentPlayer: any): boolean {
    if (piece.color !== currentPlayer) return false;
    if (this.isPromotion) return false;
    if (!this.canBasicMove(piece, board, toRow, toCol)) {
      return false;
    }
  
    const tempBoard = this.cloneBoard(board);
    this.simulateMove(tempBoard, piece.row, piece.col, toRow, toCol);
  
    if (this.isKingInCheck(tempBoard, piece.color)) {
      return false;
    }
  
    return true;
  }

  canPawnMove(piece: ChessPiece, board: (ChessPiece | null)[][], toRow: number, toCol: number): boolean {
    const direction = piece.color === 'w' ? -1 : 1;
    const rowDiff = toRow - piece.row;
    const colDiff = Math.abs(toCol - piece.col);
    const targetPiece = board[toRow][toCol];
      if (colDiff === 0) {
      if (rowDiff === 1 * direction && !targetPiece) {
        return true;
      }
      if (rowDiff === 2 * direction && !targetPiece && piece.row === (piece.color === 'w' ? 6 : 1)) {
        return true;
      }
    } 
    else if (colDiff === 1 && rowDiff === 1 * direction) {
      if (targetPiece && targetPiece.color !== piece.color) {
        return true;
      }
      if (!targetPiece && this.enPassantSquare) {
        if (this.enPassantSquare.row === toRow && this.enPassantSquare.col === toCol) {
          return true; 
        }
      }
    }
    return false;
  }
  canRookMove(piece: ChessPiece, board: (ChessPiece|null)[][], toRow: number, toCol: number): boolean {
    const target = board[toRow][toCol];
    if (target && target.color === piece.color) {
      return false;
    }
    if (piece.row !== toRow && piece.col !== toCol) {
      return false;
    }
    return this.isPathClear(piece, board, toRow, toCol);
  }
  canKnightMove(piece: ChessPiece, board: (ChessPiece|null)[][], toRow: number, toCol: number): boolean {
    const rowDiff = Math.abs(toRow - piece.row);
    const colDiff = Math.abs(toCol - piece.col);
    const targetPiece = board[toRow][toCol];
    if (targetPiece && targetPiece.color === piece.color) {
      return false;
    }
    return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
  }

  canBishopMove(piece: ChessPiece, board: (ChessPiece|null)[][], toRow: number, toCol: number): boolean {
    if (Math.abs(piece.row - toRow) !== Math.abs(piece.col - toCol)) {
      return false;
    }
    const target = board[toRow][toCol];
    if (target && target.color === piece.color) {
      return false;
    }
  
    return this.isPathClear(piece, board, toRow, toCol);
  }

  canQueenMove(piece: ChessPiece, board: (ChessPiece|null)[][], toRow: number, toCol: number): boolean {
    return this.canRookMove(piece, board, toRow, toCol) || this.canBishopMove(piece, board, toRow, toCol);
  }

  canKingMove(piece: ChessPiece,  board: (ChessPiece|null)[][], toRow: number, toCol: number): boolean {
    const rowDiff = Math.abs(toRow - piece.row);
    const colDiff = Math.abs(toCol - piece.col);
    const targetPiece = board[toRow][toCol];
    if (targetPiece && targetPiece.color === piece.color) {
      return false;
    }
    if (!piece.hasMoved && rowDiff === 0 && colDiff === 2) {
      const direction = (toCol > piece.col) ? 1 : -1;
      return this.canCastle(piece, board, direction);
    }
    if (rowDiff <= 1 && colDiff <= 1) {
      return true;
    }
    return false;
  }
  canCastle(king: ChessPiece, board: (ChessPiece|null)[][], direction: number): boolean {
    const row = king.row;
    const col = king.col;

    const rookCol = (direction === 1) ? 7 : 0;
    const rook = board[row][rookCol];
    if (!rook || rook.type !== 'rook' || rook.color !== king.color) {
      return false;
    }
    if (rook.hasMoved) {
      return false;
    }
  
    const startCol = Math.min(col, rookCol) + 1;
    const endCol   = Math.max(col, rookCol) - 1;
    for (let c = startCol; c <= endCol; c++) {
      if (board[row][c] !== null) {
        return false;
      }
    }
  
    if (this.isKingInCheck(board, king.color)) {
      return false;
    }
  
    const kingPathCols = [col + direction, col + 2*direction];
  
    for (let i = 0; i < kingPathCols.length; i++) {
      const testCol = kingPathCols[i];
  
      const tempBoard = this.cloneBoard(board);
      tempBoard[row][testCol] = tempBoard[row][col];
      tempBoard[row][col] = null;
      
      if (this.isKingInCheck(tempBoard, king.color)) {
        return false;
      }
    }
  
    return true;
  }
  isCheckmate(board: (ChessPiece | null)[][], color: any): boolean {
    if (!this.isKingInCheck(board, color)) {
      return false;
    }

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece || piece.color !== color) continue;
  
        for (let nr = 0; nr < 8; nr++) {
          for (let nc = 0; nc < 8; nc++) {
            if (this.isMoveLegal(piece, board, nr, nc, color)) {
              return false;
            }
          }
        }
      }
    }
    return true;
  }
  isStalemate(board: (ChessPiece | null)[][], color:any): boolean {
    if (this.isKingInCheck(board, color)) {
      return false;
    }
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece || piece.color !== color) continue;
        for (let nr = 0; nr < 8; nr++) {
          for (let nc = 0; nc < 8; nc++) {
            if (this.isMoveLegal(piece, board, nr, nc, color)) {
              return false;
            }
          }
        }
      }
    }
    return true; 
  }
  isPathClear(piece: ChessPiece,board: (ChessPiece | null)[][],toRow: number,toCol: number): boolean {
    const rowDiff = toRow - piece.row;
    const colDiff = toCol - piece.col;

    const movingHorizontally   = (rowDiff === 0 && colDiff !== 0);
    const movingVertically     = (colDiff === 0 && rowDiff !== 0);
    const movingDiagonally     = (Math.abs(rowDiff) === Math.abs(colDiff));
    const validLineOrDiagonal  = movingHorizontally || movingVertically || movingDiagonally;
    if (!validLineOrDiagonal) {
      return false;
    }
    const rowStep = Math.sign(rowDiff);
    const colStep = Math.sign(colDiff);
    const distance = Math.max(Math.abs(rowDiff), Math.abs(colDiff));
    for (let i = 1; i < distance; i++) {
      const checkRow = piece.row + rowStep * i;
      const checkCol = piece.col + colStep * i;

      if (board[checkRow][checkCol] !== null) {

        return false;
      }
    }
    return true;
  }
  isKingInCheck(board: (ChessPiece|null)[][], color:any): boolean {
    let kingRow = -1, kingCol = -1;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'king' && piece.color === color) {
          kingRow = r;
          kingCol = c;
          break;
        }
      }
      if (kingRow !== -1) break;
    }
  
    if (kingRow === -1) {
      return true;
    }
    const opponent = color === 'w' ? 'b' : 'w';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.color === opponent) {
          if (this.canBasicMove(p, board, kingRow, kingCol)) {
            return true;
          }
        }
      }
    }
    return false;
  }
  promotionId(pawnId: string, type: PieceType): string {
    return `${pawnId}-${type}`;
  }
  onPromotionOptionClick(pieceType: 'queen'|'rook'|'bishop'|'knight') {
    const { row, col } = this.promotionSquare!;
    const { row: fromRow, col: fromCol } = this.promotionSquareFrom!;
    const files = ['a','b','c','d','e','f','g','h'];
    const square = files[col] + (8 - row);
    const promoChar = pieceType === 'queen'  ? 'Q'
                    : pieceType === 'rook'   ? 'R'
                    : pieceType === 'bishop' ? 'B'
                    :                          'N';
    const origPawnId = this.promotionNotationCache!;  
    this.board[fromRow][fromCol] = null;
    const promotionNotation = `${square}=${promoChar}#${origPawnId}`;
    this.newMove.emit(promotionNotation);
    const color = this.currentPlayer!; 
    const newId = this.promotionId(origPawnId, pieceType);
    this.board[row][col] = new ChessPiece(pieceType, color, row, col, newId);

    this.isPromotion       = false;
    this.myPromotion       = false;
    this.opponentPromotion = false;
    this.promotionNotationCache = null;
    this.promotionSquare = null;

    const fresh = this.board.map(r => [...r]);
    this.boardChange.emit(fresh);
  }
    onDragStart(event: DragEvent, fromRow: number, fromCol: number) {
    if (!this.board[fromRow][fromCol]) return; 
    this.highlightedMoves = [];
    const dragData = JSON.stringify({ fromRow, fromCol });
    event.dataTransfer?.setData('application/json', dragData);
    const piece = this.board[fromRow][fromCol];
    this.dragValidMoves = this.getAllPossibleMoves(piece);
  }
  onDragOver(event: DragEvent, toRow: number, toCol: number) {
    const isLegal = this.dragValidMoves.some(m => m.row === toRow && m.col === toCol);
    if (isLegal) {
      event.preventDefault();
    }
  }
  onDragEnd(event: DragEvent) {
    this.dragValidMoves = [];
  }
  onDrop(event: DragEvent, toRow: number, toCol: number) {
    event.preventDefault();
    const data = event.dataTransfer?.getData('application/json');
    if (!data) {
      this.dragValidMoves = [];
      return;
    }
    const { fromRow, fromCol } = JSON.parse(data);
    const isLegal = this.dragValidMoves.some(m => m.row === toRow && m.col === toCol);
    if (!isLegal) {
      this.dragValidMoves = [];
      return;
    }
    this.movePiece(fromRow, fromCol, toRow, toCol);
    this.dragValidMoves = [];
  }
  isDragHighlighted(r: number, c: number): boolean {
    return this.dragValidMoves.some(m => m.row === r && m.col === c);
  }
  moveToNotation(piece: ChessPiece, toRow: number, toCol: number, board: ChessPiece[][]): string {
    const fileNames = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const rank = (8 - toRow).toString();
    const file = fileNames[toCol];
    
    let notation = '';

   
    if (piece.type === 'pawn') {
        if (board[toRow][toCol]) {
            notation += fileNames[piece.col] + 'x';
        }
    } else {
        notation += piece.type[0].toUpperCase();
        if (board[toRow][toCol]) {
            notation += 'x'; 
        }
    }

    notation += file + rank; 

    if (piece.type === 'king' && Math.abs(toCol - piece.col) === 2) {
        notation = toCol === 6 ? 'O-O' : 'O-O-O';
    }

    return `${notation}#${piece.id}`;
  }
  onCloseGameOver(){
    this.gameFinished = false;
    this.router.navigate(['/homepage']);
  }
}