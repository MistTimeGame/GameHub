/*
====================================================
GAME PLATFORM
AUTH MODULE
Supabase Auth + Profiles

Файл:
js/auth.js

Зависимости:
js/supabase.js

====================================================
*/


(function () {

"use strict";


let currentUser = null;



/*
====================================================
ELEMENTS
====================================================
*/


function get(id){

    return document.getElementById(id);

}



/*
====================================================
UI
====================================================
*/


function updateAuthUI(user){

    const loginBtn =
        get("login-button");


    const registerBtn =
        get("register-button");


    const profileBtn =
        get("profile-button");


    const logoutBtn =
        get("logout-button");


    const userName =
        get("user-name");



    if(user){


        if(loginBtn)
            loginBtn.style.display="none";


        if(registerBtn)
            registerBtn.style.display="none";


        if(profileBtn)
            profileBtn.style.display="inline-flex";


        if(logoutBtn)
            logoutBtn.style.display="inline-flex";


        if(userName){

            userName.textContent =
                user.email;

        }


    }
    else{


        if(loginBtn)
            loginBtn.style.display="inline-flex";


        if(registerBtn)
            registerBtn.style.display="inline-flex";


        if(profileBtn)
            profileBtn.style.display="none";


        if(logoutBtn)
            logoutBtn.style.display="none";


        if(userName)
            userName.textContent="";


    }


}



/*
====================================================
CREATE PROFILE
====================================================
*/


async function createProfile(user,nickname){


    const {data,error} =

        await window.supabaseClient
        .from("profiles")
        .insert({

            id:user.id,

            nickname:
                nickname ||
                "Player",

            avatar_url:
                null,

            city:
                null,

            age:
                null,

            vip_level:
                0

        });



    if(error){

        console.error(
            "PROFILE ERROR:",
            error
        );


        throw error;

    }


    return data;


}



/*
====================================================
REGISTER
====================================================
*/


async function register(
    email,
    password,
    nickname
){


    const {
        data,
        error

    } =
    await window.supabaseClient.auth
    .signUp({

        email,

        password

    });



    if(error){

        alert(
            error.message
        );

        return false;

    }



    const user =
        data.user;



    if(!user){

        alert(
            "Аккаунт создан. Подтвердите email."
        );

        return true;

    }



    try{


        await createProfile(
            user,
            nickname
        );


        alert(
            "Регистрация успешна!"
        );


        updateAuthUI(user);


        return true;


    }
    catch(e){


        alert(
            "Аккаунт создан, но профиль не создан:\n\n"
            +
            e.message
        );


        return false;

    }


}



/*
====================================================
LOGIN
====================================================
*/


async function login(
    email,
    password
){


    const {

        data,

        error

    } =

    await window.supabaseClient.auth
    .signInWithPassword({

        email,

        password

    });



    if(error){


        alert(
            error.message
        );


        return false;

    }



    currentUser =
        data.user;


    updateAuthUI(
        currentUser
    );


    return true;


}




/*
====================================================
LOGOUT
====================================================
*/


async function logout(){


    await window.supabaseClient.auth
    .signOut();


    currentUser=null;


    updateAuthUI(
        null
    );


}



/*
====================================================
CHECK SESSION
====================================================
*/


async function checkSession(){


    const {

        data

    } =

    await window.supabaseClient.auth
    .getSession();



    if(
        data.session
    ){


        currentUser =
            data.session.user;


        updateAuthUI(
            currentUser
        );


    }
    else{


        updateAuthUI(
            null
        );


    }



}



/*
====================================================
AUTH STATE LISTENER
====================================================
*/


function initAuth(){



    if(
        !window.supabaseClient
    ){

        console.error(
            "Supabase client отсутствует"
        );

        return;

    }



    checkSession();



    window.supabaseClient.auth
    .onAuthStateChange(

        function(
            event,
            session
        ){


            if(session){


                currentUser =
                    session.user;


                updateAuthUI(
                    currentUser
                );


            }
            else{


                currentUser=null;


                updateAuthUI(
                    null
                );


            }


        }

    );



}



/*
====================================================
EXPORT
====================================================
*/


window.GameAuth = {


    register,

    login,

    logout,

    checkSession,


    getUser:function(){

        return currentUser;

    }


};




document.addEventListener(
"DOMContentLoaded",
initAuth
);


})();
