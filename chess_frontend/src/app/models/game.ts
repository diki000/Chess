export class Move{
    moveNumber: number;
    player: string;
    notation: string;

    constructor(moveNumber: number, player: string, notation: string){
        this.moveNumber = moveNumber;
        this.player = player;
        this.notation = notation;
    }
}

export class Game {
    gameCode: string;
    playerWhiteId: number;
    playerBlackId: number;
    status: string;
    created: Date;
    completed: Date;
    winnerId: number;
    moveHistory: Move[];

    constructor(gameCode: string, playerWhiteId: number, playerBlackId: number, status: string, created: Date, completed: Date, winnerId: number, moveHistory: Move[]){
        this.gameCode = gameCode;
        this.playerWhiteId = playerWhiteId;
        this.playerBlackId = playerBlackId;
        this.status = status;
        this.created = created;
        this.completed = completed;
        this.winnerId = winnerId;
        this.moveHistory = moveHistory;
    }
}   
