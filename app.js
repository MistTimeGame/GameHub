/*
=================================================
GAME GUILD PLATFORM
APP.JS v4.0
=================================================
*/


let supabaseClient;

let currentUser=null;

let currentGame=null;

let currentGuild=null;

let games=[];

let guilds=[];






document.addEventListener(
"DOMContentLoaded",
async()=>{


supabaseClient =
supabase.createClient(
window.SUPABASE_URL,
window.SUPABASE_ANON_KEY
);



await checkAuth();


await loadGames();


});









/*
=================================================
AUTH
=================================================
*/


async function checkAuth(){



const {

data

}=await supabaseClient.auth.getSession();




if(data.session){


currentUser =
data.session.user;


showProfileButton();


}


}








function openAuth(){


document

.getElementById(
"authWindow"
)

.hidden=false;


}



function closeAuth(){


document

.getElementById(
"authWindow"
)

.hidden=true;


}









async function register(){



let email =
regEmail.value.trim();



let password =
regPassword.value;



let name =
regName.value.trim();






const {

data,

error

}=await supabaseClient.auth.signUp({

email,

password,

options:{


data:{


username:name


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
"Регистрация создана"
);


}









async function login(){



const {

data,

error

}=await supabaseClient.auth.signInWithPassword({

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



closeAuth();


showProfileButton();


}









async function logout(){



await supabaseClient.auth.signOut();


location.reload();


}









function showProfileButton(){



document

.getElementById(
"authBlock"
)

.innerHTML=`

<button onclick="logout()">

${currentUser.email}

<br>

Выйти

</button>

`;



}









/*
=================================================
VIEWS
=================================================
*/


function hideViews(){



[
"homeView",
"gameView",
"guildView",
"profileView"

]

.forEach(id=>{


let e=document.getElementById(id);


if(e)

e.hidden=true;


});


}






function showHome(){


hideViews();


homeView.hidden=false;


}



function showProfile(){


hideViews();


profileView.hidden=false;



profileInfo.innerHTML=`

<h3>

${currentUser?.email || "Гость"}

</h3>

`;



}



function showGames(){

showHome();

}









/*
=================================================
GAMES
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


console.error(error);


return;


}





games=data || [];


renderGames(games);



}








function renderGames(list){



const box=
document.getElementById(
"gamesList"
);




if(!box)

return;





box.innerHTML="";






list.forEach(game=>{


box.innerHTML += `


<div class="card"

onclick="openGame('${game.id}')">


<img

src="${game.logo_url || ''}"

width="100%"

height="180"


>



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









function searchGames(){



let text=

gameSearch.value.toLowerCase();



renderGames(

games.filter(g=>

g.name

.toLowerCase()

.includes(text)

)

);



}









function openCreateGame(){


createGameWindow.hidden=false;


}



function closeCreateGame(){


createGameWindow.hidden=true;


}









async function createGame(){



if(!currentUser){


openAuth();


return;


}





const {

data,

error

}=await supabaseClient

.from("games")

.insert({

name:
gameName.value,


description:
gameDescription.value,


logo_url:
gameLogo.value,


created_by:
currentUser.id,


status:
"published"


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

}=await supabaseClient

.from("games")

.select("*")

.eq(
"id",
id
);





currentGame=data[0];



hideViews();


gameView.hidden=false;



currentGameName.innerText=
currentGame.name;


currentGameDescription.innerText=
currentGame.description || "";



currentGameLogo.src=
currentGame.logo_url || "";



loadGuilds();



}









/*
=================================================
GUILDS
=================================================
*/


async function loadGuilds(){



const {

data

}=await supabaseClient

.from("guilds")

.select("*")

.eq(
"game_id",
currentGame.id
);





guilds=data || [];





const box=

document.getElementById(
"guildsList"
);



box.innerHTML="";




guilds.forEach(g=>{


box.innerHTML+=`


<div class="card"

onclick="openGuild('${g.id}')">


<h3>

${g.name}

</h3>


<p>

${g.tag || ""}

</p>


</div>


`;


});


}









function openCreateGuild(){



if(!currentUser){

openAuth();

return;

}



createGuildWindow.hidden=false;


}



function closeCreateGuild(){


createGuildWindow.hidden=true;


}









async function createGuild(){



const {

data,

error

}=await supabaseClient

.from("guilds")

.insert({

game_id:
currentGame.id,

name:
guildNameInput.value,

tag:
guildTagInput.value,

description:
guildDescriptionInput.value,

created_by:
currentUser.id,

is_public:true


})

.select();







if(error){


alert(error.message);


return;


}




let guild=data[0];






await supabaseClient

.from("guild_members")

.insert({

guild_id:guild.id,

user_id:currentUser.id,

nickname:currentUser.email,

role:"leader"


});






openGuild(guild.id);


}









async function openGuild(id){



const {

data

}=await supabaseClient

.from("guilds")

.select("*")

.eq(
"id",
id
);



currentGuild=data[0];



hideViews();


guildView.hidden=false;



guildName.innerText=
currentGuild.name;


guildDescription.innerText=
currentGuild.description || "";



guildFaction.innerText=
currentGuild.faction_name || "";



guildLogo.src=
currentGuild.logo_url || "";



checkLeader();


loadMembers();


}









async function checkLeader(){



if(!currentUser)

return;



const {

data

}=await supabaseClient

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





if(data && data.length){


if(data[0].role==="leader"){


leaderPanel.hidden=false;


}


}



}









async function loadMembers(){



const {

data

}=await supabaseClient

.from("guild_members")

.select("*")

.eq(
"guild_id",
currentGuild.id
);



membersList.innerHTML="";



(data||[]).forEach(m=>{


membersList.innerHTML+=`

<div class="member">

${m.nickname}

<b>

${m.role}

</b>

</div>

`;


});


}









/*
=================================================
SETTINGS
=================================================
*/


function openGuildSettings(){


guildSettingsWindow.hidden=false;


}








async function saveGuildSettings(){



await supabaseClient

.from("guilds")

.update({

theme_color:
themeColor.value,

button_color:
buttonColor.value,

background_url:
backgroundUrl.value,

faction_name:
factionName.value,

faction_flag_url:
factionFlag.value


})

.eq(
"id",
currentGuild.id
);




alert(
"Сохранено"
);


location.reload();


}
