/*
=================================================
GAME GUILD PLATFORM
APP.JS v3.0
FULL AUTH + GAMES
=================================================
*/


let currentUser = null;

let gamesCache = [];




document.addEventListener(
"DOMContentLoaded",
async()=>{


console.log(
"APP START"
);


await initAuth();


await loadGames();


});







/*
=================================================
AUTH INIT
=================================================
*/


async function initAuth(){


try{


const {

data,

error

}=await supabaseClient.auth.getSession();




if(error){

console.error(error);

showLoginButton();

return;

}





if(data.session){


currentUser =
data.session.user;


console.log(
"USER:",
currentUser
);


showProfile();


}

else{


showLoginButton();


}



}
catch(e){


console.error(e);


showLoginButton();


}



}









/*
=================================================
AUTH WINDOW
=================================================
*/


function openLogin(){


const box =
document.getElementById(
"authWindow"
);



if(box){


box.hidden=false;

box.style.display="flex";


}



}





function closeLogin(){


const box =
document.getElementById(
"authWindow"
);



if(box){


box.hidden=true;

box.style.display="none";


}



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





const name =
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


display_name:name


}


}


});







if(error){


alert(error.message);


return;


}





if(data.user){



await supabaseClient

.from("profiles")

.insert({

id:data.user.id,

username:name,

display_name:name


});


}





alert(
"Регистрация завершена"
);



}









/*
=================================================
LOGIN
=================================================
*/


async function login(){



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
"Введите данные"
);


return;


}







const {

data,

error

}=await supabaseClient.auth.signInWithPassword({


email,

password


});








if(error){


alert(
error.message
);


return;


}





currentUser =
data.user;





console.log(
"LOGIN OK",
currentUser
);





closeLogin();





showProfile();





await loadGames();



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



const box =

document.getElementById(
"profileBlock"
);




if(box){


box.innerHTML=`

<button onclick="logout()">

${currentUser.email}

<br>

Выйти

</button>

`;


}





const profile =

document.getElementById(
"profile"
);



if(profile){


profile.hidden=false;


}



}








function showLoginButton(){



const box =

document.getElementById(
"profileBlock"
);



if(box){


box.innerHTML=`

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







if(error){


console.error(
"LOAD GAMES",
error
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



const text =

document
.getElementById(
"gameSearch"
)
.value

.toLowerCase();






const result =

gamesCache.filter(game=>{


return (

game.name || ""

)

.toLowerCase()

.includes(text);



});







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



box.innerHTML+=`

<div class="game-card"

onclick="openGame('${game.id}')">


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




document

.getElementById(
"createGame"
)

.hidden=false;



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
"Введите название"
);


return;


}








const {

error

}=await supabaseClient

.from("games")

.insert({

name,

description,

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
