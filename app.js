// ================================
// SUPABASE
// ================================


const SUPABASE_URL =
"https://uvzaoobtysostmfwyfxm.supabase.co";


const SUPABASE_KEY =
"sb_publishable_-7M1kuwWOeRq21SfrLiojg_0qngL_7s";



const supabaseClient =
supabase.createClient(
SUPABASE_URL,
SUPABASE_KEY
);




// ================================
// НАВИГАЦИЯ
// ================================


function showAuth(){


document.getElementById("app").innerHTML = `


<div class="card">


<h2>
Вход / Регистрация
</h2>


<input id="email"
placeholder="Email">


<input id="password"
type="password"
placeholder="Пароль">


<button onclick="register()">
Регистрация
</button>


<button onclick="login()">
Войти
</button>


</div>

`;

}





function showProfile(){


document.getElementById("app").innerHTML = `


<div class="card">


<h2>
Мой профиль
</h2>


<img class="avatar"
src="https://cdn-icons-png.flaticon.com/512/4712/4712109.png">


<input placeholder="Никнейм">


<input placeholder="Город">


<input placeholder="Возраст">


<button>
Сохранить
</button>


</div>


`;

}




function showGames(){


document.getElementById("app").innerHTML=`

<div class="card">

<h2>
Игры
</h2>

<p>
Пока игр нет.
</p>

<button>
Добавить игру
</button>


</div>

`;

}




function showGuilds(){


document.getElementById("app").innerHTML=`

<div class="card">

<h2>
Гильдии
</h2>

<p>
Создавай игровые сообщества.
</p>

<button>
Создать гильдию
</button>


</div>

`;

}





// ================================
// AUTH
// ================================



async function register(){


let email =
document.getElementById("email").value;


let password =
document.getElementById("password").value;



const {

data,

error

}=await supabaseClient.auth.signUp({

email,

password

});



if(error){

alert(error.message);

return;

}



alert(
"Аккаунт создан"
);



}





async function login(){


let email =
document.getElementById("email").value;


let password =
document.getElementById("password").value;



const {

data,

error

}=await supabaseClient.auth.signInWithPassword({

email,

password

});



if(error){

alert(error.message);

return;

}



alert(
"Вы вошли"
);



showProfile();


}
