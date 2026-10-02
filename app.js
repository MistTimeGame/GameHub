/*
====================================================
GGP UNIVERSE v6.0
CORE SYSTEM
====================================================
*/


let client;

let currentUser = null;

let currentGame = null;

let currentGuild = null;



document.addEventListener(
"DOMContentLoaded",
async()=>{


client = supabase.createClient(

SUPABASE_URL,

SUPABASE_ANON_KEY

);



await loadSession();


loadGames();


});







/*
==============================
AUTH SESSION
==============================
*/


async function loadSession(){


const {

data

}=await client.auth.getSession();



if(data.session){


currentUser=data.session.user;


renderUser();


checkAdmin();


}


}







function renderUser(){


userPanel.innerHTML=`

<button onclick="showPage('profile')">

${currentUser.email}

</button>

`;



}









/*
==============================
LOGIN WINDOW
==============================
*/


function openLogin(){


loginModal.hidden=false;


}



function closeLogin(){


loginModal.hidden=true;


}







async function register(){



let email =
registerEmail.value;



let password =
registerPassword.value;



let nickname =
registerName.value;





const {

data,

error

}=await client.auth.signUp({

email,

password


});





if(error){

alert(error.message);

return;

}





await client

.from("profiles")

.insert({

id:data.user.id,

username:nickname,

display_name:nickname,

role:"user"

});




alert(
"Аккаунт создан"
);



}









async function login(){



const {

data,

error

}=await client.auth.signInWithPassword({

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



renderUser();



loadGames();



}









async function logout(){



await client.auth.signOut();



location.reload();


}









/*
==============================
PAGE SYSTEM
==============================
*/


function showPage(page){



document.querySelectorAll(".page")
.forEach(
p=>p.hidden=true
);



if(page==="home")
homePage.hidden=false;



if(page==="game")
gamePage.hidden=false;



if(page==="guild")
guildPage.hidden=false;



if(page==="profile")
profilePage.hidden=false;



if(page==="admin")
adminPage.hidden=false;



}









/*
==============================
GAMES
==============================
*/


async function loadGames(){



const {

data,

error

}=await client

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





data.forEach(game=>{



gamesList.innerHTML+=`


<div class="game-card"

onclick="openGame('${game.id}')">


<h2>

${game.name}

</h2>


<p>

${game.description || ""}

</p>


</div>


`;



});




}





function searchGames(){



let value =
gameSearch.value.toLowerCase();




document
.querySelectorAll(".game-card")
.forEach(card=>{


card.style.display =

card.innerText
.toLowerCase()
.includes(value)

?

"block"

:

"none";



});



}









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



const {

error

}=await client

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


is_public:true


});





if(error){

alert(error.message);

return;

}




closeCreateGame();


loadGames();


}









async function openGame(id){



const {

data

}=await client

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
==============================
GUILDS
==============================
*/


async function loadGuilds(){



const {

data

}=await client

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

${g.name}

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



const {

data,

error

}=await client

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






await client

.from("guild_members")

.insert({

guild_id:data.id,


game_id:currentGame.id,


user_id:currentUser.id,


nickname:
currentUser.email,


role:"leader"


});






closeCreateGuild();



openGuild(data.id);



}









async function openGuild(id){



const {

data

}=await client

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
data.faction_name || "None";



guildLogo.src=
data.logo_url || "";



showPage("guild");



loadMembers();



}









async function loadMembers(){



const {

data

}=await client

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





const {

data

}=await client

.from("guild_members")

.select("*")

.eq(
"guild_id",
currentGuild.id
)

.eq(
"user_id",
currentUser.id
);





if(data.length){

alert(
"Вы уже участник"
);

return;

}





await client

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









async function leaveGuild(){



await client

.from("guild_members")

.delete()

.eq(
"guild_id",
currentGuild.id
)

.eq(
"user_id",
currentUser.id
);




loadMembers();


}









/*
==============================
ADMIN
==============================
*/


async function checkAdmin(){



const {

data

}=await client

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
