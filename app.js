// ==========================================
// GAME PLATFORM APP
// AUTH + CHAT + CONFERENCE ROOMS
// ==========================================



const SUPABASE_URL =
"https://uvzaoobtysostmfwyfxm.supabase.co";


const SUPABASE_KEY =
"sb_publishable_-7M1kuwWOeRq21SfrLiojg_0qngL_7s";



const db =
supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);




let currentUser = null;

let currentRoom = null;







// ==========================================
// START
// ==========================================


document.addEventListener(
"DOMContentLoaded",
()=>{


checkSession();


setupAuth();


setupNavigation();


setupChat();


setupConference();


}
);









// ==========================================
// SESSION
// ==========================================


async function checkSession(){


const {

data

}=

await db.auth.getSession();



if(data.session){


currentUser =
data.session.user;


openApp();


}



}









// ==========================================
// OPEN APP
// ==========================================


function openApp(){


document
.getElementById("auth-screen")
.classList.add("hidden");



document
.getElementById("app")
.classList.remove("hidden");



loadProfile();

loadNews();

loadMessages();

loadRooms();


startChatRealtime();

startConferenceRealtime();



}









// ==========================================
// AUTH
// ==========================================


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
.onsubmit=async e=>{


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
await db.auth
.signInWithPassword({

email,
password

});




if(result.error){


alert(result.error.message);

return;

}



currentUser =
result.data.user;


openApp();



};








// REGISTER


document
.getElementById("register-form")
.onsubmit=async e=>{


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
await db.auth.signUp({

email,
password

});





if(result.error){


alert(result.error.message);

return;

}



let uid =
result.data.user.id;







let profile =
await db
.from("profiles")
.insert({

id:uid,

nickname:nickname,

avatar_url:
"https://cdn-icons-png.flaticon.com/512/4712/4712109.png",

vip_level:0


});






if(profile.error){


alert(profile.error.message);

return;

}



alert(
"Аккаунт создан"
);



};





// LOGOUT


document
.getElementById("logout")
.onclick=async()=>{


if(currentRoom){

await leaveRoom();

}



await db.auth.signOut();


location.reload();


};











// ==========================================
// NAVIGATION
// ==========================================


function setupNavigation(){


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
.forEach(p=>
p.classList.remove("active")
);



document
.getElementById(
btn.dataset.page
)
.classList.add("active");



};


});


}









// ==========================================
// PROFILE
// ==========================================


async function loadProfile(){



let result =
await db
.from("profiles")
.select("*")
.eq(
"id",
currentUser.id
)
.single();




if(result.error){

console.log(result.error);

return;

}



let p =
result.data;




let avatar =
p.avatar_url ||
"https://cdn-icons-png.flaticon.com/512/4712/4712109.png";




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


await db
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









// ==========================================
// NEWS
// ==========================================


async function loadNews(){


let result =
await db
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



if(!result.data ||
result.data.length===0){


box.innerHTML=
"Новостей нет";


return;


}




result.data.forEach(n=>{


box.innerHTML+=`

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









// ==========================================
// CHAT
// ==========================================


async function loadMessages(){


let result =
await db
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



result.data.forEach(m=>{


box.innerHTML+=`

<div class="room-card">

<b>${m.nickname}</b>

<br>

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
await db
.from("profiles")
.select("nickname")
.eq(
"id",
currentUser.id
)
.single();






await db
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









function startChatRealtime(){


db.channel("chat")

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











// ==========================================
// CONFERENCE ROOMS
// ==========================================


async function loadRooms(){


let rooms =
await db
.from("conference_rooms")
.select("*");





let box =
document
.getElementById("rooms-list");



box.innerHTML="";




for(let room of rooms.data){



let users =
await db
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
${room.description}
</p>



<p>
👥 ${users.data.length}
</p>



<button
class="main-button"
onclick="joinRoom(${room.id},'${room.name}')"
>

Войти

</button>


</div>


`;



}


}









async function joinRoom(id,name){



await leaveRoom();



currentRoom=id;



document
.getElementById(
"current-room-title"
)
.textContent=name;





let profile =
await db
.from("profiles")
.select("nickname")
.eq(
"id",
currentUser.id
)
.single();





await db
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



await db
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


document
.getElementById(
"current-room-title"
)
.textContent=
"Комната не выбрана";


loadRooms();


}






document
.getElementById("leave-room")
.onclick=
leaveRoom;









function startConferenceRealtime(){


db.channel(
"conference"
)


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
