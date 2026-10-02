/*
=================================================
GUILD SYSTEM v2.0.0
=================================================
*/


let guildId = null;

let guildData = null;

let currentUser = null;

let currentRole = "member";







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
location.search
);



guildId =
params.get("id");





if(!guildId){

alert(
"Гильдия не найдена"
);

return;

}





await loadGuild();


});









/*
==============================
LOAD GUILD
==============================
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




guildData=data;




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
data.tag || "";



document
.getElementById(
"guildFaction"
)
.innerText =
data.faction_name || "";



document
.getElementById(
"guildDescription"
)
.innerText =
data.description || "";







if(data.logo_url)

guildLogo.src=data.logo_url;




if(data.faction_flag_url)

factionFlag.src=data.faction_flag_url;




if(data.banner_url)

guildBanner.style.backgroundImage =
`url(${data.banner_url})`;





editName.value=data.name;

editTag.value=data.tag || "";

editDescription.value=data.description || "";

factionName.value=data.faction_name || "";




applyTheme(data);



await checkRole();


await loadMembers();

await loadNews();

});









/*
==============================
ROLE CHECK
==============================
*/


async function checkRole(){



if(
guildData.created_by === currentUser?.id
){


currentRole="leader";


enableControl();


return;


}





if(!currentUser)

return;




const {

data

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





if(data){


currentRole=data.role;



if(

data.role==="leader"

||

data.role==="officer"

){


enableControl();


}


}



}









function enableControl(){



settingsButton.hidden=false;

memberControl.hidden=false;

newsControl.hidden=false;

galleryControl.hidden=false;

documentControl.hidden=false;

diplomacyControl.hidden=false;



}









/*
==============================
TABS
==============================
*/


function openGuildTab(id){



document

.querySelectorAll(".guild-tab")

.forEach(

x=>x.hidden=true

);



document
.getElementById(id)
.hidden=false;


}









/*
==============================
SAVE GUILD
==============================
*/


async function saveGuild(){



await supabaseClient

.from("guilds")

.update({


name:
editName.value,


tag:
editTag.value,


description:
editDescription.value



})

.eq(
"id",
guildId
);




location.reload();


}









/*
==============================
THEME
==============================
*/


function applyTheme(data){



if(data.theme_color)


document.documentElement.style
.setProperty(
"--guild-theme",
data.theme_color
);




if(data.button_color)


document.documentElement.style
.setProperty(
"--guild-button",
data.button_color
);



}




async function saveTheme(){



await supabaseClient

.from("guilds")

.update({


theme_color:
themeColor.value,


button_color:
buttonColor.value,


button_style:
buttonStyle.value,


faction_name:
factionName.value



})

.eq(
"id",
guildId
);




location.reload();


}









/*
==============================
UPLOAD
==============================
*/


async function uploadImage(file,folder){



if(!file)

return null;




let path =

folder
+
"/"
+
guildId
+
"/"
+
Date.now()
+
"_"
+
file.name;





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

}=supabaseClient

.storage

.from(
"guild-assets"
)

.getPublicUrl(path);





return data.publicUrl;


}









async function uploadLogo(){



let url =
await uploadImage(
logoFile.files[0],
"logos"
);



if(url)


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







async function uploadBanner(){



let url =
await uploadImage(
bannerFile.files[0],
"banners"
);



if(url)


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







async function uploadFlag(){



let url =
await uploadImage(
flagFile.files[0],
"flags"
);



if(url)


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









/*
==============================
MEMBERS
==============================
*/


async function loadMembers(){



const {

data

}=await supabaseClient

.from("guild_members")

.select("*")

.eq(
guild_id,
guildId
);





let html="";



(data||[])

.forEach(m=>{


html+=`

<div class="member-card">

<b>

${m.nickname || "Игрок"}

</b>


<br>

${m.role}

</div>

`;



});




membersList.innerHTML=html;


}









async function addMember(){



await supabaseClient

.from("guild_members")

.insert({


guild_id:guildId,


game_id:guildData.game_id,


user_id:
memberUser.value,


nickname:
memberNickname.value,


role:
memberRole.value



});




location.reload();


}









/*
==============================
NEWS
==============================
*/


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



(data||[])

.forEach(n=>{


html+=`

<div class="news-card">

<h3>

${n.title}

</h3>


<p>

${n.content}

</p>


</div>

`;


});



newsList.innerHTML=html;


}





async function createNews(){



await supabaseClient

.from("guild_news")

.insert({


guild_id:guildId,


author_id:
currentUser.id,


title:
newsTitle.value,


content:
newsText.value


});



location.reload();


}









/*
==============================
EMPTY MODULES
==============================
*/


function uploadGallery(){

alert(
"Галерея подключается следующим модулем"
);

}


function uploadDocument(){

alert(
"Документы подключаются следующим модулем"
);

}



function createAlliance(){

alert(
"Дипломатия подключается следующим модулем"
);

}
