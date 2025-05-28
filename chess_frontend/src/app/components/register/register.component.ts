import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { LoginService } from 'src/app/services/login.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  username: string = "";
  password: string = "";
  passwordRepeat: string = "";
  profilePicture?: File;

  constructor(private router: Router, private loginService: LoginService) { 
    loginService.isLoginScreen$.next(true);
  }

  ngOnInit(): void {
  }
  onFileSelected(event: any) {
    if (event.target.files.length > 0) {
      this.profilePicture = event.target.files[0];
  
      try {
        const reader = new FileReader();
        reader.readAsDataURL(this.profilePicture!);
        reader.onload = () => {
          console.log("File loaded successfully.")
        };
        reader.onerror = (error) => {
          console.error("Error reading file:", error);
        };
      } catch (error) {
        console.error("Unexpected file processing error:", error);
      }
    }
  }

  registerButton(){
    if(this.username == "" || this.password == "" || this.passwordRepeat == ""){
      alert("Morate popuniti sva polja");
      return;
    }
    if(this.password != this.passwordRepeat){
      alert("Lozinke se ne poklapaju");
      return;
    }
    this.loginService.register(this.username, this.password, this.profilePicture).subscribe({
      next: (user) =>{
        this.uploadProfilePicture(user.userId);
      }
    });
  }
  uploadProfilePicture(userId: number) {
    const formData = new FormData();
    if (this.profilePicture) {
      formData.append('files', this.profilePicture);
    }
    formData.append('userID', userId.toString());
    this.loginService.uploadProfilePicture(formData).subscribe(
      (response) => {
      },
      (error) => {
      }
    );
  }
  
}
