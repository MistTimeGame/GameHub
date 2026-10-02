/*
=================================================
GAME GUILD PLATFORM
GUILD PAGE v2.0.0
=================================================
*/


let guildId = null;

let guildData = null;

let currentUser = null;








document.addEventListener(
"DOMContentLoaded",
async()=>{


guildId =

new URLSearchParams(
window.location.search
)
.get("id");





if(!guildId){


alert(
"Гильдия не найдена"
);


return;


}





await checkSession();


await loadGuild();


await loadMembers();



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
LOAD GUILD
=========================
*/


async function loadGuild(){



const {

data,

error

}=await supabaseClient

.from("guilds")

.select("*")

.eq(
"id",
guildId
)

.single();







if(error){


alert(error.message);


return;


}







guildData =
data;






document
.getElementById(
"guildName"
)
.innerText =
data.name;







document
.getElementById(
"guildTag"
)
.innerText =

data.tag
?
"[ "+data.tag+" ]"
:
"";








document
.getElementById(
"guildDescription"
)
.innerText =

data.description || "";








const logo =

document
.getElementById(
"guildLogo"
);





if(data.logo_url){


logo.src =
data.logo_url;


}








/*
=========================
THEME
=========================
*/


if(data.theme_color){


document.body.style.background =
data.theme_color;


}







if(data.background_url){


document.body.style.backgroundImage =

`url(${data.background_url})`;



document.body.style.backgroundSize =
"cover";



}








const banner =

document
.getElementById(
"guildBanner"
);






if(data.banner_url){



banner.style.backgroundImage =

`url(${data.banner_url})`;



}








/*
=========================
FACTION
=========================
*/


const faction =

document
.getElementById(
"factionBlock"
);







if(data.faction_name){



faction.innerHTML = `


<div class="faction">


<img src="${

data.faction_flag_url || ""

}">


<div>


<h3>

${data.faction_name}

</h3>


</div>


</div>


`;



}








await checkLeader();



}









/*
=========================
LEADER
=========================
*/


async function checkLeader(){



if(!currentUser)

return;








const {

data,

error

}=await supabaseClient

.from("guild_members")

.select("*")

.eq(
"guild_id",
guildId
)

.eq(
"user_id",
currentUser.id
)

.single();







if(error)


return;







if(data.role==="leader"){



document

.getElementById(
"leaderPanel"
)

.hidden=false;



}



}









/*
=========================
SETTINGS OPEN
=========================
*/


function openGuildSettings(){



document

.getElementById(
"guildSettings"
)

.hidden=false;






if(!guildData)

return;






document
.getElementById(
"themeColor"
)
.value =

guildData.theme_color ||
"#ffffff";







document
.getElementById(
"buttonColor"
)
.value =

guildData.button_color ||
"#ffcc00";








document
.getElementById(
"buttonStyle"
)
.value =

guildData.button_style ||
"round";








document
.getElementById(
"backgroundUrl"
)
.value =

guildData.background_url ||
"";







document
.getElementById(
"bannerUrl"
)
.value =

guildData.banner_url ||
"";







document
.getElementById(
"factionName"
)
.value =

guildData.faction_name ||
"";







document
.getElementById(
"factionFlag"
)
.value =

guildData.faction_flag_url ||
"";



}









/*
=========================
SAVE SETTINGS
=========================
*/


async function saveGuildSettings(){



const update = {


theme_color:

document
.getElementById(
"themeColor"
)
.value,



button_color:

document
.getElementById(
"buttonColor"
)
.value,



button_style:

document
.getElementById(
"buttonStyle"
)
.value,



background_url:

document
.getElementById(
"backgroundUrl"
)
.value,



banner_url:

document
.getElementById(
"bannerUrl"
)
.value,



faction_name:

document
.getElementById(
"factionName"
)
.value,



faction_flag_url:

document
.getElementById(
"factionFlag"
)
.value



};








const {

error

}=await supabaseClient

.from("guilds")

.update(update)

.eq(
"id",
guildId
);







if(error){


alert(error.message);


return;


}







alert(
"Настройки сохранены"
);



location.reload();



}









/*
=========================
MEMBERS
=========================
*/


async function openMembers(){



document

.getElementById(
"membersPanel"
)

.hidden=false;



}









async function loadMembers(){



const {

data,

error

}=await supabaseClient

.from("guild_members")

.select("*")

.eq(
"guild_id",
guildId
)

.order(
"joined_at",
{
ascending:true
}
);







const box =

document

.getElementById(
"membersList"
);







if(!box)

return;






box.innerHTML="";







if(error)

return;







data.forEach(member=>{



box.innerHTML += `


<div class="member">


<div>


${member.nickname || "Игрок"}


</div>



<div class="member-role">


${member.role}


</div>



</div>


`;



});



}
