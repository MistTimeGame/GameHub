/* =========================================
   GUILD SYSTEM v2.0.0
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
await getSession();



if(!session){


location.href="index.html";


return;


}



currentUser =
session.user;




const params =
new URLSearchParams(
window.location.search
);



guildId =
params.get("id");




if(!guildId){


alert(
"ID гильдии не найден"
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
.src=data.logo_url;


}




if(data.faction_flag_url){


document
.getElementById(
"factionFlag"
)
.src=data.faction_flag_url;


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



loadMembers();

loadNews();

loadGallery();

loadDocuments();

loadRelations();

loadApplications();


}









/* =========================================
   ROLE CHECK
========================================= */


async function checkRole(){



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




if(error){


console.log(
"Роль не найдена"
);


return;


}



currentRole =
data.role;




if(

currentRole==="leader"

){


enableLeader();



}



}







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


}








/* =========================================
   TABS
========================================= */


function openTab(id){


document
.querySelectorAll(".tab")
.forEach(
tab=>tab.hidden=true
);



document
.getElementById(id)
.hidden=false;


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



if(data.background_url){


document.body.style.backgroundImage =
`url(${data.background_url})`;


}



if(data.button_style){


document.body.className =
data.button_style;


}



}









/* =========================================
   DESCRIPTION
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
   SAVE THEME
========================================= */


async function saveTheme(){



const update={


theme_color:
document.getElementById(
"themeColor"
).value,



button_color:
document.getElementById(
"buttonColor"
).value,



button_style:
document.getElementById(
"buttonStyle"
).value,



faction_name:
document.getElementById(
"factionName"
).value


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



location.reload();


}









/* =========================================
   STORAGE
========================================= */


async function uploadFile(
file,
folder
){



if(!file)return null;




const ext =
file.name.split(".").pop();



const path =
`${folder}/${guildId}/${Date.now()}.${ext}`;





const {

error

}=await supabaseClient

.storage

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

} =
supabaseClient

.storage

.from(
"guild-assets"
)

.getPublicUrl(
path
);



return data.publicUrl;



}









/* =========================================
   LOGO
========================================= */


async function uploadLogo(){


const file =
document
.getElementById(
"logoFile"
)
.files[0];



const url =
await uploadFile(
file,
"logos"
);



if(!url)return;



await supabaseClient

.from("guilds")

.update({

logo_url:url

})

.eq(
"id",
guildId
);



location.reload();


}









/* =========================================
   BANNER
========================================= */


async function uploadBanner(){


const file =
document
.getElementById(
"bannerFile"
)
.files[0];



const url =
await uploadFile(
file,
"banners"
);



if(!url)return;



await supabaseClient

.from("guilds")

.update({

banner_url:url

})

.eq(
"id",
guildId
);



location.reload();


}









/* =========================================
   FLAG
========================================= */


async function uploadFactionFlag(){


const file =
document
.getElementById(
"factionFile"
)
.files[0];



const url =
await uploadFile(
file,
"flags"
);



if(!url)return;



await supabaseClient

.from("guilds")

.update({

faction_flag_url:url

})

.eq(
"id",
guildId
);



location.reload();


}









/* =========================================
   MEMBERS
========================================= */


async function addMember(){



const nickname =
document
.getElementById(
"memberNickname"
)
.value;



const role =
document
.getElementById(
"memberRole"
)
.value;




await supabaseClient

.from("guild_members")

.insert({

guild_id:guildId,

game_id:guildData.game_id,

nickname:nickname,

role:role,

user_id:null

});



location.reload();


}









async function loadMembers(){



const {

data

}=await supabaseClient

.from("guild_members")

.select("*")

.eq(
"guild_id",
guildId
);




let html="";



(data||[]).forEach(m=>{


html+=`

<div>

<b>${m.nickname}</b>

<br>

${m.role}

</div>

`;


});



document
.getElementById(
"membersList"
)
.innerHTML=html;


}









/* =========================================
   NEWS
========================================= */


async function createNews(){



await supabaseClient

.from("guild_news")

.insert({

guild_id:guildId,

author_id:currentUser.id,

title:
document.getElementById(
"newsTitle"
).value,


content:
document.getElementById(
"newsText"
).value


});



location.reload();


}





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








/* =========================================
   EMPTY MODULES
========================================= */


async function loadGallery(){}

async function loadDocuments(){}

async function loadRelations(){}

async function loadApplications(){}




function uploadGallery(){}

function uploadDocument(){}

function createAlliance(){



alert(
"Союзы будут подключены следующим модулем"
);


}
