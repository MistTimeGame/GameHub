/* ============================================================
   GAME PLATFORM
   MAIN JS
   ============================================================ */


console.log("[MAIN] loaded");



document.addEventListener(
"DOMContentLoaded",
()=>{


const loginBtn =
document.getElementById(
"loginBtn"
);


const registerBtn =
document.getElementById(
"registerBtn"
);


const profileBtn =
document.getElementById(
"profileBtn"
);


const logoutBtn =
document.getElementById(
"logoutBtn"
);




if(loginBtn){

loginBtn.onclick =
function(){

loadModule(
"modules/auth/auth.html"
);

};

}



if(registerBtn){

registerBtn.onclick =
function(){

loadModule(
"modules/auth/auth.html"
);

};

}




if(profileBtn){

profileBtn.onclick =
function(){

loadModule(
"modules/profile/profile.html"
);

};

}





if(logoutBtn){

logoutBtn.onclick =
async function(){


await supabaseClient
.auth
.signOut();


location.reload();


};


}



checkUser();



});






/* ============================================================
   USER CHECK
   ============================================================ */


async function checkUser(){


const {

data

}
=
await supabaseClient
.auth
.getUser();



if(
data &&
data.user
){


document
.getElementById(
"loginBtn"
)
.hidden=true;


document
.getElementById(
"registerBtn"
)
.hidden=true;



document
.getElementById(
"profileBtn"
)
.hidden=false;


document
.getElementById(
"logoutBtn"
)
.hidden=false;


}



}





/* ============================================================
   MODULE LOADER
   ============================================================ */


async function loadModule(url){


console.log(
"[MAIN] loading:",
url
);



const response =
await fetch(url);



const html =
await response.text();



const content =
document.getElementById(
"content"
);



content.innerHTML =
html;



/*
   загрузка JS модуля
*/


if(
url.includes(
"auth"
)
){


loadScript(
"modules/auth/auth.js"
);


}



if(
url.includes(
"profile"
)
){


loadScript(
"modules/profile/profile.js"
);


}



}




function loadScript(src){


const old =
document.querySelector(
`script[src="${src}"]`
);



if(old){

old.remove();

}



const script =
document.createElement(
"script"
);


script.src =
src;


script.onload =
function(){

console.log(
"[MODULE JS]",
src
);

};



document.body.appendChild(
script
);


}
