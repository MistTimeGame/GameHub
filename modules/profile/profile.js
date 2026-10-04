/*
================================================
GAME PLATFORM
PROFILE MODULE
================================================
*/


(function(){


"use strict";



let profileUser=null;



const roman = [

"",

"I",

"II",

"III",

"IV",

"V",

"VI",

"VII",

"VIII",

"IX",

"X",

"XI",

"XII"

];



async function loadProfileHTML(){


const container =
document.getElementById(
"profile-container"
);



if(!container)
return;



const response =
await fetch(
"modules/profile/profile.html"
);



container.innerHTML =
await response.text();



bindProfile();


}




function bindProfile(){


const save =
document.getElementById(
"save-profile"
);



if(save){

save.onclick =
saveProfile;

}


}





async function loadProfile(){



profileUser =
window.GameAuth
.getUser();



if(!profileUser)
return;



const {

data,

error

}=

await window.supabaseClient
.from("profiles")
.select("*")
.eq(
"id",
profileUser.id
)
.single();



if(error){

console.error(error);

return;

}



document.getElementById(
"profile-nickname"
).value =
data.nickname || "";



document.getElementById(
"profile-city"
).value =
data.city || "";



document.getElementById(
"profile-age"
).value =
data.age || "";



document.getElementById(
"profile-avatar-url"
).value =
data.avatar_url || "";



updateVIP(
data.vip_level || 0
);



if(data.avatar_url){

document.getElementById(
"profile-avatar"
).src =
data.avatar_url;

}



}





async function saveProfile(){


if(!profileUser){

alert(
"Нет авторизации"
);

return;

}




const nickname =
document.getElementById(
"profile-nickname"
).value;



const city =
document.getElementById(
"profile-city"
).value;



const age =
Number(
document.getElementById(
"profile-age"
).value
);



const avatar =
document.getElementById(
"profile-avatar-url"
).value;




const {

error

}=

await window.supabaseClient
.from("profiles")
.update({

nickname,

city,

age,

avatar_url:avatar

})
.eq(
"id",
profileUser.id
);




if(error){

alert(
error.message
);

return;

}



if(avatar){

document.getElementById(
"profile-avatar"
).src =
avatar;

}



alert(
"Профиль сохранён"
);



}





function updateVIP(level){


if(level<1)
level=1;


if(level>12)
level=12;



const el =
document.getElementById(
"vip-level"
);



if(el){

el.textContent =
roman[level];

}


}




async function init(){


await loadProfileHTML();


setTimeout(

loadProfile,

500

);


}



document.addEventListener(
"DOMContentLoaded",
init
);



window.GameProfile={

load:
loadProfile

};



})();
