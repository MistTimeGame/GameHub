// ===============================
// GamePlatform APP.JS
// Auth + Profile + Chat + Conference
// ===============================


// ---------- SUPABASE ----------

const SUPABASE_URL = "https://uvzaoobtysostmfwyfxm.supabase.co";

const SUPABASE_KEY = "sb_publishable_-7M1kuwWOeRq21SfrLiojg_0qngL_7s";


const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);



// ---------- GLOBAL ----------

let currentUser = null;



// ---------- START ----------

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        await checkSession();

        initButtons();

        loadChat();

        loadConference();

    }
);




// ===============================
// AUTH
// ===============================



async function checkSession(){

    const {
        data
    } = await supabaseClient
        .auth
        .getSession();


    if(data.session){

        currentUser =
            data.session.user;


        showProfile();

    }

}





async function register(){


    const email =
        document.getElementById("email").value;


    const password =
        document.getElementById("password").value;


    const nickname =
        document.getElementById("nickname").value;



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



    if(user){


        const {
            error:profileError
        }
        =
        await supabaseClient
        .from("profiles")
        .insert({

            id:user.id,

            nickname:nickname,

            avatar_url:"",

            city:"",

            age:null,

            vip_level:0

        });



        if(profileError){

            console.log(profileError);

            alert(
              "Аккаунт создан, но профиль не создан"
            );

            return;

        }


        alert(
        "Регистрация успешна"
        );


    }


}






async function login(){


    const email =
    document.getElementById("email").value;



    const password =
    document.getElementById("password").value;



    const {
        data,
        error
    }
    =
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



    showProfile();


}






async function logout(){


    await supabaseClient
    .auth
    .signOut();



    location.reload();


}






// ===============================
// PROFILE
// ===============================



async function showProfile(){


    if(!currentUser)
    return;



    const {
        data,
        error
    }
    =
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



    let box =
    document.getElementById(
        "profileBox"
    );



    if(!box)
    return;



    box.innerHTML = `

    <div class="profile">

        <img class="avatar"
        src="${
        data.avatar_url ||
        'https://i.imgur.com/8Km9tLL.png'
        }">


        <h2>
        ${data.nickname}
        </h2>


        <p>
        Город:
        ${data.city || "-"}
        </p>


        <p>
        Возраст:
        ${data.age || "-"}
        </p>


        <p>
        VIP:
        ${data.vip_level}
        </p>


        <button onclick="logout()">
        Выйти
        </button>


    </div>

    `;


}




async function saveProfile(){


    const avatar =
    document.getElementById(
        "avatar"
    ).value;


    const city =
    document.getElementById(
        "city"
    ).value;


    const age =
    document.getElementById(
        "age"
    ).value;



    await supabaseClient
    .from("profiles")
    .update({

        avatar_url:avatar,

        city:city,

        age:
        age ? Number(age):null

    })
    .eq(
        "id",
        currentUser.id
    );



    showProfile();

}




// ===============================
// CHAT
// ===============================



async function sendMessage(){


    if(!currentUser)
    return alert(
        "Сначала войдите"
    );


    const input =
    document.getElementById(
        "messageInput"
    );


    let text =
    input.value.trim();



    if(!text)
    return;



    const {
        data:profile
    }
    =
    await supabaseClient
    .from("profiles")
    .select("*")
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
        profile.nickname,

        avatar_url:
        profile.avatar_url,

        message:text

    });



    input.value="";


    loadChat();


}




async function loadChat(){


    const {
        data
    }
    =
    await supabaseClient
    .from("messages")
    .select("*")
    .order(
        "created_at",
        {
            ascending:true
        }
    );



    let box =
    document.getElementById(
        "chatMessages"
    );


    if(!box || !data)
    return;



    box.innerHTML="";



    data.forEach(
        m=>{


        box.innerHTML += `

        <div class="message">


        <b>
        ${m.nickname}
        </b>

        :

        ${m.message}


        </div>

        `;


        }
    );



}






// ===============================
// CONFERENCE
// ===============================



async function sendConference(){


    if(!currentUser)
    return;



    let input =
    document.getElementById(
        "conferenceInput"
    );


    let text =
    input.value.trim();



    if(!text)
    return;



    const {
        data:profile
    }
    =
    await supabaseClient
    .from("profiles")
    .select("*")
    .eq(
        "id",
        currentUser.id
    )
    .single();



    await supabaseClient
    .from("conference")
    .insert({

        user_id:
        currentUser.id,


        nickname:
        profile.nickname,


        avatar_url:
        profile.avatar_url,


        text:text

    });



    input.value="";


    loadConference();


}







async function loadConference(){


    const {
        data
    }
    =
    await supabaseClient
    .from("conference")
    .select("*")
    .order(
        "created_at",
        {
            ascending:true
        }
    );



    const box =
    document.getElementById(
        "conferenceMessages"
    );



    if(!box || !data)
    return;



    box.innerHTML="";



    data.forEach(
        c=>{


        box.innerHTML += `

        <div class="conference-message">

        <b>
        ${c.nickname}
        </b>

        :

        ${c.text}

        </div>

        `;


        }
    );


}







// ===============================
// BUTTONS
// ===============================


function initButtons(){


const reg =
document.getElementById(
"registerBtn"
);


if(reg)
reg.onclick =
register;



const log =
document.getElementById(
"loginBtn"
);


if(log)
log.onclick =
login;



const save =
document.getElementById(
"saveProfileBtn"
);


if(save)
save.onclick =
saveProfile;



const send =
document.getElementById(
"sendMessageBtn"
);


if(send)
send.onclick =
sendMessage;



const conf =
document.getElementById(
"sendConferenceBtn"
);


if(conf)
conf.onclick =
sendConference;


}
