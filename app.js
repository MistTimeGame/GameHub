/*
=================================================
GAME GUILD PLATFORM
MAIN APP v2.0.1
AUTH FIX
=================================================
*/


let currentUser = null;

let gamesCache = [];





/*
=========================
START
=========================
*/


document.addEventListener(
"DOMContentLoaded",
async()=>{


console.log(
"APP START"
);



await checkSession();


await loadGames();



});









/*
=========================
SESSION
=========================
*/


async function checkSession(){


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


console.log(
"USER:",
currentUser.email
);


showProfile();


}

else{


showLoginButton();


}



}

catch(e){


console.error(e);


}


}









/*
=========================
LOGIN WINDOW
=========================
*/


function openLogin(){


const win =
document.getElementById(
"authWindow"
);



if(win)

win.hidden=false;



}



function closeLogin(){


const win =
document.getElementById(
"authWindow"
);



if(win)

win.hidden=true;



}









/*
=========================
REGISTER
=========================
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
"Заполните email и пароль"
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
"Регистрация успешна"
);



}









/*
=========================
LOGIN FIXED
=========================
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

email:email,

password:password


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





alert(
"Вход выполнен"
);





closeLogin();



showProfile();



await loadGames();





}

catch(err){


console.error(
err
);


alert(
"Ошибка входа: "
+
err.message
);



}



}









/*
=========================
LOGOUT
=========================
*/


async function logout(){



await supabaseClient.auth.signOut();



currentUser=null;



location.reload();



}









/*
=========================
PROFILE
=========================
*/


function showProfile(){



const block =

document.getElementById(
"profileBlock"
);



if(block){


block.innerHTML=`

<button onclick="openProfile()">

${currentUser.email}

</button>

`;



}






const profile =

document.getElementById(
"profile"
);



if(profile)

profile.hidden=false;





const name =

document.getElementById(
"profileName"
);



if(name)

name.innerText =
currentUser.email;



}







function showLoginButton(){



const block =

document.getElementById(
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







function openProfile(){


const profile =

document.getElementById(
"profile"
);



if(profile)

profile.hidden=false;



}









/*
=========================
LOAD GAMES
=========================
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
=========================
SEARCH
=========================
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

g=>

g.name

.toLowerCase()

.includes(value)

);



renderGames(result);



}









/*
=========================
RENDER
=========================
*/


function renderGames(list){



const box =

document.getElementById(
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



location.href=

"game.html?id="
+
id;



}









/*
=========================
CREATE GAME
=========================
*/


function openCreateGame(){



if(!currentUser){


alert(
"Сначала войдите"
);



openLogin();


return;


}





document

.getElementById(
"createGame"
)

.hidden=false;



}









async function createGame(){



if(!currentUser)

return;






const name =

document
.getElementById(
"gameName"
)
.value.trim();




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





document
.getElementById(
"createGame"
)
.hidden=true;





loadGames();



}
