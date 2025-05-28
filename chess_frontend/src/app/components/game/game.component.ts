import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ChessPiece } from 'src/app/models/chess-piece';
import { ActivatedRoute } from '@angular/router';
import { ChessGameService } from 'src/app/services/chess-game.service';
import { User } from 'src/app/models/user';
import { LoginService } from 'src/app/services/login.service';


@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss']
})
export class GameComponent implements OnInit {
  board: (ChessPiece | null)[][] = [];
  gameCode: string | null = null;
  isGameReady = false;
  playerColor: 'w' | 'b' | null = null;
  moves: any = [];
  bothPlayersReady: boolean = false;

  players: any = [];
  isLoggedIn = false;
  userProfile: User | undefined;
  board$: any;
  constructor(private route: ActivatedRoute, private chessGameService: ChessGameService, private cdr: ChangeDetectorRef, private loginService: LoginService) {
    this.isLoggedIn = this.loginService.isLoggedIn();
    if (this.isLoggedIn) {
      this.userProfile = this.loginService.getUserProfile();

    }
  }

  ngOnInit() {
    this.gameCode = this.route.snapshot.paramMap.get('gameCode');
    this.chessGameService.joinGame(this.gameCode!, this.userProfile?.userId!).subscribe((game) => {
    this.board$ = this.chessGameService.board$;
    });
    this.chessGameService.startConnection(this.gameCode!).then(() => {
        this.playerColor = this.chessGameService.getColorAssigned();
        this.moves = this.chessGameService.getMoves(this.gameCode!);
        
        this.board = this.chessGameService.getBoard()!;
        this.isGameReady = true;

    });

    this.chessGameService.bothPlayersReady.subscribe((bothPlayersReady) => {
      if (bothPlayersReady) {
        this.bothPlayersReady = bothPlayersReady;
      }
    });
  }

  getBoard(): (ChessPiece | null)[][] {
    return this.board;
  }

  updateBoard(board: any[][]) {
    this.board = board.map(row => [...row]);
  }
  handleMove(move: string) {
    this.makeMove(move);
  }
  makeMove(move: string) {
    this.chessGameService.sendMove(this.gameCode!, this.userProfile?.userId!, move);
  }

}