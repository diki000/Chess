import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable, tap } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { User } from '../models/user';

@Injectable({
  providedIn: 'root'
})
export class LoginService {
  url : string = 'https://localhost:7189';
  private _isLoggedIn$ = new BehaviorSubject<boolean>(false);
  isLoggedIn$ = this._isLoggedIn$.asObservable();
  isLoginScreen$ = new BehaviorSubject<boolean>(false);
  loggedInUser : User | undefined;

  constructor(private http: HttpClient, private router: Router) {
    var token = localStorage.getItem('MSToken');
    if(token != null || token != undefined){
      const expiry = (JSON.parse(atob(token!.split('.')[1]))).exp;
      if(!(Math.floor((new Date).getTime() / 1000) >= expiry)){
        this._isLoggedIn$.next(true);
      }
      else{
        localStorage.removeItem('MSToken');
      }
    }
    this.restoreSession();
  }
  public login(username: string, password: string): Observable<User>{
    let httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json',
      })
    };
    let body = {
      "Username": username,
      "Password": password,
    }
    return this.http.post<User>(this.url + '/api/User/Login', body, httpOptions).pipe(
      tap((user: User) => {
        if(user){
          this._isLoggedIn$.next(true);
          localStorage.setItem('MSToken', user.accessToken);
          localStorage.setItem('loggedInUser', JSON.stringify(user));
          localStorage.setItem('playerId', user.userId.toString());

          this.loggedInUser = new User(user.userId, user.username, "", 0, 0, user.profilePicture, user.accessToken);
          this.router.navigate(['/homepage']);
        }
      }
    ));
  }

  public uploadProfilePicture(data: FormData): Observable<any>{
      return this.http.post<any>(this.url + '/api/User/UploadImage', data);
  }
  public register(username: string, password: string, profilePicture?: File): Observable<User>{
    let httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json',
      })
    };
    let body = {
      "Username": username,
      "Password": password,
    }
    return this.http.post<User>(this.url + '/api/User/Register', body, httpOptions).pipe(
      tap((user: User) => {
        if(user){
          this.router.navigate(['/login']);
        }
      }
    ));
  }
  public logout(){
    this._isLoggedIn$.next(false);
    localStorage.removeItem('MSToken');
    this.router.navigate(['/homepage'])
  }
  public getUserById(id: number): Observable<User>{
    let httpOptions = {
      Authorization: 'Bearer ' + localStorage.getItem('MSToken')
    };
    return this.http.get<User>(this.url + '/api/User/GetUserById?userId=' + id, {headers: httpOptions});
  }
  public isLoggedIn(): boolean{
    return this._isLoggedIn$.value;
  }
  public isLoginScreen(): boolean{
    return this.isLoginScreen$.value;
  }
  public setLoginScreen(isLoginScreen: boolean){
    this.isLoginScreen$.next(isLoginScreen);
  }
  public getUserProfile(): User | undefined{
    return this.loggedInUser;
  }
  restoreSession() {
    const userJson = localStorage.getItem('loggedInUser');
    if (userJson != null && userJson != undefined) {
        const user = JSON.parse(userJson);
        this.loggedInUser = new User(user.userId, user.username, "", 0, 0, user.profilePicture, user.accessToken);
        this._isLoggedIn$.next(true);
    }
  }
  getProfileNameAndPicture(userId: number): Observable<any> {
    return this.http.get<any>(this.url + '/api/User/UserNameAndPicture/' + userId);
  }
}
