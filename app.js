/*
================================================
GAME GUILD PLATFORM
APP v5.0
================================================
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
==============================
SESSION
==============================
*/


async function checkSession(){


const {

data

}=await db.auth.getSession();



if(data.session){


currentUser=data.session.user;


updateUserPanel();


checkAdmin();



}


}









/*
==============================
AUTH
==============================
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



let name=
registerName.value;




const {

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

username:name,

display_name:name

});



alert(
"Регистрация создана"
);



}









async function login(){



const {

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


updateUserPanel();


loadGames();


}









async function logout(){


await db.auth.signOut();


location.reload();


}









function updateUserPanel(){



userPanel.innerHTML=


`

<button onclick="showPage('profile')">

${currentUser.email}

</button>

`;



}









/*
==============================
PAGES
==============================
*/


function showPage(page){


homePage.hidden=true;

gamePage.hidden=true;

guildPage.hidden=true;

profilePage.hidden=true;

adminPage.hidden=true;




if(page==="home")
homePage.hidden=false;



if(page==="game")
gamePage.hidden=false;



if(page==="guild")
guildPage.hidden=false;



if(page==="profile"){

profilePage.hidden=false;

loadProfile();

}



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




data.forEach(game=>{


gamesList.innerHTML+=


`

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


let text=

gameSearch.value.toLowerCase();



document.querySelectorAll(
".game-card"
)
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

data,

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


is_public:true


})

.select();





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

}=await db

.from("games")

.select("*")

.eq(
"id",
id
)

.single();




currentGame=data;



gameTitle.innerText=

data.name;



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

}=await db

.from("guilds")

.select("*")

.eq(
"game_id",
currentGame.id
);





guildList.innerHTML="";




data.forEach(g=>{


guildList.innerHTML+=


`

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



const {

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
data.faction_name || "";



guildLogo.src=
data.logo_url || "";



showPage("guild");



loadMembers();


checkGuildRole();



}









async function loadMembers(){



const {

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


membersList.innerHTML+=


`

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

}=await db

.from("guild_members")

.select("*")

.eq(
guild_id,
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


role:

"member"


});



alert(
"Вы вступили"
);



loadMembers();



}









async function leaveGuild(){



await db

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



alert(
"Вы вышли"
);



loadMembers();



}









async function checkGuildRole(){



if(!currentUser)
return;



const {

data

}=await db

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




if(
data &&
data[0] &&
data[0].role==="leader"

){

guildControl.hidden=false;


}



}









/*
==============================
PROFILE
==============================
*/


async function loadProfile(){



profileEmail.innerText=

currentUser.email;



}









/*
==============================
ADMIN
==============================
*/


async function checkAdmin(){



const {

data

}=await db

.from("profiles")

.select("*")

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
