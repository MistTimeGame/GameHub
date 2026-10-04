// =================================================
// GAME PLATFORM
// app.js
// PART 1 / 3
// AUTH + START
// =================================================



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





// =================================================
// START
// =================================================


document.addEventListener(
"DOMContentLoaded",
()=>{


console.log(
"GAME PLATFORM START"
);



initAuth();


initNavigation();


initChat();


initConference();



checkSession();



});









// =================================================
// SESSION
// =================================================


async function checkSession(){


try{


const session =
await supabaseClient
.auth
.getSession();



if(
session.data.session
){


currentUser =
session.data.session.user;



console.log(
"USER LOGIN",
currentUser
);



openApp();



}



}
catch(error){


console.error(
"SESSION ERROR",
error
);


}



}









// =================================================
// OPEN APPLICATION
// =================================================


async function openApp(){



const auth =
document.getElementById(
"auth-screen"
);


const app =
document.getElementById(
"app"
);




if(auth){

auth.classList.add(
"hidden"
);

}



if(app){

app.classList.remove(
"hidden"
);

}




console.log(
"APPLICATION OPEN"
);





try{

await loadProfile();

}
catch(e){

console.error(
"PROFILE ERROR",
e
);

}




try{

await loadNews();

}
catch(e){

console.error(
"NEWS ERROR",
e
);

}



try{

await loadMessages();

}
catch(e){

console.error(
"CHAT LOAD ERROR",
e
);

}




try{

await loadRooms();

}
catch(e){

console.error(
"ROOM LOAD ERROR",
e
);

}



}









// =================================================
// AUTH
// =================================================


function initAuth(){



const loginTab =
document.getElementById(
"login-tab"
);



const registerTab =
document.getElementById(
"register-tab"
);




if(loginTab){


loginTab.onclick=()=>{


loginTab.classList.add(
"active"
);



registerTab.classList.remove(
"active"
);



document
.getElementById(
"login-form"
)
.classList.remove(
"hidden"
);



document
.getElementById(
"register-form"
)
.classList.add(
"hidden"
);



};



}






if(registerTab){


registerTab.onclick=()=>{


registerTab.classList.add(
"active"
);



loginTab.classList.remove(
"active"
);




document
.getElementById(
"register-form"
)
.classList.remove(
"hidden"
);



document
.getElementById(
"login-form"
)
.classList.add(
"hidden"
);



};



}









// LOGIN

const loginForm =
document.getElementById(
"login-form"
);



if(loginForm){


loginForm.onsubmit =
async(e)=>{


e.preventDefault();




const email =
document
.getElementById(
"login-email"
)
.value;



const password =
document
.getElementById(
"login-password"
)
.value;






const result =
await supabaseClient
.auth
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



}









// REGISTER


const registerForm =
document.getElementById(
"register-form"
);



if(registerForm){


registerForm.onsubmit =
async(e)=>{


e.preventDefault();




const nickname =
document
.getElementById(
"register-nickname"
)
.value;



const email =
document
.getElementById(
"register-email"
)
.value;



const password =
document
.getElementById(
"register-password"
)
.value;






const result =
await supabaseClient
.auth
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





const user =
result.data.user;





if(!user){


alert(
"Ошибка создания аккаунта"
);


return;


}






const profile =
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


console.error(
profile.error
);



alert(
"Аккаунт создан, но профиль не создан"
);



return;


}





alert(
"Регистрация завершена"
);



};



}






}
// =================================================
// PART 2 / 3
// NAVIGATION + PROFILE + NEWS + CHAT
// =================================================






// =================================================
// NAVIGATION
// =================================================


function initNavigation(){



const buttons =
document.querySelectorAll(
".menu-button"
);



buttons.forEach(button=>{


button.onclick=()=>{


buttons.forEach(
b=>b.classList.remove("active")
);



button.classList.add(
"active"
);




document
.querySelectorAll(".page")
.forEach(page=>{

page.classList.remove(
"active"
);

});




const target =
document.getElementById(
button.dataset.page
);



if(target){

target.classList.add(
"active"
);

}



};



});



}









// =================================================
// PROFILE
// =================================================


async function loadProfile(){



if(!currentUser){

return;

}





let result =
await supabaseClient
.from("profiles")
.select("*")
.eq(
"id",
currentUser.id
)
.maybeSingle();






if(
!result.data
){



console.log(
"PROFILE CREATE"
);




await supabaseClient
.from("profiles")
.insert({

id:
currentUser.id,


nickname:
currentUser.email
.split("@")[0],


avatar_url:
"https://cdn-icons-png.flaticon.com/512/4712/4712109.png",


vip_level:0


});





return loadProfile();



}





const profile =
result.data;




const avatar =
profile.avatar_url ||
"https://cdn-icons-png.flaticon.com/512/4712/4712109.png";





const elements = [

["top-avatar",avatar],

["profile-avatar",avatar],

["side-avatar",avatar]

];




elements.forEach(item=>{


const el =
document.getElementById(
item[0]
);



if(el){

el.src =
item[1];

}



});






const names = [

"top-name",

"profile-name",

"side-name"

];



names.forEach(id=>{


const el =
document.getElementById(id);



if(el){

el.textContent =
profile.nickname;

}


});






const vip1 =
document.getElementById(
"vip-level"
);



if(vip1){

vip1.textContent =
"VIP " +
(profile.vip_level || 0);

}





const vip2 =
document.getElementById(
"side-vip"
);



if(vip2){

vip2.textContent =
"VIP " +
(profile.vip_level || 0);

}



}








// =================================================
// SAVE PROFILE
// =================================================


const saveProfile =
document.getElementById(
"save-profile"
);



if(saveProfile){



saveProfile.onclick =
async()=>{



await supabaseClient
.from("profiles")
.update({

avatar_url:

document
.getElementById(
"avatar-url"
)
.value,


city:

document
.getElementById(
"profile-city"
)
.value,


age:

document
.getElementById(
"profile-age"
)
.value


})
.eq(
"id",
currentUser.id
);




loadProfile();



};

}



 






// =================================================
// NEWS
// =================================================


async function loadNews(){



const box =
document.getElementById(
"news-list"
);



if(!box){

return;

}





const result =
await supabaseClient
.from("news")
.select("*")
.order(
"created_at",
{
ascending:false
}
);






box.innerHTML="";






if(
!result.data ||
result.data.length===0
){


box.innerHTML =
"Новостей пока нет";


return;


}





result.data.forEach(news=>{


box.innerHTML += `


<div class="empty-card">


<h3>

${news.title}

</h3>


<p>

${news.text}

</p>


</div>


`;



});



}









// =================================================
// CHAT
// =================================================



function initChat(){



const button =
document.getElementById(
"send-message"
);



if(!button){

return;

}




button.onclick =
async()=>{



const input =
document.getElementById(
"message-text"
);



const text =
input.value.trim();





if(!text){

return;

}





const profile =
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










async function loadMessages(){



const box =
document.getElementById(
"messages"
);



if(!box){

return;

}





const result =
await supabaseClient
.from("messages")
.select("*")
.order(
"created_at",
{
ascending:true
}
);





box.innerHTML="";





(result.data || [])
.forEach(message=>{



box.innerHTML += `


<div class="room-card">


<b>

${message.nickname}

</b>


<br>


${message.text}


</div>


`;



});



}









function startChatRealtime(){



supabaseClient

.channel(
"messages-channel"
)


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
// =================================================
// PART 3 / 3
// CONFERENCE + ONLINE ROOMS + LOGOUT
// =================================================






// =================================================
// CONFERENCE
// =================================================


function initConference(){


const leaveButton =
document.getElementById(
"leave-room"
);



if(leaveButton){


leaveButton.onclick =
async()=>{


await leaveRoom();


};



}



}









async function loadRooms(){



const box =
document.getElementById(
"rooms-list"
);



if(!box){

return;

}





const result =
await supabaseClient
.from("conference_rooms")
.select("*")
.order(
"id",
{
ascending:true
}
);





if(result.error){


console.log(
"ROOM ERROR",
result.error
);



box.innerHTML =
"Комнаты недоступны";


return;


}





box.innerHTML="";






for(
const room of result.data
){



const users =
await supabaseClient
.from("conference_users")
.select("*")
.eq(
"room_id",
room.id
);





let count = 0;



if(users.data){

count =
users.data.length;

}






box.innerHTML += `


<div class="room-card">


<h3>

${room.name}

</h3>



<p>

${room.description || ""}

</p>



<p>

👥 ${count}

</p>



<button

class="main-button"

onclick="joinRoom(${room.id}, '${room.name}')"

>

Войти

</button>



</div>


`;



}




}









async function joinRoom(
id,
name
){





if(!currentUser){

return;

}






if(currentRoom){

await leaveRoom();

}






currentRoom =
id;







const title =
document.getElementById(
"current-room-title"
);



if(title){

title.textContent =
name;


}






const profile =
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



if(
!currentRoom
){

return;

}






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







currentRoom =
null;






const title =
document.getElementById(
"current-room-title"
);



if(title){

title.textContent =
"Комната не выбрана";

}




loadRooms();



}









function startConferenceRealtime(){



supabaseClient

.channel(
"conference-channel"
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











// =================================================
// LOGOUT
// =================================================



const logout =
document.getElementById(
"logout"
);





if(logout){


logout.onclick =
async()=>{


if(currentRoom){


await leaveRoom();


}



await supabaseClient
.auth
.signOut();





location.reload();



};



}









// =================================================
// END APP.JS
// =================================================
