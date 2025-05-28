import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { User } from 'src/app/models/user';
import { ChessGameService } from 'src/app/services/chess-game.service';
import { LoginService } from 'src/app/services/login.service';

@Component({
  selector: 'app-homepage',
  templateUrl: './homepage.component.html',
  styleUrls: ['./homepage.component.scss']
})
export class HomepageComponent {
  isLoggedIn = false;
  userProfile: User | undefined;  
  profilePicturePath: string = "";
  createGamePopup: boolean = false;
  joinGamePopup: boolean = false;
  gameCode: string = "";

  constructor(private loginService: LoginService,private router: Router, private chessGameService: ChessGameService) {
    this.isLoggedIn = this.loginService.isLoggedIn();
    if (this.isLoggedIn) {
      this.userProfile = this.loginService.getUserProfile();
      if (this.userProfile) {
        this.profilePicturePath = "https://localhost:7189/"+this.userProfile.profilePicture;
      }
    }
  }

  onLogin() {
    this.router.navigate(['/login']);
  }

  onRegister() {
    this.router.navigate(['/register']);
  }

  createGame() {
    this.createGamePopup = true;
    this.chessGameService.createGame(this.userProfile!.userId).subscribe((game) => {
      this.gameCode = game.gameCode;
    }
    );
  }

  openCreate(): void {
    this.createGamePopup = true;
    this.chessGameService
        .createGame(this.userProfile!.userId)
        .subscribe(game => this.gameCode = game.gameCode);
  }

  openJoin(): void { this.joinGamePopup = true; }

  close(): void {
    this.createGamePopup = this.joinGamePopup = false;
  }

  onJoinGame(): void {
    this.joinGamePopup = false;
    this.chessGameService
        .joinGame(this.gameCode, this.userProfile!.userId)
        .subscribe(() => this.router.navigate(['/game', this.gameCode]));
  }
}
