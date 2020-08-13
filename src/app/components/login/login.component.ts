import { Component, OnInit } from '@angular/core';
import { LoginService } from "../../services/login.service";
import { Router } from '@angular/router';
import { DiccionarioService } from "../../services/diccionario.service";
import { Diccionario } from "../../interfaces/diccionario";
import { password, user } from 'src/app/config/variables';
import { UserLogin } from "../../interfaces/register/user-login";
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from "../../../environments/environment";
import * as CryptoJS from 'crypto-js';
import sha256 from "sha256";
import * as $ from 'jquery';
import Swal from 'sweetalert2';
import { InfoLocation } from 'src/app/interfaces/logs/logs';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  form: UserLogin = { "usuario": "", "password": "","ip":"" };
  error: boolean = false;
  errorData: boolean = false;
  message: string = "";
  tiposDocumento: Diccionario[];
  eye: boolean = false;
  // Recuperacion de contraseñas
  count: number;
  muestraStrength: number;
  passwords = {
    password: "",
    passwordConfirm: ""
  }
  bloqueado: boolean = false;
  passwordBool: boolean = false;
  passwordConfirmBool: boolean = false;

  // Código de verificacion telefono celular
  codigo: string = "";
  errorNum: boolean = false;
  errorTipo: boolean = false;

  // Recuperacion de contraseña
  recovery = {
    identificacion: '',
    tokenCaptcha:''
  }

  recoveryCode = {
    id: '',
    code: '',
    tokenCaptcha:''
  }

  recoveryPassword = {
    id: '',
    password: '',
    code:'',
    tokenCaptcha:''
  }

  // 
  formLogin: FormGroup;
  loader: boolean;
  coberturas:any = [];
  dataExtra: InfoLocation;
  constructor(private login: LoginService, private router: Router, private diccionario: DiccionarioService, public fb: FormBuilder) { 
    
  }

  ngOnInit() {
    this.getTiposDoc();
    this.count = 0;

    this.login.getDataExtra().subscribe(res => {
      this.dataExtra = res;
      // console.log(this.dataExtra);
      
      this.form.ip = this.dataExtra.ip;
    }) 

    this.formLogin = this.fb.group({
      names: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(30)]]
    });
    if (this.login.isActive()) {
      this.router.navigate(['home']);
    }
  }

  showEye() {
    this.eye = !this.eye;
    if (this.eye) {
      $('#password').attr('type', 'text');
    } else {
      $('#password').attr('type', 'password');
    }

  }

  encryptDecrypt(password, keyPass) {
    var key = keyPass.split("");
    var output = [];

    for (var i = 0; i < password.length; i++) {
      var charCode = password.charCodeAt(i) ^ key[i % key.length].charCodeAt(0);
      output.push(String.fromCharCode(charCode));
    }
    return output.join("");
  }

  sendForm(captchaResponse:string) {
    if(captchaResponse == null){
      return;
    }
    if (this.form.usuario == '' && this.form.password == '') {
      this.error = true;
      this.message = 'Para continuar debes completar todos los campos.'
    } else {
      let login= {
        "ip" : "",
        "usuario" : btoa(this.form.usuario),
        "password" : btoa(
          this.encryptDecrypt(
            sha256(this.form.password),
            captchaResponse.substring(captchaResponse.length - 10, captchaResponse.length)
          )
        ),
        "tokenCaptcha" : captchaResponse
      }
      this.loader = true;
      this.login.login(login).subscribe(res => {
        // Retorna respuesta exitosa
        // console.log(res);
        if (res['codigo'] == 0) {
          // Guardamos el token en el localStorage
          localStorage.setItem('token', CryptoJS.AES.encrypt(res['data']['token'],"eco_scotia"));
          // Obtenemos los datos del usuario con session
          this.login.getSession(res['data']['token']).subscribe(
            res => {
              //  console.log(JSON.stringify(res));
              localStorage.setItem('user', CryptoJS.AES.encrypt(JSON.stringify(res),"eco_scotia"));
              
              this.loader = false;
              //this.router.navigate(['home']);
              this.coberturas = this.login.getCoberturas();
              if(this.coberturas.includes('retencion')){
                this.router.navigate(['estudiar-coursera']);
              }else{
                window.location.reload();
              }
            }
          );
        } else {
          $('#captchaResetL').trigger('click');
          this.loader = false;
          this.errorData = true;
          this.message = res['mensaje'];
          if(res['codigo'] == -1){
            this.bloqueado = true;
          }else{
            this.bloqueado = false;
          }
        }
      },
        (error: any) => {
          Swal.fire({
            title: 'Problemas!',
            text: 'Hubo un problema en la autenticación',
            type: 'warning',
            confirmButtonText: 'Aceptar'
          });
          this.loader = false;
          $('#captchaResetL').trigger('click');
        }
      )
    }
  }

  pass() {
    this.count++;
  }

  // Cargar tipos de documento
  getTiposDoc() {
    this.diccionario.getDiccionario(1)
      .subscribe(
        (data: any) => { //start of (1)
          this.tiposDocumento = data.data.$values;
          // console.log(this.tiposDocumento);
        }, //end of (1)
        (error: any) => console.log(error)
      );
  }

  goback() {
    this.count--;
  }

  validatePasswords(captchaResponse:string) {
    let countError = 0;
    if(captchaResponse == null){
      return;
    }
    if (this.passwords.password == "") {
      countError++;
      this.passwordBool = true;
      this.message = 'Para continuar debes completar todos los campos.';
      $('#captchaResetPass').trigger('click');
    }

    if (this.passwords.passwordConfirm == "") {
      countError++;
      this.passwordConfirmBool = true;
      this.message = 'Para continuar debes completar todos los campos.';
      $('#captchaResetPass').trigger('click');
    }

    if (this.passwords.password != this.passwords.passwordConfirm) {
      countError++;
      this.passwordBool = true;
      this.passwordConfirmBool = true;
      this.message = "Las contraseñas no coinciden.";
      $('#captchaResetPass').trigger('click');
    }

    let pattern = /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{7,15}/
    // Verificacion de contraseñas con el patrón
    if (!pattern.test(this.passwords.password)) {
      countError++;
      this.passwordBool = true;
      this.passwordConfirmBool = false;
      this.message = `
        La nueva contraseña debe tener al entre 8 y 16 caracteres, al menos un dígito, al menos una minúscula y al menos una mayúscula.
        NO puede tener otros símbolos.
        Ejemplo:
        w3Unpocodet0d0
      `;
      $('#captchaResetPass').trigger('click');
    }else if(!pattern.test(this.passwords.passwordConfirm)){
      countError++;
      this.passwordBool = false;
      this.passwordConfirmBool = true;
      this.message = `
        La confirmación contraseña debe tener al entre 8 y 16 caracteres, al menos un dígito, al menos una minúscula y al menos una mayúscula.
        NO puede tener otros símbolos.
        Ejemplo:
        w3Unpocodet0d0
      `;
      $('#captchaResetPass').trigger('click');
    }


    if (countError == 0) {
      // Todo bien
      // console.log('Todo bien...');
      this.loader = true;
      let pass = btoa(
        this.encryptDecrypt(
          sha256(this.passwords.password),
          captchaResponse.substring(captchaResponse.length - 10, captchaResponse.length)
        )
      );
      this.recoveryPassword.code = this.recoveryCode.code;
      this.recoveryPassword.password = pass;
      this.recoveryPassword.id = this.recoveryCode.id;
      this.recoveryPassword.tokenCaptcha = captchaResponse;
      this.login.validatePassword(this.recoveryPassword).subscribe(
        res => {
          // console.log(res);
          if (res['codigo'] == 0) {
            this.message = "";
            this.error = false;
            this.pass();
            this.loader = false;
          } else if (res['codigo'] == 1) {
            this.loader = false;
            this.message = res['mensaje'];
            this.error = true;
            $('#captchaResetPass').trigger('click');
          }
        }
      )

    }

  }

  validateRecovery(captchaResponse:string) {
    if(captchaResponse == null){
      return;
    }
    let countError = 0;
    if (this.recovery.identificacion == '') {
      this.error = true;
      this.message = "Debes proporcionar un número de identificación.";
      countError++;
      $('#captchaResetRC').trigger('click');
    }

    if (countError == 0) {
      this.loader = true;
      this.recovery.tokenCaptcha = captchaResponse;
      this.login.recovery(this.recovery).subscribe(
        res => {
          // console.log(res);
          if (res['codigo'] == 0) {
            this.recoveryCode.id = res['data'];
            this.message = "";
            this.error = false;
            this.pass();
            this.loader = false;
          } else if (res['codigo'] == 1) {
            this.message = res['mensaje'];
            this.error = true;
            this.loader = false;
            $('#captchaResetRC').trigger('click');
          }
        }
      )
    }
  }

  validateCode(captchaResponse:string) {
    if(captchaResponse == null){
      return
    }
    let countError = 0;
    if (this.recoveryCode.code == '') {
      this.error = true;
      this.message = "Debes proporcionar un código.";
      countError++;
      $('#captchaResetCode').trigger('click');
    }

    if (countError == 0) {
      this.recoveryCode.tokenCaptcha= captchaResponse;
      this.login.validateCode(this.recoveryCode).subscribe(
        res => {
          this.loader = true;
          // console.log(res);
          if (res['codigo'] == 0) {
            this.message = "";
            this.error = false;
            this.pass();
            this.loader = false;
          } else if (res['codigo'] == 1) {
            this.message = res['mensaje'];
            this.error = true;
            this.loader = false;
            $('#captchaResetCode').trigger('click');
          }
        }
      )
    }

  }



  onKeyUp(event: any) {

    let password: string = this.form.password;

    // console.log(password);

    this.checkStrength(password);
  }

  checkStrength(password: string) {
    var strength: number = 0;
    //If password contains both lower and uppercase characters, increase strength value.
    if (password.match(/([a-z].*[A-Z])|([A-Z].*[a-z])/)) {
      strength += 1;

      $('.low-upper-case').addClass('text-success');
      $('.low-upper-case i').removeClass('fa-file-text').addClass('fa-check');
      $('#popover-password-top').addClass('hide');
    } else {
      $('.low-upper-case').removeClass('text-success');
      $('.low-upper-case i').addClass('fa-file-text').removeClass('fa-check');
      $('#popover-password-top').removeClass('hide');
    }

    //If it has numbers and characters, increase strength value.
    if (password.match(/([a-zA-Z])/) && password.match(/([0-9])/)) {
      strength += 1;
      $('.one-number').addClass('text-success');
      $('.one-number i').removeClass('fa-file-text').addClass('fa-check');
      $('#popover-password-top').addClass('hide');

    } else {
      $('.one-number').removeClass('text-success');
      $('.one-number i').addClass('fa-file-text').removeClass('fa-check');
      $('#popover-password-top').removeClass('hide');
    }

    //If it has one special character, increase strength value.
    if (password.match(/([!,%,&,@,#,$,^,*,?,_,~])/)) {
      strength += 1;
      $('.one-special-char').addClass('text-success');
      $('.one-special-char i').removeClass('fa-file-text').addClass('fa-check');
      $('#popover-password-top').addClass('hide');

    } else {
      $('.one-special-char').removeClass('text-success');
      $('.one-special-char i').addClass('fa-file-text').removeClass('fa-check');
      $('#popover-password-top').removeClass('hide');
    }

    if (password.length > 7) {
      strength += 1;
      $('.eight-character').addClass('text-success');
      $('.eight-character i').removeClass('fa-file-text').addClass('fa-check');
      $('#popover-password-top').addClass('hide');

    } else {
      $('.eight-character').removeClass('text-success');
      $('.eight-character i').addClass('fa-file-text').removeClass('fa-check');
      $('#popover-password-top').removeClass('hide');
    }

    // If value is less than 2

    if (strength < 2) {
      $('#result').removeClass()
      $('#password-strength').addClass('progress-bar bg-danger');

      $('#result').addClass('text-danger').text('Débil');
      $('#password-strength').css('width', '10%');
    } else if (strength == 2) {
      $('#result').removeClass('text-danger');
      $('#password-strength').removeClass('progress-bar bg-danger');
      $('#password-strength').addClass('progress-bar bg-warning');
      $('#result').addClass('text-warning').text('Moderada')
      $('#password-strength').css('width', '60%');
      return 'Week'
    } else if (strength == 4) {
      $('#result').removeClass('text-warning')
      $('#result').addClass('strong');
      $('#password-strength').removeClass('progress-bar bg-warning');
      $('#password-strength').addClass('progress-bar bg-success');
      $('#result').addClass('text-success').text('Fuerte');
      $('#password-strength').css('width', '100%');

      return 'Strong'
    }
  }

  onKeyUp2(event: any) {
    if (event.target.name == 'password') {
      this.checkStrength(event.target.value);
    }else if(event.target.name == 'passwordConfirm'){
      this.checkStrength2(event.target.value);
    }
  }

  checkStrength2(password:string) {
    var strength:number = 0;
    //If password contains both lower and uppercase characters, increase strength value.
    if (password.match(/([a-z].*[A-Z])|([A-Z].*[a-z])/)) {
        strength += 1;

        $('.low-upper-case').addClass('text-success');
        $('.low-upper-case i').removeClass('fa-file-text').addClass('fa-check');
        $('#popover-password-top').addClass('hide');
    } else {
        $('.low-upper-case').removeClass('text-success');
        $('.low-upper-case i').addClass('fa-file-text').removeClass('fa-check');
        $('#popover-password-top').removeClass('hide');
    }

    //If it has numbers and characters, increase strength value.
    if (password.match(/([a-zA-Z])/) && password.match(/([0-9])/)) {
        strength += 1;
        $('.one-number').addClass('text-success');
        $('.one-number i').removeClass('fa-file-text').addClass('fa-check');
        $('#popover-password-top').addClass('hide');

    } else {
        $('.one-number').removeClass('text-success');
        $('.one-number i').addClass('fa-file-text').removeClass('fa-check');
        $('#popover-password-top').removeClass('hide');
    }

    //If it has one special character, increase strength value.
    if (password.match(/([!,%,&,@,#,$,^,*,?,_,~])/)) {
        strength += 1;
        $('.one-special-char').addClass('text-success');
        $('.one-special-char i').removeClass('fa-file-text').addClass('fa-check');
        $('#popover-password-top').addClass('hide');

    } else {
        $('.one-special-char').removeClass('text-success');
        $('.one-special-char i').addClass('fa-file-text').removeClass('fa-check');
        $('#popover-password-top').removeClass('hide');
    }

    if (password.length > 7) {
        strength += 1;
        $('.eight-character').addClass('text-success');
        $('.eight-character i').removeClass('fa-file-text').addClass('fa-check');
        $('#popover-password-top').addClass('hide');

    } else {
        $('.eight-character').removeClass('text-success');
        $('.eight-character i').addClass('fa-file-text').removeClass('fa-check');
        $('#popover-password-top').removeClass('hide');
    }

    // If value is less than 2

    if (strength < 2) {
        $('#result2').removeClass()
        $('#password-strength2').addClass('progress-bar2 bg-danger');

        $('#result2').addClass('text-danger').text('Débil');
        $('#password-strength2').css('width', '10%');
    } else if (strength == 2) {
        $('#result2').removeClass('text-danger');
        $('#password-strength2').removeClass('progress-bar2 bg-danger');
        $('#password-strength2').addClass('progress-bar2 bg-warning');
        $('#result2').addClass('text-warning').text('Moderada')
        $('#password-strength2').css('width', '60%');
        return 'Week'
    } else if (strength == 4) {
        $('#result2').removeClass('text-warning')
        $('#result2').addClass('strong');
        $('#password-strength2').removeClass('progress-bar2 bg-warning');
        $('#password-strength2').addClass('progress-bar2 bg-success');
        $('#result2').addClass('text-success').text('Fuerte');
        $('#password-strength2').css('width', '100%');

        return 'Strong'
    }
  }

}
