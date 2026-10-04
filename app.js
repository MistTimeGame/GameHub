// =====================================
// SUPABASE CONFIG
// =====================================


// ВСТАВЬ СЮДА СВОИ ДАННЫЕ

const SUPABASE_URL = 
"https://uvzaoobtysostmfwyfxm.supabase.co";


const SUPABASE_KEY =
"sb_publishable_-7M1kuwWOeRq21SfrLiojg_0qngL_7s";



const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);




// =====================================
// GLOBAL
// =====================================


let currentUser = null;





// =====================================
// ПЕРЕКЛЮЧЕНИЕ СТРАНИЦ
// =====================================


function showPage(page){


    document
    .querySelectorAll(".page")
    .forEach(p=>{
        p.classList.remove("active");
    });



    let element =
    document.getElementById(page);



    if(element){

        element.classList.add("active");

    }


}





// =====================================
// ПРОВЕРКА СЕССИИ
// =====================================


async function checkSession(){


    const {

        data

    } =
    await supabaseClient.auth.getSession();



    if(data.session){


        currentUser =
        data.session.user;



        showPage("home");


        loadProfile();

    }
    else{


        showPage("auth");


    }



}







// =====================================
// РЕГИСТРАЦИЯ
// =====================================


async function register(){



    const email =
    document
    .getElementById("regEmail")
    .value;


    const password =
    document
    .getElementById("regPassword")
    .value;



    const nickname =
    document
    .getElementById("regNickname")
    .value;





    const {

        data,
        error

    } =

    await supabaseClient
    .auth
    .signUp({

        email,
        password

    });





    if(error){


        alert(error.message);

        return;

    }






    const user =
    data.user;





    const {

        error:profileError

    } =


    await supabaseClient
    .from("profiles")
    .insert({

        id:user.id,

        nickname:nickname,

        avatar_url:
        "https://cdn-icons-png.flaticon.com/512/4712/4712109.png",

        city:"",

        age:null,

        vip_level:0


    });






    if(profileError){


        alert(
        "Аккаунт создан, но профиль ошибка: "
        +
        profileError.message
        );


        return;


    }





    alert(
    "Регистрация успешна"
    );



}








// =====================================
// ВХОД
// =====================================


async function login(){



    const email =
    document
    .getElementById("loginEmail")
    .value;



    const password =
    document
    .getElementById("loginPassword")
    .value;




    const {

        data,
        error

    } =


    await supabaseClient
    .auth
    .signInWithPassword({

        email,

        password

    });







    if(error){


        alert(error.message);

        return;

    }





    currentUser =
    data.user;




    alert(
    "Вход выполнен"
    );



    showPage("home");


    loadProfile();


}









// =====================================
// ВЫХОД
// =====================================


async function logout(){


    await supabaseClient
    .auth
    .signOut();



    currentUser=null;



    showPage("auth");


}








// =====================================
// ПРОФИЛЬ
// =====================================



async function loadProfile(){



    if(!currentUser)
    return;





    const {

        data,
        error

    } =


    await supabaseClient

    .from("profiles")

    .select("*")

    .eq(
        "id",
        currentUser.id
    )

    .single();






    if(error){

        console.log(error);

        return;

    }





    document
    .getElementById("avatar")
    .src =
    data.avatar_url;



    document
    .getElementById("avatarUrl")
    .value =
    data.avatar_url;



    document
    .getElementById("profileInfo")
    .innerHTML =

    `

    <h3>
    ${data.nickname}
    </h3>

    <p>
    VIP уровень:
    ${data.vip_level}
    </p>

    `;




}







async function saveProfile(){



    if(!currentUser){

        alert(
        "Сначала войдите"
        );

        return;

    }





    const avatar =

    document
    .getElementById("avatarUrl")
    .value;






    const {

        error

    } =


    await supabaseClient

    .from("profiles")

    .update({

        avatar_url:avatar

    })


    .eq(
        "id",
        currentUser.id
    );






    if(error){


        alert(error.message);


        return;

    }




    document
    .getElementById("avatar")
    .src=avatar;



}








// =====================================
// ЧАТ
// =====================================



async function loadMessages(){



    const {

        data

    } =


    await supabaseClient

    .from("messages")

    .select("*")

    .order(
        "created_at",
        {
            ascending:true
        }
    );





    const box =
    document
    .getElementById("messages");



    box.innerHTML="";





    data.forEach(msg=>{


        box.innerHTML +=


        `

        <div class="message">

        <b>
        ${msg.nickname || "User"}
        </b>

        :

        ${msg.text}

        </div>

        `;


    });



}





async function sendMessage(){



    if(!currentUser){

        alert(
        "Войдите"
        );

        return;

    }




    const input =
    document
    .getElementById("messageInput");



    let text =
    input.value.trim();





    if(!text)
    return;







    const {

        data:userProfile

    } =


    await supabaseClient

    .from("profiles")

    .select("nickname")

    .eq(
        "id",
        currentUser.id
    )

    .single();








    await supabaseClient

    .from("messages")

    .insert({

        user_id:
        currentUser.id,

        nickname:
        userProfile.nickname,

        text:text


    });






    input.value="";


    loadMessages();



}









// =====================================
// REALTIME CHAT
// =====================================


function startChat(){



supabaseClient

.channel("messages-room")


.on(

"postgres_changes",

{

event:"INSERT",

schema:"public",

table:"messages"

},

(payload)=>{


loadMessages();


}

)


.subscribe();



}









// =====================================
// НОВОСТИ
// =====================================


async function loadNews(){



const {

data

}=


await supabaseClient

.from("news")

.select("*")

.order(

"created_at",

{

ascending:false

}

);





const box =
document.getElementById("news");



if(!data || data.length===0)

{

box.innerHTML=
"Новостей пока нет";


return;

}



box.innerHTML="";



data.forEach(item=>{


box.innerHTML +=


`

<div class="message">

<h3>

${item.title}

</h3>


<p>

${item.text}

</p>


</div>


`;



});



}









// =====================================
// START
// =====================================



window.onload=function(){


checkSession();


loadNews();


startChat();


};
