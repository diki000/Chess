import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { LoginService } from 'src/app/services/login.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {

  username: string = "";
  password: string = "";
  profilePicture: string = "";

  constructor(private router: Router, private loginService: LoginService) { 
    loginService.isLoginScreen$.next(true);
  }

  ngOnInit(): void {
  }

  loginButton(){
    this.loginService.login(this.username, this.password).subscribe((user) => {
      if(user){
        this.router.navigate(['/homepage']);
      }
    },
    (error) => {
      alert("Pogrešno korisničko ime ili lozinka");
    });
  }
}
