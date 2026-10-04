document.addEventListener(
"DOMContentLoaded",
()=>{


const loginBtn =
document.getElementById("loginBtn");


const registerBtn =
document.getElementById("registerBtn");


const profileBtn =
document.getElementById("profileBtn");


const logoutBtn =
document.getElementById("logoutBtn");



loginBtn.onclick=()=>{

loadModule(
"modules/auth/auth.html"
);

};



registerBtn.onclick=()=>{

loadModule(
"modules/auth/auth.html"
);

};



profileBtn.onclick=()=>{

loadModule(
"modules/profile/profile.html"
);

};



logoutBtn.onclick=
async()=>{


await supabaseClient.auth.signOut();

location.reload();


};



checkUser();



}
);



async function checkUser(){


const {
data
}=await supabaseClient.auth.getUser();


if(data.user){

loginBtn.hidden=true;
registerBtn.hidden=true;

profileBtn.hidden=false;
logoutBtn.hidden=false;


}


}



async function loadModule(url){


const response =
await fetch(url);


const html =
await response.text();


document.getElementById(
"content"
).innerHTML=html;


}
