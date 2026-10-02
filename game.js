/*
=================================================
GAME PAGE SYSTEM v2.0.0
=================================================
*/


let gameId = null;

let gameData = null;

let currentUser = null;





/*
==============================
START
==============================
*/


document.addEventListener(
"DOMContentLoaded",
async()=>{


const {

data

}=await supabaseClient.auth.getSession();



if(data.session){

currentUser =
data.session.user;

}



const params =
new URLSearchParams(
window.location.search
);



gameId =
params.get("id");




if(!gameId){


alert(
"Игра не найдена"
);


return;


}




await loadGame();


await loadGuilds();


await loadModules();



});









/*
==============================
LOAD GAME
==============================
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




gameData=data;



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





document
.getElementById(
"gameInfo"
)
.innerHTML = `

<p>

${data.description || ""}

</p>

`;





if(data.logo_url){


document
.getElementById(
"gameLogo"
)
.src =
data.logo_url;


}


}








/*
==============================
TABS
==============================
*/


function openGameTab(id){



document
.querySelectorAll(
".game-tab"
)

.forEach(

x=>x.hidden=true

);



document
.getElementById(id)
.hidden=false;


}









/*
==============================
GUILDS LOAD
==============================
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

.eq(
"is_public",
true
)

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




const box =
document.getElementById(
"guildsList"
);



box.innerHTML="";





(data || []).forEach(g=>{



box.innerHTML +=`

<div
class="guild-card"
onclick="openGuild('${g.id}')"
>


${

g.logo_url

?

`
<img src="${g.logo_url}">
`

:

""

}



<h3>

${g.name}

</h3>



<p>

${g.description || ""}

</p>



</div>

`;



});



}








/*
==============================
OPEN GUILD
==============================
*/


function openGuild(id){



location.href=

"guild.html?id="+id;


}








/*
==============================
CREATE GUILD WINDOW
==============================
*/


function openCreateGuild(){



if(!currentUser){


alert(
"Нужно войти"
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
==============================
CREATE GUILD
==============================
*/


async function createGuild(){



if(!currentUser){


return;


}





const name =

document
.getElementById(
"guildNameInput"
)
.value;



const tag =

document
.getElementById(
"guildTagInput"
)
.value;



const description =

document
.getElementById(
"guildDescriptionInput"
)
.value;



const logo =

document
.getElementById(
"guildLogoInput"
)
.value;





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


logo_url:logo,


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







/*
Добавляем создателя
как главу
*/


const {

error:memberError

}=await supabaseClient

.from("guild_members")

.insert({


guild_id:data.id,


game_id:gameId,


user_id:
currentUser.id,


nickname:
currentUser.email,


role:
"leader"



});






if(memberError){


console.log(
memberError.message
);


}






alert(
"Гильдия создана"
);



location.href =
"guild.html?id="
+
data.id;



}









/*
==============================
MODULES
==============================
*/


async function loadModules(){



const {

data,

error

}=await supabaseClient

.from("game_modules")

.select("*")

.eq(
"game_id",
gameId
);





if(error){

console.log(error.message);

return;

}





const box =
document.getElementById(
"modulesList"
);



box.innerHTML="";





(data || []).forEach(m=>{



box.innerHTML +=`

<div class="module-card">


<h3>

${m.name}

</h3>


<p>

${m.description || ""}

</p>


</div>

`;



});



}