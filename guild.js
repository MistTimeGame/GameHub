/*
=================================================
GAME GUILD PLATFORM
GUILD.JS v3.1
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
"Нет ID гильдии"
);


return;


}





await loadSession();


await loadGuild();


await loadMembers();



});









/*
=================================
SESSION
=================================
*/


async function loadSession(){



const {

data,

error

}=await supabaseClient.auth.getSession();





if(error){


console.error(error);


return;


}




if(data.session){


currentUser =
data.session.user;


}



}









/*
=================================
LOAD GUILD
=================================
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
);







if(error){


console.error(error);


alert(
"Ошибка загрузки гильдии"
);


return;


}







if(!data || data.length===0){


alert(
"Гильдия не найдена"
);


return;


}






guildData =
data[0];







document

.getElementById(
"guildName"
)

.innerText =

guildData.name;







document

.getElementById(
"guildTag"
)

.innerText =

guildData.tag

?
"[ "+guildData.tag+" ]"

:

"";








document

.getElementById(
"guildDescription"
)

.innerText =

guildData.description || "";








if(guildData.logo_url){


document

.getElementById(
"guildLogo"
)

.src =

guildData.logo_url;


}







applyTheme();


showFaction();


checkLeader();



}









/*
=================================
THEME
=================================
*/


function applyTheme(){



if(guildData.theme_color){


document.body.style.background =

guildData.theme_color;


}






if(guildData.background_url){


document.body.style.backgroundImage =

`url(${guildData.background_url})`;



document.body.style.backgroundSize =
"cover";


}






if(guildData.banner_url){


document

.getElementById(
"guildBanner"
)

.style.backgroundImage =

`url(${guildData.banner_url})`;



}









document

.querySelectorAll(
"button"
)

.forEach(btn=>{



if(guildData.button_color){


btn.style.background =

guildData.button_color;


}







switch(guildData.button_style){


case "square":

btn.style.borderRadius="0";

break;



case "soft":

btn.style.borderRadius="12px";

break;



default:

btn.style.borderRadius="25px";



}



});



}









/*
=================================
FACTION
=================================
*/


function showFaction(){



const box =

document

.getElementById(
"factionBlock"
);





if(!guildData.faction_name){


box.innerHTML="";


return;


}







box.innerHTML = `


<div class="faction">


<img src="${guildData.faction_flag_url || ''}">


<div>

<h3>

${guildData.faction_name}

</h3>


</div>


</div>


`;



}









/*
=================================
CHECK LEADER
=================================
*/


async function checkLeader(){



if(!currentUser)

return;








const {

data,

error

}=await supabaseClient

.from("guild_members")

.select(

"role"

)

.eq(
"guild_id",
guildId
)

.eq(
"user_id",
currentUser.id
);







if(error){


console.error(error);


return;


}







if(!data || data.length===0){


return;


}







if(data[0].role==="leader"){



document

.getElementById(
"leaderPanel"
)

.hidden=false;



}



}









/*
=================================
OPEN SETTINGS
=================================
*/


function openGuildSettings(){



document

.getElementById(
"guildSettings"
)

.hidden=false;






document

.getElementById(
"themeColor"
)

.value =

guildData.theme_color || "#ffffff";






document

.getElementById(
"buttonColor"
)

.value =

guildData.button_color || "#ffcc00";







document

.getElementById(
"buttonStyle"
)

.value =

guildData.button_style || "round";







document

.getElementById(
"backgroundUrl"
)

.value =

guildData.background_url || "";







document

.getElementById(
"bannerUrl"
)

.value =

guildData.banner_url || "";







document

.getElementById(
"factionName"
)

.value =

guildData.faction_name || "";







document

.getElementById(
"factionFlag"
)

.value =

guildData.faction_flag_url || "";



}









/*
=================================
SAVE SETTINGS
=================================
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
=================================
MEMBERS
=================================
*/


function openMembers(){



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
);








if(error){


console.error(error);


return;


}








const box =

document

.getElementById(
"membersList"
);






if(!box)

return;







box.innerHTML="";







(data || [])

.forEach(member=>{


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
