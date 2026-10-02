/*
=================================================
GAME GUILD PLATFORM
APP CORE v2.2.0
AUTH + GAMES FIX
=================================================
*/


let currentUser = null;

let gamesCache = [];





/*
=================================================
START
=================================================
*/


document.addEventListener(
"DOMContentLoaded",
async()=>{


console.log(
"APP START"
);



await restoreSession();


await loadGames();



});









/*
=================================================
SESSION
=================================================
*/


async function restoreSession(){


try{


const {

data,

error

}=await supabaseClient.auth.getSession();





console.log(
"SESSION",
data,
error
);





if(data.session){



currentUser =
data.session.user;



showProfile();



}

else{


showLoginButton();



}



}

catch(e){


console.error(
e
);


}



}









/*
=================================================
AUTH WINDOW
=================================================
*/


function openLogin(){



const win =

document.getElementById(
"authWindow"
);




if(!win){


console.error(
"authWindow not found"
);


return;


}



win.style.display =
"flex";



}






function closeLogin(){



const win =

document.getElementById(
"authWindow"
);




if(!win){


return;


}




win.style.display =
"none";



}









/*
=================================================
REGISTER
=================================================
*/


async function register(){



const email =

document
.getElementById(
"regEmail"
)
.value
.trim();





const password =

document
.getElementById(
"regPassword"
)
.value;





const nickname =

document
.getElementById(
"regName"
)
.value
.trim();







if(!email || !password){


alert(
"Введите email и пароль"
);


return;


}






const {

data,

error

}=await supabaseClient.auth.signUp({

email,

password,


options:{


data:{


username:nickname


}


}


});





console.log(
"REGISTER",
data,
error
);






if(error){


alert(
error.message
);


return;


}





alert(
"Регистрация выполнена"
);



}









/*
=================================================
LOGIN
=================================================
*/


async function login(){



console.log(
"LOGIN START"
);





const email =

document
.getElementById(
"loginEmail"
)
.value
.trim();





const password =

document
.getElementById(
"loginPassword"
)
.value;






if(!email || !password){


alert(
"Введите email и пароль"
);


return;


}







try{



const {

data,

error

}=await supabaseClient.auth.signInWithPassword({

email,

password

});






console.log(
"LOGIN RESULT",
data,
error
);






if(error){


alert(
error.message
);


return;


}







currentUser =
data.user;






closeLogin();






showProfile();





await loadGames();






alert(
"Вход выполнен"
);





}

catch(e){



console.error(e);



alert(
"Ошибка входа: "
+
e.message
);



}



}









/*
=================================================
LOGOUT
=================================================
*/


async function logout(){



await supabaseClient.auth.signOut();



currentUser=null;



location.reload();



}









/*
=================================================
PROFILE
=================================================
*/


function showProfile(){



const block =

document
.getElementById(
"profileBlock"
);





if(block){



block.innerHTML=`

<button onclick="logout()">

${currentUser.email}

<br>

Выйти

</button>

`;



}





const profile =

document
.getElementById(
"profile"
);





if(profile){


profile.hidden=false;


}





const name =

document
.getElementById(
"profileName"
);





if(name){


name.innerText =
currentUser.email;


}



}









function showLoginButton(){



const block =

document
.getElementById(
"profileBlock"
);




if(block){



block.innerHTML=`

<button onclick="openLogin()">

Войти

</button>

`;



}



}









/*
=================================================
LOAD GAMES
=================================================
*/


async function loadGames(){



const {

data,

error

}=await supabaseClient

.from("games")

.select("*")

.order(

"created_at",

{

ascending:false

}

);






console.log(
"GAMES",
data,
error
);







if(error){


console.error(
error.message
);


return;


}





gamesCache =
data || [];





renderGames(
gamesCache
);



}









/*
=================================================
SEARCH
=================================================
*/


function searchGames(){



const value =

document
.getElementById(
"gameSearch"
)
.value

.toLowerCase();





const result =

gamesCache.filter(

game =>

game.name

.toLowerCase()

.includes(value)

);





renderGames(result);



}









/*
=================================================
RENDER GAMES
=================================================
*/


function renderGames(list){



const box =

document
.getElementById(
"gamesList"
);





if(!box)

return;





box.innerHTML="";







list.forEach(game=>{



box.innerHTML +=`

<div

class="game-card"

onclick="openGame('${game.id}')"

>



${

game.logo_url

?

`

<img src="${game.logo_url}">

`

:

""

}




<h3>

${game.name}

</h3>




<p>

${game.description || ""}

</p>




</div>

`;



});



}









function openGame(id){



location.href =

"game.html?id="+id;



}









/*
=================================================
CREATE GAME
=================================================
*/


function openCreateGame(){



if(!currentUser){


openLogin();


return;


}





const box =

document
.getElementById(
"createGame"
);





if(box)

box.hidden=false;



}









async function createGame(){



if(!currentUser){


alert(
"Нужно войти"
);


return;


}





const name =

document
.getElementById(
"gameName"
)
.value
.trim();





const description =

document
.getElementById(
"gameDescription"
)
.value;





const logo =

document
.getElementById(
"gameLogo"
)
.value;







if(!name){


alert(
"Введите название игры"
);


return;


}








const {

error

}=await supabaseClient

.from("games")

.insert({


name:name,


description:description,


logo_url:logo,


created_by:
currentUser.id,


status:
"published"



});







if(error){


alert(
error.message
);


return;


}







alert(
"Игра создана"
);



location.reload();



}
