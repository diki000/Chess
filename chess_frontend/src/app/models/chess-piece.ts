export type PieceType = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
export type PieceColor = 'w' | 'b';

export class ChessPiece {
  type: PieceType;
  color: PieceColor;
  row: number;
  col: number;
  id: string;
  hasMoved: boolean = false;

  constructor(type: PieceType, color: PieceColor, row: number, col: number, id?: string) {
    this.type = type;
    this.color = color;
    this.row = row;
    this.col = col;
    this.id = id ?? this.generateId();    
  }

  moveTo(row: number, col: number) {
    this.row = row;
    this.col = col;
  }

  toString(): string {
    const idPart = this.id ? ` (${this.id})` : '';
    return `${this.color} ${this.type}${idPart} at (${this.row}, ${this.col})`;
  }
  private generateId(): string {
    return `${this.color}-${this.type}-${this.row}-${this.col}-${Math.random().toString(36).substr(2, 5)}`;
  }
}