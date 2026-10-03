/*
====================================================
GGP v7.0
Игровая сеть
====================================================
*/


let db;

let currentUser=null;

let currentGame=null;

let currentGuild=null;



document.addEventListener(
"DOMContentLoaded",
async()=>{


db=supabase.createClient(

SUPABASE_URL,

SUPABASE_ANON_KEY

);



await checkSession();


loadGames();


});







/*
==========================
SESSION
==========================
*/


async function checkSession(){


const {

data

}=await db.auth.getSession();



if(data.session){


currentUser=data.session.user;


updateUser();


checkAdmin();


}


}








function updateUser(){


userPanel.innerHTML=`

<button onclick="showPage('profile')">

${currentUser.email}

</button>

`;



}









/*
==========================
PAGES
==========================
*/


function showPage(name){


document.querySelectorAll(".page")
.forEach(
p=>p.hidden=true
);



if(name==="home")
homePage.hidden=false;


if(name==="game")
gamePage.hidden=false;


if(name==="guild")
guildPage.hidden=false;


if(name==="profile")
profilePage.hidden=false;


if(name==="admin")
adminPage.hidden=false;



}









/*
==========================
AUTH
==========================
*/


function openLogin(){

loginModal.hidden=false;

}



function closeLogin(){

loginModal.hidden=true;

}







async function register(){



let email=
registerEmail.value;


let password=
registerPassword.value;


let nickname=
registerName.value;





let {

data,

error

}=await db.auth.signUp({

email,

password

});




if(error){

alert(error.message);

return;

}




await db

.from("profiles")

.insert({

id:data.user.id,

username:nickname,

role:"user"

});



alert(
"Регистрация завершена"
);



}









async function login(){



let {

data,

error

}=await db.auth.signInWithPassword({

email:
loginEmail.value,


password:
loginPassword.value


});






if(error){

alert(error.message);

return;

}





currentUser=data.user;


closeLogin();


updateUser();


loadGames();



}









async function logout(){


await db.auth.signOut();


location.reload();


}









/*
==========================
GAMES
==========================
*/


async function loadGames(){



let {

data,

error

}=await db

.from("games")

.select("*")

.order(
"created_at",
{
ascending:false
}
);






if(error){

console.log(error);

return;

}




gamesList.innerHTML="";





data.forEach(
(game,index)=>{



let color=

[
"#0070cc",
"#ff3050",
"#ffd400",
"#7b2cff"
]
[index%4];




gamesList.innerHTML+=`


<div class="game-card"

draggable="true"

style="
border-top:8px solid ${color}
"

ondragend="moveGame(event,'${game.id}')"

onclick="openGame('${game.id}')">



<h2>

🎮 ${game.name}

</h2>



<p>

${game.description || "Описание отсутствует"}

</p>



<div>

Подключение:
○

</div>


</div>



`;



});




}








function searchGames(){


let text=

gameSearch.value.toLowerCase();



document

.querySelectorAll(".game-card")

.forEach(card=>{


card.style.display=

card.innerText
.toLowerCase()
.includes(text)

?

"block"

:

"none";


});


}









/*
==========================
DRAG GAME
==========================
*/


async function moveGame(event,id){


let x=event.clientX;

let y=event.clientY;



await db

.from("games")

.update({

pos_x:x,

pos_y:y

})

.eq(
"id",
id
);



}









/*
==========================
CREATE GAME
==========================
*/


function openCreateGame(){



if(!currentUser){

openLogin();

return;

}


createGameModal.hidden=false;


}



function closeCreateGame(){

createGameModal.hidden=true;

}








async function createGame(){



let {

error

}=await db

.from("games")

.insert({

name:

newGameName.value,


description:

newGameDescription.value,


logo_url:

newGameLogo.value,


created_by:

currentUser.id,


is_public:true,


status:"published"


});





if(error){

alert(error.message);

return;

}



closeCreateGame();


loadGames();



}









async function openGame(id){



let {

data

}=await db

.from("games")

.select("*")

.eq(
"id",
id
)

.single();





currentGame=data;



gameTitle.innerText=data.name;


gameDescription.innerText=
data.description || "";


gameLogo.src=
data.logo_url || "";



showPage("game");


loadGuilds();



}









/*
==========================
GUILDS
==========================
*/


async function loadGuilds(){



let {

data

}=await db

.from("guilds")

.select("*")

.eq(
"game_id",
currentGame.id
);






guildList.innerHTML="";




data.forEach(g=>{


guildList.innerHTML+=`


<div class="guild-card"

onclick="openGuild('${g.id}')">


<h2>

🛡 ${g.name}

</h2>


<p>

${g.tag || ""}

</p>



</div>



`;



});



}









function openCreateGuild(){



if(!currentUser){

openLogin();

return;

}



createGuildModal.hidden=false;



}



function closeCreateGuild(){

createGuildModal.hidden=true;

}









async function createGuild(){



let {

data,

error

}=await db

.from("guilds")

.insert({

game_id:

currentGame.id,


name:

newGuildName.value,


tag:

newGuildTag.value,


description:

newGuildDescription.value,


created_by:

currentUser.id,


is_public:true


})

.select()
.single();





if(error){

alert(error.message);

return;

}




await db

.from("guild_members")

.insert({

guild_id:data.id,

game_id:currentGame.id,

user_id:currentUser.id,

nickname:currentUser.email,

role:"leader"

});




closeCreateGuild();


openGuild(data.id);



}









async function openGuild(id){



let {

data

}=await db

.from("guilds")

.select("*")

.eq(
"id",
id
)

.single();




currentGuild=data;



guildTitle.innerText=data.name;


guildDescription.innerText=
data.description || "";


guildFaction.innerText=
data.faction_name || "Нет";



guildLogo.src=
data.logo_url || "";



showPage("guild");


loadMembers();


}









async function loadMembers(){


let {

data

}=await db

.from("guild_members")

.select("*")

.eq(
"guild_id",
currentGuild.id
);




membersList.innerHTML="";



data.forEach(m=>{


membersList.innerHTML+=`


<div class="member">


<span>
${m.nickname}
</span>


<b>
${m.role}
</b>


</div>



`;


});



}









async function joinGuild(){



if(!currentUser){

openLogin();

return;

}




await db

.from("guild_members")

.insert({

guild_id:

currentGuild.id,


game_id:

currentGame.id,


user_id:

currentUser.id,


nickname:

currentUser.email,


role:"member"


});



loadMembers();



}









/*
==========================
ADMIN
==========================
*/


async function checkAdmin(){


let {

data

}=await db

.from("profiles")

.select("role")

.eq(
"id",
currentUser.id
)

.single();




if(
data &&
data.role==="platform_admin"

){

adminButton.hidden=false;


}


}
