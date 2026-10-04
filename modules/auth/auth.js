/* ============================================================
   GAME PLATFORM
   AUTH MODULE
   Supabase Auth
   ============================================================ */


console.log("[AUTH] module loaded");



const loginForm =
document.getElementById(
    "loginForm"
);


const registerForm =
document.getElementById(
    "registerForm"
);



const message =
document.getElementById(
    "authMessage"
);




/* ============================================================
   TABS
   ============================================================ */


const loginTab =
document.getElementById(
    "showLogin"
);


const registerTab =
document.getElementById(
    "showRegister"
);



if(loginTab){

loginTab.onclick = function(){

    loginForm.style.display =
        "block";

    registerForm.style.display =
        "none";

    clearMessage();

};

}



if(registerTab){

registerTab.onclick = function(){

    loginForm.style.display =
        "none";

    registerForm.style.display =
        "block";

    clearMessage();

};

}





/* ============================================================
   REGISTER
   ============================================================ */


const registerButton =
document.getElementById(
    "registerSubmit"
);



if(registerButton){


registerButton.onclick =
async function(){


    const nickname =
    document.getElementById(
        "regNickname"
    ).value.trim();



    const email =
    document.getElementById(
        "regEmail"
    ).value.trim();



    const password =
    document.getElementById(
        "regPassword"
    ).value;



    if(!nickname ||
       !email ||
       !password){

        showMessage(
            "Заполните все поля"
        );

        return;

    }



    showMessage(
        "Создание аккаунта..."
    );



    const {
        data,
        error
    } =
    await supabaseClient.auth.signUp({

        email:
            email,

        password:
            password

    });



    if(error){

        showMessage(
            error.message
        );

        return;

    }



    if(!data.user){

        showMessage(
            "Пользователь создан. Проверьте почту."
        );

        return;

    }



    /*
       Создаем профиль
    */


    const {
        error:
        profileError

    } =
    await supabaseClient
    .from("profiles")
    .insert({

        id:
            data.user.id,

        nickname:
            nickname,

        vip_level:
            0

    });



    if(profileError){


        console.error(
            profileError
        );


        showMessage(
            "Аккаунт создан, но профиль не создан: "
            +
            profileError.message
        );


        return;

    }



    showMessage(
        "Регистрация успешна!"
    );



    setTimeout(

        function(){

            location.reload();

        },

        1500

    );


};


}





/* ============================================================
   LOGIN
   ============================================================ */


const loginButton =
document.getElementById(
    "loginSubmit"
);



if(loginButton){


loginButton.onclick =
async function(){


    const email =
    document.getElementById(
        "loginEmail"
    ).value.trim();



    const password =
    document.getElementById(
        "loginPassword"
    ).value;



    if(!email ||
       !password){


        showMessage(
            "Введите email и пароль"
        );


        return;

    }




    showMessage(
        "Вход..."
    );



    const {

        data,

        error

    } =
    await supabaseClient
    .auth
    .signInWithPassword({

        email:
            email,

        password:
            password

    });



    if(error){


        showMessage(
            error.message
        );


        return;

    }




    showMessage(
        "Добро пожаловать!"
    );



    setTimeout(

        function(){

            location.reload();

        },

        1000

    );



};


}





/* ============================================================
   CHECK USER
   ============================================================ */


async function checkAuth(){


const {

    data

}
=
await supabaseClient
.auth
.getUser();



if(
    data.user
){

    console.log(
        "[AUTH] User:",
        data.user.email
    );


}



}



checkAuth();





/* ============================================================
   HELPERS
   ============================================================ */


function showMessage(text){


if(message){

    message.innerText =
        text;

}


}



function clearMessage(){


if(message){

    message.innerText =
        "";

}


}
