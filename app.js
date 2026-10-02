/*
=================================================
GAME GUILD PLATFORM
MAIN APP v2.0.0
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


await checkSession();


await loadGames();


});








/*
=========================
AUTH SESSION
=========================
*/


async function checkSession(){



const {

data

}=await supabaseClient.auth.getSession();




if(
data.session
){


currentUser =
data.session.user;


showProfile();


}

else{


showLoginButton();


}



}









/*
=========================
LOGIN WINDOW
=========================
*/


function openLogin(){


document
.getElementById(
"authWindow"
)
.hidden=false;


}



function closeLogin(){


document
.getElementById(
"authWindow"
)
.hidden=true;


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
.value;



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
.value;





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




if(error){


alert(
error.message
);


return;


}




alert(
"Регистрация создана. Проверьте почту если включено подтверждение."
);



}









/*
=========================
LOGIN
=========================
*/


async function login(){



const email =
document
.getElementById(
"loginEmail"
)
.value;



const password =
document
.getElementById(
"loginPassword"
)
.value;





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



closeLogin();



showProfile();



await loadGames();



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
PROFILE UI
=========================
*/


function showProfile(){



document
.getElementById(
"profileBlock"
)
.innerHTML=`

<button onclick="openProfile()">

${currentUser.email}

</button>

`;



document
.getElementById(
"profile"
)
.hidden=false;



document
.getElementById(
"profileName"
)
.innerText =
currentUser.email;


}





function showLoginButton(){



document
.getElementById(
"profileBlock"
)
.innerHTML=`

<button onclick="openLogin()">

Войти

</button>

`;



}







function openProfile(){



document
.getElementById(
"profile"
)
.hidden=false;


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





if(error){


console.log(error.message);


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



const text =

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
.includes(text)

);



renderGames(result);



}









/*
=========================
RENDER GAMES
=========================
*/


function renderGames(list){



const box =

document
.getElementById(
"gamesList"
);




box.innerHTML="";





list.forEach(game=>{



box.innerHTML += `

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








/*
=========================
OPEN GAME
=========================
*/


function openGame(id){



location.href =
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



if(!currentUser){


return;


}




const name =

document
.getElementById(
"gameName"
)
.value;



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



await loadGames();



}
