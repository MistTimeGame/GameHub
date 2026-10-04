////////////////////////////////////////////////////
// SUPABASE CONFIG
////////////////////////////////////////////////////


const SUPABASE_URL = 
"https://uvzaoobtysostmfwyfxm.supabase.co";


const SUPABASE_KEY = 
"sb_publishable_-7M1kuwWOeRq21SfrLiojg_0qngL_7s";


const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);





////////////////////////////////////////////////////
// ELEMENTS
////////////////////////////////////////////////////


const pages = document.querySelectorAll(".page");

const menuButtons = document.querySelectorAll(".menu-btn");


const openLogin = document.getElementById("open-login");

const logoutBtn = document.getElementById("logout");



const emailInput =
document.getElementById("email");


const passwordInput =
document.getElementById("password");


const nicknameInput =
document.getElementById("nickname");



const authMessage =
document.getElementById("auth-message");





////////////////////////////////////////////////////
// PAGE SWITCH
////////////////////////////////////////////////////


menuButtons.forEach(btn => {


    btn.addEventListener(
        "click",
        ()=>{


            pages.forEach(page=>{
                page.classList.remove("active");
            });


            menuButtons.forEach(b=>{
                b.classList.remove("active");
            });



            const page =
            document.getElementById(
                btn.dataset.page
            );


            if(page){

                page.classList.add("active");

            }


            btn.classList.add("active");



        }
    );


});






////////////////////////////////////////////////////
// OPEN LOGIN
////////////////////////////////////////////////////


openLogin.onclick = ()=>{


    pages.forEach(page=>{
        page.classList.remove("active");
    });



    document
    .getElementById("auth")
    .classList.add("active");

};






////////////////////////////////////////////////////
// REGISTER
////////////////////////////////////////////////////


document
.getElementById("register")
.onclick = async ()=>{


    const email =
    emailInput.value.trim();


    const password =
    passwordInput.value.trim();


    const nickname =
    nicknameInput.value.trim();



    if(!email || !password){

        authMessage.innerHTML =
        "Заполните email и пароль";

        return;

    }




    const {data,error} =
    await supabaseClient.auth.signUp({

        email,
        password,


        options:{

            data:{

                nickname:nickname || "Player"

            }

        }


    });





    if(error){


        authMessage.innerHTML =
        error.message;


        return;

    }





    authMessage.innerHTML =
    "Аккаунт создан. Проверьте почту.";




};









////////////////////////////////////////////////////
// LOGIN
////////////////////////////////////////////////////


document
.getElementById("login")
.onclick = async ()=>{


    const email =
    emailInput.value.trim();



    const password =
    passwordInput.value.trim();





    const {data,error} =
    await supabaseClient.auth.signInWithPassword({

        email,

        password

    });





    if(error){


        authMessage.innerHTML =
        error.message;


        return;

    }



    authMessage.innerHTML =
    "Вход выполнен";



    await loadProfile();



};









////////////////////////////////////////////////////
// LOGOUT
////////////////////////////////////////////////////


logoutBtn.onclick = async ()=>{


    await supabaseClient.auth.signOut();



    location.reload();


};









////////////////////////////////////////////////////
// LOAD SESSION
////////////////////////////////////////////////////


async function checkUser(){



    const {

        data:{
            session

        }

    } =
    await supabaseClient.auth.getSession();





    if(session){


        openLogin.classList.add("hidden");


        logoutBtn.classList.remove("hidden");


        await loadProfile();


    }



}









////////////////////////////////////////////////////
// LOAD PROFILE
////////////////////////////////////////////////////


async function loadProfile(){



    const {

        data:{
            user

        }

    } =
    await supabaseClient.auth.getUser();




    if(!user)
        return;






    const {

        data,
        error

    } = await supabaseClient

    .from("profiles")

    .select("*")

    .eq(
        "id",
        user.id
    )

    .single();






    if(error){


        console.log(error);


        return;

    }






    document
    .getElementById("mini-name")
    .innerHTML =
    data.nickname;



    document
    .getElementById("mini-status")
    .innerHTML =
    "Онлайн";




    document
    .getElementById("mini-avatar")
    .src =
    data.avatar_url;




    document
    .getElementById("profile-avatar")
    .src =
    data.avatar_url;



    document
    .getElementById("profile-nickname")
    .value =
    data.nickname;



    document
    .getElementById("profile-city")
    .value =
    data.city || "";



    document
    .getElementById("profile-age")
    .value =
    data.age || 0;



    document
    .getElementById("vip-level")
    .innerHTML =
    data.vip_level;




}










////////////////////////////////////////////////////
// SAVE PROFILE
////////////////////////////////////////////////////


document
.getElementById("save-profile")
.onclick = async ()=>{



    const {

        data:{
            user

        }

    } =
    await supabaseClient.auth.getUser();





    if(!user){

        alert(
        "Сначала войдите"
        );

        return;

    }





    const avatar =
    document
    .getElementById("avatar-url")
    .value;





    const nickname =
    document
    .getElementById("profile-nickname")
    .value;





    const city =
    document
    .getElementById("profile-city")
    .value;





    const age =
    Number(
    document
    .getElementById("profile-age")
    .value
    );







    const {error} =
    await supabaseClient

    .from("profiles")

    .update({

        avatar_url:avatar,

        nickname,

        city,

        age


    })

    .eq(
        "id",
        user.id
    );





    if(error){

        alert(error.message);

        return;

    }





    loadProfile();



    alert(
    "Профиль сохранён"
    );



};










////////////////////////////////////////////////////
// START
////////////////////////////////////////////////////


checkUser();
