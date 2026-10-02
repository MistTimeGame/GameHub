/*
=================================================
GAME GUILD PLATFORM
APP.JS v4.1
=================================================
*/


let supabaseClient = null;


let currentUser = null;


let currentGame = null;


let currentGuild = null;


let games = [];









document.addEventListener(
"DOMContentLoaded",
async()=>{


if(
!window.SUPABASE_URL ||
!window.SUPABASE_ANON_KEY
){

alert(
"Нет настроек Supabase"
);

return;

}



supabaseClient =

supabase.createClient(

window.SUPABASE_URL,

window.SUPABASE_ANON_KEY

);




await checkAuth();


await loadGames();



});









/*
====================================
AUTH
====================================
*/


async function checkAuth(){



const {

data

}=await supabaseClient.auth.getSession();



if(data.session){


currentUser =
data.session.user;


updateAuthBlock();


}



}








function openAuth(){


authWindow.hidden=false;


}





function closeAuth(){


authWindow.hidden=true;


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

password

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
"Регистрация создана. Проверь почту."
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


updateAuthBlock();



}









function updateAuthBlock(){



authBlock.innerHTML=

`

<button onclick="showProfile()">

${currentUser.email}

</button>

`;



}








async function logout(){



await supabaseClient.auth.signOut();


location.reload();


}









/*
====================================
VIEWS
====================================
*/


function hideViews(){


homeView.hidden=true;


gameView.hidden=true;


guildView.hidden=true;


profileView.hidden=true;


}




function showHome(){


hideViews();


homeView.hidden=false;


}







function showProfile(){


hideViews();


profileView.hidden=false;


profileInfo.innerHTML=

`

<p>

${currentUser.email}

</p>

`;



}









/*
====================================
GAMES
====================================
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



gamesList.innerHTML="";





list.forEach(game=>{



gamesList.innerHTML+=


`

<div class="game-card"

onclick="openGame('${game.id}')">


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

gameSearch.value

.toLowerCase();





renderGames(

games.filter(game=>

game.name

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

gameDescriptionInput.value,


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



gameTitle.innerText=

currentGame.name;



gameDescription.innerText=

currentGame.description || "";



loadGuilds();



}









/*
====================================
GUILDS
====================================
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





guildsList.innerHTML="";




(data||[]).forEach(g=>{



guildsList.innerHTML+=

`

<div class="guild-card"

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

guild_id:

guild.id,


user_id:

currentUser.id,


nickname:

currentUser.email,


role:

"leader"


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




guildTitle.innerText=

currentGuild.name;



guildDescription.innerText=

currentGuild.description || "";



guildFaction.innerText=

currentGuild.faction_name || "";



guildLogo.src=

currentGuild.logo_url || "";




await loadMembers();


await checkLeader();



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





(data||[]).forEach(member=>{



membersList.innerHTML+=


`

<div class="member">


<span>

${member.nickname}

</span>


<b>

${member.role}

</b>


</div>


`;



});



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
"guild_id",
currentGuild.id
)

.eq(
"user_id",
currentUser.id
);






if(
data &&
data.length>0 &&
data[0].role==="leader"

){


leaderPanel.hidden=false;


}



}









/*
====================================
SETTINGS
====================================
*/


function openGuildSettings(){


guildSettingsWindow.hidden=false;


}








async function saveGuildSettings(){



const {

error

}=await supabaseClient

.from("guilds")

.update({

theme_color:

themeColor.value,


faction_name:

factionName.value,


faction_flag_url:

factionFlag.value


})

.eq(
"id",
currentGuild.id
);






if(error){

alert(error.message);

return;

}



alert(
"Сохранено"
);



}
