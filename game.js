/*
=================================================
GAME GUILD PLATFORM
GAME.JS v3.0
GAME PAGE
=================================================
*/


let gameId = null;

let currentUser = null;

let currentGame = null;

let guildsCache = [];







document.addEventListener(
"DOMContentLoaded",
async()=>{


gameId =

new URLSearchParams(
window.location.search
)
.get("id");





if(!gameId){


alert(
"ID игры отсутствует"
);


return;


}






await checkAuth();



await loadGame();



await loadGuilds();



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


}



}









/*
=================================================
LOAD GAME
=================================================
*/


async function loadGame(){



const {

data,

error

}=await supabaseClient

.from("games")

.select("*")

.eq(
"id",
gameId
);








if(error){


console.error(error);


alert(
"Ошибка загрузки игры"
);


return;


}






if(!data || data.length===0){


alert(
"Игра не найдена"
);


return;


}







currentGame =
data[0];







document

.getElementById(
"gameName"
)

.innerText =

currentGame.name;







document

.getElementById(
"gameDescription"
)

.innerText =

currentGame.description || "";







const logo =

document

.getElementById(
"gameLogo"
);






if(currentGame.logo_url){


logo.src =
currentGame.logo_url;


}

else{


logo.style.display="none";


}



}









/*
=================================================
LOAD GUILDS
=================================================
*/


async function loadGuilds(){



const {

data,

error

}=await supabaseClient

.from("guilds")

.select("*")

.eq(
"game_id",
gameId
)

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






guildsCache =
data || [];





renderGuilds(
guildsCache
);



}









function renderGuilds(list){



const box =

document

.getElementById(
"guildList"
);






if(!box)

return;





box.innerHTML="";







list.forEach(guild=>{



box.innerHTML += `


<div class="guild-card"

onclick="openGuild('${guild.id}')">



${

guild.logo_url

?

`

<img src="${guild.logo_url}">

`

:

""

}




<h3>

${guild.name}

</h3>



<p>

${guild.tag || ""}

</p>




<p>

${guild.description || ""}

</p>



</div>


`;



});



}









/*
=================================================
SEARCH
=================================================
*/


function searchGuilds(){



const text =

document

.getElementById(
"guildSearch"
)

.value

.toLowerCase();






const result =

guildsCache.filter(g=>{


return (

g.name || ""

)

.toLowerCase()

.includes(text);



});






renderGuilds(result);



}









/*
=================================================
CREATE GUILD WINDOW
=================================================
*/


function openCreateGuild(){



if(!currentUser){


alert(
"Сначала войдите"
);


return;


}







document

.getElementById(
"createGuild"
)

.hidden=false;



}









/*
=================================================
CREATE GUILD
=================================================
*/


async function createGuild(){



if(!currentUser){


alert(
"Нет авторизации"
);


return;


}






const name =

document

.getElementById(
"guildName"
)

.value

.trim();






const tag =

document

.getElementById(
"guildTag"
)

.value

.trim();






const description =

document

.getElementById(
"guildDescription"
)

.value;







if(!name){


alert(
"Введите название"
);


return;


}







const {

data,

error

}=await supabaseClient

.from("guilds")

.insert({


game_id:
gameId,


name:name,


tag:tag,


description:description,


created_by:
currentUser.id,


is_public:true


})

.select();








if(error){


alert(
error.message
);


return;


}






if(!data || data.length===0){


alert(
"Гильдия не создана"
);


return;


}






const guild = data[0];









/*
создаём главу
*/


const {

error:memberError

}=await supabaseClient

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







if(memberError){


console.error(memberError);


alert(
"Гильдия создана, но глава не назначен"
);


}







alert(
"Гильдия создана"
);






location.href =

"guild.html?id="+guild.id;



}









function openGuild(id){



location.href =

"guild.html?id="+id;



}
