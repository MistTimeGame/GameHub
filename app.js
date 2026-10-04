// =====================================
// SUPABASE CONFIG
// =====================================


const SUPABASE_URL =

"https://uvzaoobtysostmfwyfxm.supabase.co";



const SUPABASE_KEY =

"sb_publishable_-7M1kuwWOeRq21SfrLiojg_0qngL_7s";



const supabaseClient =

supabase.createClient(

SUPABASE_URL,

SUPABASE_KEY

);




// =====================================
// DEFAULT AVATAR
// =====================================


const DEFAULT_AVATAR =

"https://cdn-icons-png.flaticon.com/512/4712/4712109.png";





// =====================================
// NAVIGATION
// =====================================



function showAuth(){


document.getElementById("app").innerHTML = `


<div class="card">


<h2>
🔐 Вход / Регистрация
</h2>



<label>
Email
</label>


<input 
id="email"
type="email"
placeholder="Введите email">



<label>
Пароль
</label>


<input
id="password"
type="password"
placeholder="Введите пароль">



<button onclick="register()">

Создать аккаунт

</button>



<br><br>



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
👤 Профиль игрока
</h2>



<div class="profile-top">


<img 
id="avatar-preview"
class="avatar"
src="${DEFAULT_AVATAR}">



<div>


<h2 id="profile-name">

Игрок

</h2>


<div id="vip-view" class="vip">

VIP I

</div>


</div>



</div>





<label>
Ссылка на аватар
</label>


<input
id="avatar-url"
placeholder="https://site/avatar.jpg">





<label>
Никнейм
</label>


<input
id="nickname"
placeholder="Введите ник">





<label>
Возраст
</label>


<input
id="age"
type="number"
placeholder="Возраст">





<label>
Город
</label>


<input
id="city"
placeholder="Город">





<label>
VIP уровень
</label>



<select id="vip-level">


<option value="1">
I
</option>


<option value="2">
II
</option>


<option value="3">
III
</option>


<option value="4">
IV
</option>


<option value="5">
V
</option>


<option value="6">
VI
</option>


<option value="7">
VII
</option>


<option value="8">
VIII
</option>


<option value="9">
IX
</option>


<option value="10">
X
</option>


<option value="11">
XI
</option>


<option value="12">
XII
</option>



</select>





<button onclick="saveProfile()">

💾 Сохранить профиль

</button>



</div>


`;



loadProfile();


}






function showGames(){


document.getElementById("app").innerHTML = `


<div class="card">


<h2>
🎮 Игры
</h2>



<p>

Здесь будет каталог игр.

</p>



<button>

Добавить игру

</button>


</div>


`;

}





function showGuilds(){


document.getElementById("app").innerHTML = `


<div class="card">


<h2>
⚔ Гильдии
</h2>


<p>

Создание игровых сообществ.

</p>


<button>

Создать гильдию

</button>



</div>


`;

}





function showConference(){


document.getElementById("app").innerHTML = `


<div class="card">


<h2>
💬 Конференция
</h2>



<p>

Общий игровой чат будет отдельным модулем.

</p>



</div>


`;

}






// =====================================
// REGISTRATION
// =====================================



async function register(){



const email =

document.getElementById("email").value;



const password =

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





if(data.user){



const {

error:profileError

}=await supabaseClient

.from("profiles")

.insert({

id:data.user.id,


nickname:"Игрок",


avatar_url:DEFAULT_AVATAR,


age:null,


city:"",


vip_level:1


});





if(profileError){


console.log(profileError);


}



}




alert(

"Аккаунт создан"

);



}








// =====================================
// LOGIN
// =====================================



async function login(){



const email =

document.getElementById("email").value;



const password =

document.getElementById("password").value;





const {

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

"Вход выполнен"

);



showProfile();



}







// =====================================
// LOAD PROFILE
// =====================================



async function loadProfile(){



const {

data:

{

user

}

}=await supabaseClient.auth.getUser();





if(!user){


return;


}







const {

data,

error

}=await supabaseClient

.from("profiles")

.select("*")

.eq("id",user.id)

.single();







if(error){


console.log(error);


return;


}





document.getElementById("nickname").value =

data.nickname || "";




document.getElementById("age").value =

data.age || "";




document.getElementById("city").value =

data.city || "";




document.getElementById("avatar-url").value =

data.avatar_url || "";




document.getElementById("vip-level").value =

data.vip_level || 1;





updateProfileView(data);



}







// =====================================
// PROFILE VIEW
// =====================================



function updateProfileView(data){



document.getElementById("profile-name")

.innerText =

data.nickname || "Игрок";





document.getElementById("avatar-preview")

.src =

data.avatar_url || DEFAULT_AVATAR;






const roman = [

"",

"I",

"II",

"III",

"IV",

"V",

"VI",

"VII",

"VIII",

"IX",

"X",

"XI",

"XII"

];





document.getElementById("vip-view")

.innerText =

"VIP " +

roman[data.vip_level || 1];



}







// =====================================
// SAVE PROFILE
// =====================================



async function saveProfile(){



const {

data:

{

user

}

}=await supabaseClient.auth.getUser();





if(!user){


alert(

"Сначала войдите"

);


return;


}






const profile = {



id:user.id,



nickname:

document.getElementById("nickname").value,



age:

Number(

document.getElementById("age").value

),



city:

document.getElementById("city").value,



avatar_url:

document.getElementById("avatar-url").value

||

DEFAULT_AVATAR,



vip_level:

Number(

document.getElementById("vip-level").value

)



};







const {

error

}=await supabaseClient

.from("profiles")

.upsert(profile);







if(error){



alert(error.message);


return;


}






alert(

"Профиль сохранён"

);





updateProfileView(profile);



}
