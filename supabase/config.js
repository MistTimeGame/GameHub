// ============================================================
// GAMEHUB AUTH
// ============================================================


document.addEventListener(
"DOMContentLoaded",
async function(){



const supabase =
    window.GameHub.supabase;



const loginForm =
    document.getElementById(
        "login-form"
    );


const registerForm =
    document.getElementById(
        "register-form"
    );



const loginButton =
    document.getElementById(
        "show-login"
    );


const registerButton =
    document.getElementById(
        "show-register"
    );



const message =
    document.getElementById(
        "auth-message"
    );




function showMessage(
    text,
    type="success"
){

    message.className =
        type === "error"
        ? "auth-message gh-error"
        : "auth-message gh-success";


    message.textContent =
        text;
}





loginButton.onclick =
function(){


loginForm.classList.remove(
    "gh-hidden"
);


registerForm.classList.add(
    "gh-hidden"
);


loginButton.classList.remove(
    "secondary"
);


registerButton.classList.add(
    "secondary"
);


};





registerButton.onclick =
function(){


registerForm.classList.remove(
    "gh-hidden"
);


loginForm.classList.add(
    "gh-hidden"
);


registerButton.classList.remove(
    "secondary"
);


loginButton.classList.add(
    "secondary"
);


};





// ============================================================
// LOGIN
// ============================================================


loginForm.addEventListener(
"submit",
async function(e){


e.preventDefault();



const email =
document.getElementById(
    "login-email"
).value.trim();



const password =
document.getElementById(
    "login-password"
).value;




const {
data,
error
}
=
await supabase.auth.signInWithPassword({

email,

password

});




if(error){

showMessage(
    error.message,
    "error"
);

return;

}




showMessage(
    "Успешный вход"
);



setTimeout(
function(){

window.location.href =
"../profile/";

},
1000
);



});






// ============================================================
// REGISTER
// ============================================================


registerForm.addEventListener(
"submit",
async function(e){


e.preventDefault();



const email =
document.getElementById(
    "register-email"
).value.trim();



const password =
document.getElementById(
    "register-password"
).value;



const nickname =
document.getElementById(
    "register-nickname"
).value.trim();





const {
data,
error
}
=
await supabase.auth.signUp({

email,

password

});





if(error){

showMessage(
error.message,
"error"
);

return;

}




const user =
data.user;



if(!user){

showMessage(
"Не удалось создать пользователя",
"error"
);

return;

}





const {
error:
profileError
}
=
await supabase
.from("profiles")
.insert({

id:user.id,

nickname:nickname,

vip_level:0

});






if(profileError){

showMessage(
profileError.message,
"error"
);

return;

}





showMessage(
"Аккаунт создан"
);



setTimeout(
function(){

window.location.href =
"../profile/";

},
1200
);



});





// ============================================================
// CHECK EXISTING SESSION
// ============================================================


const session =
await window.GameHub.session.init();



if(session){


showMessage(
"Вы уже вошли. Переход..."
);



setTimeout(
function(){

window.location.href =
"../profile/";

},
1000
);


}




});