import { Component, OnInit } from '@angular/core';
import{Router, NavigationEnd} from '@angular/router';
import { Idle } from 'idlejs/dist';
import { LoginService } from "./services/login.service";
import { environment } from "../environments/environment";
import { filter } from 'rxjs/operators';
import { Token } from "./services/token";
import * as CryptoJS from 'crypto-js';
import {CookieService} from 'ngx-cookie-service';

declare let gtag: Function;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit{
  title = 'cardif';
  analytics = environment.analytics;
  private cookieValue : string;


  constructor(public router: Router, public login: LoginService, public token: Token , private cookieService : CookieService){
    // Google Tag Manager
    // const script = document.createElement('script');
    // script.async = true;
    // script.src = 'https://www.googletagmanager.com/gtag/js?id=' + this.analytics;
    // document.head.prepend(script);

    // const navEndEvent$ = router.events.pipe(
    //   filter(e => e instanceof NavigationEnd)
    // );
    // navEndEvent$.subscribe((e: NavigationEnd) => {
    //   gtag('config', `${this.analytics}`, {'page_path':e.urlAfterRedirects});
    // });

    // console.log('Script: '+document.head.textContent);
    
    // console.log('Google Analytics ID: ', `${this.analytics}`);
    



    // Configuración para cerrar sesión por inactividad

  

    const idle = new Idle()
    .whenNotInteractive()
    .within(60)
    .do(() => {
      if (this.login.isActive()) {
        this.login.logOut();
        document.getElementById('btnModalTime').click();
      }
    }).start();
    if (this.login.isActive()) {
      this.login.getParameter(16).subscribe(
        res => {
          setInterval(() => {
            if (this.login.isActive()) {
              //console.log(new Date());
              this.token.refreshToken2().subscribe(
                res => {
              localStorage.setItem('token', CryptoJS.AES.encrypt(String(res['token']),"eco_scotia"));    
                }
              )
            }
            
          }, 3000); // res['data']['parametroJSON']);
      })
      
    }
}



  ngOnInit(){
    if (this.token.isTokenExpired()) {
      this.login.logOut();
      document.getElementById('btnModalTime').click();
    }
  }

}


