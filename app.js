```javascript
// ===============================
// SUPABASE CONFIG
// ===============================

const SUPABASE_URL = 
"https://uvzaoobtysostmfwyfxm.supabase.co";


const SUPABASE_KEY = 
"sb_publishable_-7M1kuwWOeRq21SfrLiojg_0qngL_7s";


const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);




// ===============================
// НАВИГАЦИЯ
// ===============================

function showSection(id){


    document
    .querySelectorAll(".page")
    .forEach(page=>{

        page.classList.remove("active");

    });



    const section =
    document.getElementById(id);


    if(section){

        section.classList.add("active");

    }


}




// ===============================
// РЕГИСТРАЦИЯ
// ===============================


async function register(){


    const email =
    document.getElementById("email").value;


    const password =
    document.getElementById("password").value;


    const nickname =
    document.getElementById("nickname").value;



    const message =
    document.getElementById("authMessage");



    if(!email || !password || !nickname){

        message.innerHTML =
        "Заполните все поля";

        return;

    }




    const {data,error} =
    await supabaseClient.auth.signUp({

        email,

        password

    });



    if(error){


        message.innerHTML =
        error.message;


        return;

    }




    const user =
    data.user;



    if(!user){


        message.innerHTML =
        "Пользователь не создан";


        return;

    }




    // создание профиля

    const {error:profileError}=

    await supabaseClient

    .from("profiles")

    .insert([

        {

            id:user.id,

            nickname:nickname,

            avatar_url:
            "https://i.imgur.com/6VBx3io.png",

            city:"",

            age:null,

            vip_level:0

        }

    ]);





    if(profileError){


        message.innerHTML =

        "Аккаунт создан, но профиль: "

        + profileError.message;


        return;


    }





    message.innerHTML =

    "Регистрация успешна";


}








// ===============================
// ВХОД
// ===============================



async function login(){


    const email =

    document.getElementById("email").value;



    const password =

    document.getElementById("password").value;



    const message =

    document.getElementById("authMessage");





    const {data,error}=

    await supabaseClient.auth.signInWithPassword({

        email,

        password

    });





    if(error){


        message.innerHTML =

        error.message;


        return;


    }





    message.innerHTML =

    "Вход выполнен";



    updateMenu();


    loadProfile();


    showSection("profile");



}








// ===============================
// ВЫХОД
// ===============================



async function logout(){


    await supabaseClient.auth.signOut();


    updateMenu();


    showSection("home");


}









// ===============================
// МЕНЮ ПОЛЬЗОВАТЕЛЯ
// ===============================


async function updateMenu(){


    const {

        data:{session}

    } =

    await supabaseClient.auth.getSession();




    const loginBtn =

    document.getElementById("loginBtn");


    const logoutBtn =

    document.getElementById("logoutBtn");





    if(session){


        loginBtn.classList.add("hidden");


        logoutBtn.classList.remove("hidden");


    }

    else{


        loginBtn.classList.remove("hidden");


        logoutBtn.classList.add("hidden");


    }


}









// ===============================
// ЗАГРУЗКА ПРОФИЛЯ
// ===============================



async function loadProfile(){


    const {

        data:{user}

    } =

    await supabaseClient.auth.getUser();




    if(!user){

        return;

    }




    const {data,error}=

    await supabaseClient

    .from("profiles")

    .select("*")

    .eq("id",user.id)

    .single();





    if(error){


        console.log(error);


        return;

    }




    document.getElementById("avatar").src =

    data.avatar_url ||

    "https://i.imgur.com/6VBx3io.png";




    document.getElementById("avatarUrl").value =

    data.avatar_url || "";




    document.getElementById("profileNickname").value =

    data.nickname || "";




    document.getElementById("city").value =

    data.city || "";




    document.getElementById("age").value =

    data.age || "";





}









// ===============================
// СОХРАНЕНИЕ ПРОФИЛЯ
// ===============================



async function saveProfile(){


    const {

        data:{user}

    } =

    await supabaseClient.auth.getUser();




    if(!user){

        alert("Нет авторизации");

        return;

    }






    const avatar =

    document.getElementById("avatarUrl").value;



    const nickname =

    document.getElementById("profileNickname").value;



    const city =

    document.getElementById("city").value;



    const age =

    document.getElementById("age").value;






    const {error}=

    await supabaseClient

    .from("profiles")

    .update({

        avatar_url:avatar,

        nickname:nickname,

        city:city,

        age:age ? Number(age):null

    })

    .eq("id",user.id);






    if(error){


        alert(error.message);


        return;

    }





    document.getElementById("avatar").src = avatar;



    alert("Профиль сохранён");



}








// ===============================
// СТАРТ
// ===============================


document.addEventListener(

"DOMContentLoaded",

async()=>{


    updateMenu();


    const {

        data:{session}

    } =

    await supabaseClient.auth.getSession();




    if(session){

        loadProfile();

    }


}

);
```
