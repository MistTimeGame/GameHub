/* =========================================
   GUILD SYSTEM v2.0.1
   Fixed leader permissions
========================================= */


let guildId = null;

let currentUser = null;

let currentRole = null;

let guildData = null;





/* =========================================
   START
========================================= */


document.addEventListener(
"DOMContentLoaded",
async()=>{


const session =
await supabaseClient.auth.getSession();



if(!session.data.session){


alert(
"Сессия отсутствует"
);


location.href="index.html";


return;

}



currentUser =
session.data.session.user;




const params =
new URLSearchParams(
window.location.search
);



guildId =
params.get("id");



if(!guildId){


alert(
"Не указана гильдия"
);


return;

}



await loadGuild();


});








/* =========================================
   LOAD GUILD
========================================= */


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


console.error(error);


alert(
"Ошибка загрузки гильдии: "
+
error.message
);


return;

}



guildData=data;



document
.getElementById(
"guildName"
)
.innerText =
data.name || "Гильдия";




document
.getElementById(
"guildDescription"
)
.innerText =
data.description || "";



document
.getElementById(
"editGuildName"
)
.value =
data.name || "";



document
.getElementById(
"descriptionInputAdmin"
)
.value =
data.description || "";



document
.getElementById(
"factionName"
)
.value =
data.faction_name || "";



document
.getElementById(
"guildFaction"
)
.innerText =
data.faction_name || "";






if(data.logo_url){


document
.getElementById(
"guildLogo"
)
.src =
data.logo_url;


}



if(data.faction_flag_url){


document
.getElementById(
"factionFlag"
)
.src =
data.faction_flag_url;


}



if(data.banner_url){


document
.getElementById(
"guildBanner"
)
.style.backgroundImage =
`url(${data.banner_url})`;


}



applyTheme(data);



await checkRole();



await loadMembers();

await loadNews();

}








/* =========================================
   ROLE CHECK FIXED
========================================= */


async function checkRole(){



console.log(
"Проверка прав:",
currentUser.id
);




// вариант 1
// владелец через guilds.created_by


if(
guildData.created_by === currentUser.id
){


console.log(
"Владелец гильдии"
);


currentRole="leader";


enableLeader();


return;


}







// вариант 2
// роль в guild_members


const {

data,

error

}=await supabaseClient

.from("guild_members")

.select("role")

.eq(
"guild_id",
guildId
)

.eq(
"user_id",
currentUser.id
)

.is(
"left_at",
null
)

.single();





if(error){


console.log(
"Роль не найдена"
);


return;


}



currentRole =
data.role;




console.log(
"Роль:",
currentRole
);



if(
currentRole==="leader"
){


enableLeader();


}


}








/* =========================================
   ENABLE ADMIN
========================================= */


function enableLeader(){



document
.getElementById(
"leaderPanelButton"
)
.hidden=false;



document
.getElementById(
"descriptionEdit"
)
.hidden=false;



document
.getElementById(
"newsCreate"
)
.hidden=false;



document
.getElementById(
"memberCreate"
)
.hidden=false;



document
.getElementById(
"galleryCreate"
)
.hidden=false;



document
.getElementById(
"documentCreate"
)
.hidden=false;



document
.getElementById(
"allianceCreate"
)
.hidden=false;



console.log(
"Права главы активированы"
);


}








/* =========================================
   TABS
========================================= */


function openTab(id){



document
.querySelectorAll(".tab")
.forEach(
x=>x.hidden=true
);



document
.getElementById(id)
.hidden=false;


}








/* =========================================
   SAVE DESCRIPTION
========================================= */


async function saveDescription(){



const text =
document
.getElementById(
"descriptionInput"
)
.value;




await supabaseClient

.from("guilds")

.update({

description:text

})

.eq(
"id",
guildId
);



location.reload();


}








/* =========================================
   SAVE MAIN INFO
========================================= */


async function saveGuildInfo(){



await supabaseClient

.from("guilds")

.update({

name:
document
.getElementById(
"editGuildName"
)
.value,


description:
document
.getElementById(
"descriptionInputAdmin"
)
.value


})

.eq(
"id",
guildId
);



location.reload();


}








/* =========================================
   THEME
========================================= */


function applyTheme(data){



if(data.theme_color){


document.documentElement.style
.setProperty(
"--guild-theme",
data.theme_color
);


}



if(data.button_color){


document.documentElement.style
.setProperty(
"--guild-button",
data.button_color
);


}



if(data.button_style){


document.body.className =
data.button_style;


}



}







async function saveTheme(){



await supabaseClient

.from("guilds")

.update({

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


faction_name:
document
.getElementById(
"factionName"
)
.value


})

.eq(
"id",
guildId
);



location.reload();


}








/* =========================================
   STORAGE
========================================= */


async function uploadFile(file,folder){



if(!file)return null;



const ext =
file.name.split(".").pop();



const path =
`${folder}/${guildId}/${Date.now()}.${ext}`;





const {

error

}=await supabaseClient.storage

.from(
"guild-assets"
)

.upload(
path,
file
);



if(error){

alert(error.message);

return null;

}




const {

data

}=supabaseClient.storage

.from(
"guild-assets"
)

.getPublicUrl(
path
);



return data.publicUrl;


}








/* =========================================
   FILE UPLOADS
========================================= */


async function uploadLogo(){


let url =
await uploadFile(
document.getElementById("logoFile").files[0],
"logos"
);



if(url)

await supabaseClient
.from("guilds")
.update({
logo_url:url
})
.eq("id",guildId);


location.reload();

}





async function uploadBanner(){


let url =
await uploadFile(
document.getElementById("bannerFile").files[0],
"banners"
);



if(url)

await supabaseClient
.from("guilds")
.update({
banner_url:url
})
.eq("id",guildId);


location.reload();

}





async function uploadFactionFlag(){


let url =
await uploadFile(
document.getElementById("factionFile").files[0],
"flags"
);



if(url)

await supabaseClient
.from("guilds")
.update({
faction_flag_url:url
})
.eq("id",guildId);


location.reload();

}








/* =========================================
   MEMBERS
========================================= */


async function loadMembers(){



const {

data

}=await supabaseClient

.from("guild_members")

.select("*")

.eq(
"guild_id",
guildId
)

.is(
"left_at",
null
);



let html="";



(data||[]).forEach(m=>{


html+=`

<div>

<b>${m.nickname || "Игрок"}</b>

<br>

Роль: ${m.role}

</div>

`;



});



document
.getElementById(
"membersList"
)
.innerHTML=html;


}








async function addMember(){


alert(
"Система приглашений будет подключена следующим модулем"
);


}








/* =========================================
   NEWS
========================================= */


async function loadNews(){


const {

data

}=await supabaseClient

.from("guild_news")

.select("*")

.eq(
"guild_id",
guildId
)

.order(
"created_at",
{
ascending:false
}
);



let html="";



(data||[]).forEach(n=>{


html+=`

<div>

<h3>${n.title}</h3>

<p>${n.content}</p>

</div>

`;



});



document
.getElementById(
"newsList"
)
.innerHTML=html;


}




async function createNews(){



await supabaseClient

.from("guild_news")

.insert({

guild_id:guildId,

author_id:currentUser.id,

title:
newsTitle.value,

content:
newsText.value

});



location.reload();


}








/* =========================================
   PLACEHOLDERS
========================================= */


function uploadGallery(){

alert(
"Галерея будет подключена"
);

}


function uploadDocument(){

alert(
"Документы будут подключены"
);

}


function createAlliance(){

alert(
"Система союзов будет подключена"
);

}
