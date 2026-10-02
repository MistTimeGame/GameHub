/*
=================================================
GAME GUILD PLATFORM
GAME PAGE v2.0.0
=================================================
*/


let gameId = null;

let currentGame = null;

let guildsCache = [];

let currentUser = null;









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
"Игра не найдена"
);


return;


}






await checkSession();



await loadGame();



await loadGuilds();



});









/*
=========================
SESSION
=========================
*/


async function checkSession(){



const {

data

}=await supabaseClient.auth.getSession();



if(data.session){


currentUser =
data.session.user;


}



}









/*
=========================
LOAD GAME
=========================
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
)

.single();






if(error){


alert(
error.message
);


return;


}







currentGame =
data;





document
.getElementById(
"gameName"
)
.innerText =
data.name;






document
.getElementById(
"gameDescription"
)
.innerText =
data.description || "";






const logo =

document
.getElementById(
"gameLogo"
);






if(data.logo_url){


logo.src =
data.logo_url;


}

else{


logo.style.display =
"none";


}





}









/*
=========================
GUILDS
=========================
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
=========================
SEARCH
=========================
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

guildsCache.filter(

guild =>


guild.name

.toLowerCase()

.includes(text)


);






renderGuilds(result);



}









/*
=========================
CREATE GUILD
=========================
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









async function createGuild(){



if(!currentUser){


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

.select()

.single();







if(error){


alert(
error.message
);


return;


}







/*
создаем главу
*/



await supabaseClient

.from("guild_members")

.insert({

guild_id:
data.id,

game_id:
gameId,

user_id:
currentUser.id,

nickname:
currentUser.email,

role:
"leader"


});








alert(
"Гильдия создана"
);



location.reload();



}









function openGuild(id){



window.location.href =

"guild.html?id="
+
id;



}
