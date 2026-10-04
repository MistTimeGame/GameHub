// =============================================
// GAME PLATFORM
// APP.JS
// AUTH + PROFILE + NEWS + CHAT + CONFERENCE
// =============================================



const SUPABASE_URL =
"https://uvzaoobtysostmfwyfxm.supabase.co";


const SUPABASE_KEY =
"sb_publishable_-7M1kuwWOeRq21SfrLiojg_0qngL_7s";



const supabaseClient =
supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);



let currentUser = null;

let currentRoom = null;



// =============================================
// START
// =============================================


document.addEventListener(
"DOMContentLoaded",
async()=>{


setupAuth();

setupNavigation();

setupChat();

setupConference();

await checkSession();


});







// =============================================
// SESSION
// =============================================


async function checkSession(){


try{


const {

data

}=

await supabaseClient.auth.getSession();



if(data.session){


currentUser =
data.session.user;



openApp();


}


}
catch(error){


console.log(error);


}



}







// =============================================
// OPEN APP
// =============================================


async function openApp(){



document
.getElementById("auth-screen")
.classList.add("hidden");



document
.getElementById("app")
.classList.remove("hidden");





try{

await loadProfile();

}
catch(e){

console.log(
"PROFILE:",
e
);

}



try{

await loadNews();

}
catch(e){

console.log(
"NEWS:",
e
);

}



try{

await loadMessages();

startChatRealtime();

}
catch(e){

console.log(
"CHAT:",
e
);

}



try{

await loadRooms();

startConferenceRealtime();

}
catch(e){

console.log(
"CONFERENCE:",
e
);

}



}









// =============================================
// AUTH
// =============================================


function setupAuth(){



const loginTab =
document.getElementById(
"login-tab"
);


const registerTab =
document.getElementById(
"register-tab"
);





loginTab.onclick=()=>{


loginTab.classList.add("active");


registerTab.classList.remove("active");



document
.getElementById("login-form")
.classList.remove("hidden");



document
.getElementById("register-form")
.classList.add("hidden");


};






registerTab.onclick=()=>{


registerTab.classList.add("active");


loginTab.classList.remove("active");



document
.getElementById("register-form")
.classList.remove("hidden");



document
.getElementById("login-form")
.classList.add("hidden");


};










// LOGIN


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





let result =
await supabaseClient.auth
.signInWithPassword({

email,

password

});





if(result.error){


alert(
result.error.message
);


return;


}





currentUser =
result.data.user;



if(!currentUser){


alert(
"Пользователь не найден"
);


return;


}



openApp();



};









// REGISTER


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





let result =
await supabaseClient.auth
.signUp({

email,

password

});





if(result.error){


alert(
result.error.message
);


return;

}





let user =
result.data.user;



if(!user){

alert(
"Ошибка создания аккаунта"
);


return;


}





let profile =
await supabaseClient
.from("profiles")
.insert({

id:user.id,

nickname:nickname,

avatar_url:
"https://cdn-icons-png.flaticon.com/512/4712/4712109.png",

vip_level:0


});





if(profile.error){


console.log(
profile.error
);


alert(
"Аккаунт создан, но профиль не создан"
);


return;


}





alert(
"Аккаунт создан"
);



};











// =============================================
// NAVIGATION
// =============================================


function setupNavigation(){



document
.querySelectorAll(".menu-button")
.forEach(button=>{


button.onclick=()=>{


document
.querySelectorAll(".menu-button")
.forEach(b=>
b.classList.remove("active")
);



button.classList.add("active");




document
.querySelectorAll(".page")
.forEach(p=>
p.classList.remove("active")
);



let page =
document.getElementById(
button.dataset.page
);



if(page){

page.classList.add("active");

}



};


});


}









// =============================================
// PROFILE
// =============================================


async function loadProfile(){



if(!currentUser)
return;





let result =
await supabaseClient
.from("profiles")
.select("*")
.eq(
"id",
currentUser.id
)
.maybeSingle();






if(!result.data){



await supabaseClient
.from("profiles")
.insert({

id:currentUser.id,

nickname:
currentUser.email
.split("@")[0],

avatar_url:
"https://cdn-icons-png.flaticon.com/512/4712/4712109.png",

vip_level:0

});



return loadProfile();


}





let p=result.data;



let avatar =
p.avatar_url;






document
.getElementById("top-avatar")
.src=avatar;



document
.getElementById("profile-avatar")
.src=avatar;



document
.getElementById("side-avatar")
.src=avatar;





document
.getElementById("top-name")
.textContent=
p.nickname;



document
.getElementById("profile-name")
.textContent=
p.nickname;



document
.getElementById("side-name")
.textContent=
p.nickname;




document
.getElementById("vip-level")
.textContent=
"VIP "+p.vip_level;



document
.getElementById("side-vip")
.textContent=
"VIP "+p.vip_level;



}









document
.getElementById("save-profile")
.onclick=async()=>{


await supabaseClient
.from("profiles")
.update({

avatar_url:
document
.getElementById("avatar-url")
.value,


city:
document
.getElementById("profile-city")
.value,


age:
document
.getElementById("profile-age")
.value


})
.eq(
"id",
currentUser.id
);



loadProfile();


};









// =============================================
// NEWS
// =============================================


async function loadNews(){



let result =
await supabaseClient
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




if(!box)
return;



box.innerHTML="";



if(!result.data ||
result.data.length===0){


box.innerHTML=
"Новостей пока нет";


return;


}





result.data.forEach(item=>{


box.innerHTML+=`

<div class="empty-card">

<h3>
${item.title}
</h3>

<p>
${item.text}
</p>

</div>

`;



});


}









// =============================================
// CHAT
// =============================================


async function loadMessages(){



let result =
await supabaseClient
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



if(!box)
return;



box.innerHTML="";



(result.data || [])
.forEach(m=>{


box.innerHTML+=`

<div class="room-card">

<b>
${m.nickname}
</b>

<br>

${m.text}

</div>

`;


});


}







function setupChat(){



let button =
document
.getElementById("send-message");



if(!button)
return;



button.onclick=async()=>{



let input =
document
.getElementById("message-text");



let text =
input.value.trim();



if(!text)
return;





let profile =
await supabaseClient
.from("profiles")
.select("nickname")
.eq(
"id",
currentUser.id
)
.single();





await supabaseClient
.from("messages")
.insert({

user_id:
currentUser.id,

nickname:
profile.data.nickname,

text:text


});



input.value="";


};



}








function startChatRealtime(){


supabaseClient

.channel("chat")

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









// =============================================
// CONFERENCE ROOMS
// =============================================


async function loadRooms(){



let result =
await supabaseClient
.from("conference_rooms")
.select("*");





let box =
document
.getElementById("rooms-list");



if(!box)
return;



box.innerHTML="";




if(result.error){

box.innerHTML=
"Комнаты пока недоступны";


return;


}





for(let room of result.data){



let users =
await supabaseClient
.from("conference_users")
.select("*")
.eq(
"room_id",
room.id
);





box.innerHTML+=`

<div class="room-card">

<h3>
${room.name}
</h3>

<p>
${room.description || ""}
</p>

<p>
👥 ${(users.data || []).length}
</p>


<button
class="main-button"
onclick="joinRoom(${room.id})"
>

Войти

</button>


</div>

`;



}



}







async function joinRoom(id){


currentRoom=id;



let profile =
await supabaseClient
.from("profiles")
.select("nickname")
.eq(
"id",
currentUser.id
)
.single();





await supabaseClient
.from("conference_users")
.insert({

room_id:id,

user_id:
currentUser.id,

nickname:
profile.data.nickname


});



loadRooms();



}








async function leaveRoom(){



if(!currentRoom)
return;




await supabaseClient
.from("conference_users")
.delete()
.eq(
"user_id",
currentUser.id
)
.eq(
"room_id",
currentRoom
);



currentRoom=null;



loadRooms();


}




document
.getElementById("leave-room")
.onclick=
leaveRoom;








function setupConference(){



}



function startConferenceRealtime(){


supabaseClient

.channel("conference")

.on(

"postgres_changes",

{

event:"*",

schema:"public",

table:"conference_users"

},

()=>{


loadRooms();


}

)

.subscribe();



}
