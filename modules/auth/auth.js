/*
====================================================
GAME PLATFORM
AUTH MODULE

modules/auth/auth.js

Supabase Auth
+ profiles create
+ login
+ register
+ logout

====================================================
*/


(function(){

"use strict";



let currentUser = null;



/*
====================================================
LOAD AUTH WINDOW
====================================================
*/


async function loadAuthHTML(){


const container =
document.getElementById(
"auth-container"
);



if(!container)
return;



const response =
await fetch(
"modules/auth/auth.html"
);



container.innerHTML =
await response.text();



bindButtons();


}




/*
====================================================
BUTTONS
====================================================
*/


function bindButtons(){


const login =
document.getElementById(
"do-login"
);



const register =
document.getElementById(
"do-register"
);



if(login){

login.onclick =
loginUser;

}



if(register){

register.onclick =
registerUser;

}


}




/*
====================================================
REGISTER
====================================================
*/


async function registerUser(){


const email =
document.getElementById(
"auth-email"
).value.trim();



const password =
document.getElementById(
"auth-password"
).value;



const nickname =
document.getElementById(
"auth-nickname"
).value.trim();



if(!email || !password){

alert(
"Введите email и пароль"
);

return;

}




const {
data,
error

}=

await window.supabaseClient.auth
.signUp({

email,

password

});




if(error){

alert(
error.message
);

return;

}



const user =
data.user;



if(!user){

alert(
"Проверьте email для подтверждения"
);

return;

}




/*
Создание профиля
*/


const {
error:profileError

}=

await window.supabaseClient
.from("profiles")
.insert({

id:user.id,

nickname:
nickname ||
"Player",

avatar_url:null,

city:null,

age:null,

vip_level:0

});





if(profileError){


console.error(
profileError
);



alert(
"Аккаунт создан, но профиль не создан:\n\n"
+
profileError.message
);


return;

}



alert(
"Регистрация успешна"
);



updateUI(user);



}




/*
====================================================
LOGIN
====================================================
*/


async function loginUser(){



const email =
document.getElementById(
"auth-email"
).value.trim();



const password =
document.getElementById(
"auth-password"
).value;




const {

data,

error

}=

await window.supabaseClient.auth
.signInWithPassword({

email,

password

});




if(error){


alert(
error.message
);


return;


}



currentUser =
data.user;



alert(
"Вход выполнен"
);



updateUI(
currentUser
);



}




/*
====================================================
LOGOUT
====================================================
*/


async function logoutUser(){


await window.supabaseClient.auth
.signOut();



currentUser=null;


updateUI(null);


}




/*
====================================================
SESSION CHECK
====================================================
*/


async function checkSession(){


const {

data

}=

await window.supabaseClient.auth
.getSession();



if(
data.session
){


currentUser =
data.session.user;



}



updateUI(
currentUser
);



}





/*
====================================================
UPDATE HEADER
====================================================
*/


function updateUI(user){



const login =
document.getElementById(
"login-button"
);



const register =
document.getElementById(
"register-button"
);



const profile =
document.getElementById(
"profile-button"
);



const logout =
document.getElementById(
"logout-button"
);



const name =
document.getElementById(
"user-name"
);




if(user){


if(login)
login.style.display="none";


if(register)
register.style.display="none";


if(profile)
profile.style.display="inline-block";


if(logout)
logout.style.display="inline-block";



if(name)
name.textContent =
user.email;



}
else{


if(login)
login.style.display="inline-block";


if(register)
register.style.display="inline-block";


if(profile)
profile.style.display="none";


if(logout)
logout.style.display="none";


if(name)
name.textContent="";


}



}





/*
====================================================
HEADER BUTTONS
====================================================
*/


function bindHeader(){


const login =
document.getElementById(
"login-button"
);



const register =
document.getElementById(
"register-button"
);



const logout =
document.getElementById(
"logout-button"
);



if(login){

login.onclick=function(){

document
.getElementById(
"auth-container"
)
.scrollIntoView();

};

}



if(register){

register.onclick=function(){

document
.getElementById(
"auth-container"
)
.scrollIntoView();

};

}



if(logout){

logout.onclick =
logoutUser;

}


}



/*
====================================================
START
====================================================
*/


async function init(){


await loadAuthHTML();


bindHeader();


await checkSession();



window.supabaseClient.auth
.onAuthStateChange(

function(
event,
session
){


if(session){


currentUser =
session.user;


}
else{


currentUser=null;


}


updateUI(
currentUser
);



}

);



}




document.addEventListener(
"DOMContentLoaded",
init
);




window.GameAuth={


getUser:function(){

return currentUser;

},


logout:logoutUser


};



})();
