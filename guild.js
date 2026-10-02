// =====================================
// GUILD SYSTEM
// =====================================


let guildId = null;

let currentUser = null;

let currentRole = null;





// =====================================
// START
// =====================================


document.addEventListener(
"DOMContentLoaded",
async()=>{


console.log(
"Открытие гильдии"
);



const session =
await getSession();



if(!session){


alert(
"Необходимо войти"
);


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
"Гильдия не найдена"
);


return;

}




await loadGuild();



});









// =====================================
// LOAD GUILD
// =====================================


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




// название


document
.getElementById(
"guildName"
)
.innerText =
data.name;




document
.getElementById(
"guildDescription"
)
.innerText =
data.description || "";



document
.getElementById(
"aboutText"
)
.innerText =
data.description || "";




// фракция


document
.getElementById(
"guildFaction"
)
.innerText =
data.faction_name || "";





// картинки


if(data.logo_url){


document
.getElementById(
"guildLogo"
)
.src =
data.logo_url;


}



if(data.banner_url){


document
.getElementById(
"guildBanner"
)
.style.backgroundImage =
`url(${data.banner_url})`;


}




// тема


applyTheme(data);




// проверяем роль


await checkRole();



// загрузки


loadMembers();

loadNews();

loadGallery();

loadDocuments();

loadRelations();

loadApplications();



}









// =====================================
// CHECK ROLE
// =====================================


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



console.log(
"Роль:",
currentRole
);



if(
currentRole==="leader"
){


enableAdmin();


}



}









// =====================================
// ADMIN ACCESS
// =====================================


function enableAdmin(){



document
.getElementById(
"settingsButton"
)
.hidden=false;



document
.getElementById(
"aboutEdit"
)
.hidden=false;



document
.getElementById(
"newsAdd"
)
.hidden=false;



document
.getElementById(
"memberAdd"
)
.hidden=false;



document
.getElementById(
"galleryAdd"
)
.hidden=false;



document
.getElementById(
"documentAdd"
)
.hidden=false;



document
.getElementById(
"createAlliance"
)
.hidden=false;


}









// =====================================
// TABS
// =====================================


function openTab(id){


document
.querySelectorAll(
".tab"
)
.forEach(
x=>x.hidden=true
);



document
.getElementById(id)
.hidden=false;


}









// =====================================
// SAVE DESCRIPTION
// =====================================


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



document
.getElementById(
"guildDescription"
)
.innerText=text;


}










// =====================================
// APPLY THEME
// =====================================


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


document.body
.className =
data.button_style;


}


}









// =====================================
// SAVE THEME
// =====================================


async function saveTheme(){



const theme =
document
.getElementById(
"themeColor"
)
.value;



const button =
document
.getElementById(
"buttonColor"
)
.value;



const style =
document
.getElementById(
"buttonStyle"
)
.value;




const faction =
document
.getElementById(
"factionName"
)
.value;






const {

error

}=await supabaseClient

.from("guilds")

.update({

theme_color:theme,

button_color:button,

button_style:style,

faction_name:faction

})

.eq(
"id",
guildId
);




if(error){


alert(
error.message
);


return;

}




alert(
"Оформление сохранено"
);



location.reload();



}









// =====================================
// ADD MEMBER
// =====================================


async function addMember(){



const nickname =
document
.getElementById(
"memberNickname"
)
.value;




await supabaseClient

.from("guild_members")

.insert({

guild_id:guildId,

game_id:null,

user_id:null,

nickname:nickname,

role:"member"

});



location.reload();


}









// =====================================
// LOAD MEMBERS
// =====================================


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









// =====================================
// EMPTY MODULES
// =====================================


async function loadNews(){}

async function loadGallery(){}

async function loadDocuments(){}

async function loadRelations(){}

async function loadApplications(){}






// =====================================
// ALLIANCE PLACEHOLDER
// =====================================


function createAlliance(){


alert(
"Система союзов будет добавлена"
);


}
