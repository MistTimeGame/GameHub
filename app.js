// =====================================
// GAME PLATFORM APP
// =====================================


// SUPABASE

const SUPABASE_URL =
"https://uvzaoobtysostmfwyfxm.supabase.co";


const SUPABASE_KEY =
"sb_publishable_-7M1kuwWOeRq21SfrLiojg_0qngL_7s";



const client =
supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);





let user = null;







// =====================================
// DOM
// =====================================


const authScreen =
document.getElementById("auth-screen");


const app =
document.getElementById("app");






// =====================================
// AUTH TABS
// =====================================


document
.getElementById("show-login")
.onclick=function(){


document
.getElementById("login-form")
.classList.remove("hidden");


document
.getElementById("register-form")
.classList.add("hidden");


this.classList.add("active");


document
.getElementById("show-register")
.classList.remove("active");


};







document
.getElementById("show-register")
.onclick=function(){


document
.getElementById("register-form")
.classList.remove("hidden");


document
.getElementById("login-form")
.classList.add("hidden");


this.classList.add("active");


document
.getElementById("show-login")
.classList.remove("active");


};









// =====================================
// REGISTER
// =====================================


document
.getElementById("register-form")
.onsubmit=async(e)=>{


e.preventDefault();



let nickname =
document
.getElementById("register-nickname")
.value;



let email =
document
.getElementById("register-email")
.value;



let password =
document
.getElementById("register-password")
.value;





const {

data,
error

}=

await client.auth.signUp({

email,
password

});





if(error){

alert(error.message);

return;

}




const uid =
data.user.id;





const {

error:profileError

}=


await client
.from("profiles")
.insert({

id:uid,

nickname:nickname,

avatar_url:
"https://cdn-icons-png.flaticon.com/512/4712/4712109.png",

vip_level:0,

city:"",

age:null


});






if(profileError){

alert(profileError.message);

return;

}




alert(
"Аккаунт создан"
);



};










// =====================================
// LOGIN
// =====================================



document
.getElementById("login-form")
.onsubmit=async(e)=>{


e.preventDefault();



let email =
document
.getElementById("login-email")
.value;



let password =
document
.getElementById("login-password")
.value;





const {

data,
error

}=

await client.auth
.signInWithPassword({

email,
password

});





if(error){

alert(error.message);

return;

}



user =
data.user;



openApp();


};










// =====================================
// SESSION
// =====================================



async function checkSession(){


const {

data

}=

await client.auth.getSession();



if(data.session){


user =
data.session.user;


openApp();



}



}










// =====================================
// OPEN APP
// =====================================


function openApp(){



authScreen
.classList.add("hidden");



app
.classList.remove("hidden");



loadProfile();


loadNews();


loadMessages();


startRealtime();



}












// =====================================
// LOGOUT
// =====================================


document
.getElementById("logout")
.onclick=async()=>{


await client.auth.signOut();


location.reload();


};











// =====================================
// PAGE SWITCH
// =====================================


document
.querySelectorAll(".menu-button")
.forEach(btn=>{


btn.onclick=()=>{


document
.querySelectorAll(".menu-button")
.forEach(x=>
x.classList.remove("active")
);



btn.classList.add("active");




document
.querySelectorAll(".page")
.forEach(page=>{

page.classList.remove("active");

});



document
.getElementById(
btn.dataset.page
)
.classList.add("active");



};



});









// =====================================
// PROFILE
// =====================================


async function loadProfile(){



if(!user)
return;



const {

data,
error

}=

await client
.from("profiles")
.select("*")
.eq(
"id",
user.id
)
.single();





if(error){

console.log(error);

return;

}





let avatar =
data.avatar_url ||
"https://cdn-icons-png.flaticon.com/512/4712/4712109.png";





document
.getElementById("profile-avatar")
.src=avatar;



document
.getElementById("side-avatar")
.src=avatar;



document
.getElementById("top-avatar")
.src=avatar;





document
.getElementById("profile-name")
.innerHTML=data.nickname;



document
.getElementById("side-name")
.innerHTML=data.nickname;



document
.getElementById("top-name")
.innerHTML=data.nickname;



document
.getElementById("vip")
.innerHTML=
"VIP "+data.vip_level;



document
.getElementById("side-vip")
.innerHTML=
"VIP "+data.vip_level;



document
.getElementById("avatar-url")
.value =
avatar;



document
.getElementById("profile-city")
.value =
data.city || "";



document
.getElementById("profile-age")
.value =
data.age || "";



}









document
.getElementById("save-profile")
.onclick=async()=>{



let avatar =
document
.getElementById("avatar-url")
.value;



let city =
document
.getElementById("profile-city")
.value;



let age =
document
.getElementById("profile-age")
.value;





await client
.from("profiles")
.update({

avatar_url:avatar,

city:city,

age:age


})

.eq(
"id",
user.id
);



loadProfile();



};









// =====================================
// NEWS
// =====================================



async function loadNews(){



const {

data

}=

await client
.from("news")
.select("*")
.order(
"created_at",
{
ascending:false
}
);




let box =
document
.getElementById("news-list");



box.innerHTML="";




if(!data.length){


box.innerHTML=
"Новостей пока нет";


return;


}





data.forEach(n=>{


box.innerHTML+=


`

<div class="empty-card">

<h3>
${n.title}
</h3>

<p>
${n.text}
</p>

</div>

`;


});



}









// =====================================
// CHAT
// =====================================



async function loadMessages(){


const {

data

}=


await client
.from("messages")
.select("*")
.order(
"created_at",
{
ascending:true
}
);




let box =
document
.getElementById("messages");



box.innerHTML="";



data.forEach(m=>{


box.innerHTML+=


`

<div>

<b>
${m.nickname}
</b>

:

${m.text}


</div>


`;


});



}







document
.getElementById("send-message")
.onclick=async()=>{


let input =
document
.getElementById("message-text");



let text =
input.value.trim();



if(!text)
return;




let profile =
await client
.from("profiles")
.select("nickname")
.eq(
"id",
user.id
)
.single();





await client
.from("messages")
.insert({

user_id:user.id,

nickname:
profile.data.nickname,

text:text


});




input.value="";



};








function startRealtime(){


client

.channel("messages")

.on(

"postgres_changes",

{

event:"INSERT",

schema:"public",

table:"messages"

},

()=>{


loadMessages();


}

)

.subscribe();


}







// START


checkSession();
