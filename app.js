// =====================================================
// GAME PLATFORM
// app.js
// VERSION CHAT FIX
// PART 1 / 3
// =====================================================



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






// =====================================================
// START
// =====================================================


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









// =====================================================
// SESSION
// =====================================================


async function checkSession(){


try{


const {

data

}=

await supabaseClient
.auth
.getSession();





if(
data.session
){


currentUser =
data.session.user;



console.log(
"SESSION USER",
currentUser.id
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









// =====================================================
// OPEN APP
// =====================================================


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
"APP OPEN"
);





await safeRun(
loadProfile
);



await safeRun(
loadNews
);



await safeRun(
loadMessages
);



startChatRealtime();



await safeRun(
loadRooms
);



startConferenceRealtime();



}









async function safeRun(fn){


try{


await fn();


}

catch(error){


console.error(
fn.name,
error
);


}


}









// =====================================================
// AUTH
// =====================================================


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



if(registerTab){

registerTab.classList.remove(
"active"
);

}




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



if(loginTab){

loginTab.classList.remove(
"active"
);

}





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









// -------------------------
// LOGIN
// -------------------------


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
"Нет пользователя"
);


return;


}





openApp();



};



}









// -------------------------
// REGISTER
// -------------------------


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


console.log(
profile.error
);



alert(
"Пользователь создан, профиль ошибка"
);



return;


}




alert(
"Регистрация успешна"
);



};



}
// =====================================================
// PART 2 / 3
// PROFILE + NEWS + CHAT
// =====================================================






// =====================================================
// NAVIGATION
// =====================================================


function initNavigation(){



const buttons =
document.querySelectorAll(
".menu-button"
);



buttons.forEach(button=>{



button.onclick=()=>{


buttons.forEach(b=>{

b.classList.remove(
"active"
);

});



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





const page =
document.getElementById(
button.dataset.page
);



if(page){

page.classList.add(
"active"
);

}



};



});



}









// =====================================================
// PROFILE
// =====================================================


async function loadProfile(){



if(!currentUser){

console.log(
"NO USER PROFILE"
);

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







if(result.error){


console.error(
"PROFILE SELECT ERROR",
result.error
);


return;


}







if(!result.data){



console.log(
"PROFILE CREATE"
);





const create =
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





if(create.error){


console.error(
"PROFILE INSERT ERROR",
create.error
);


return;


}





return loadProfile();


}








const profile =
result.data;





setText(
"top-name",
profile.nickname
);


setText(
"profile-name",
profile.nickname
);



setText(
"side-name",
profile.nickname
);





setText(
"vip-level",
"VIP " +
(profile.vip_level || 0)
);




setText(
"side-vip",
"VIP " +
(profile.vip_level || 0)
);







setImage(
"top-avatar",
profile.avatar_url
);


setImage(
"profile-avatar",
profile.avatar_url
);


setImage(
"side-avatar",
profile.avatar_url
);



}








function setText(id,text){


const el =
document.getElementById(id);



if(el){

el.textContent=text;

}


}





function setImage(id,url){


const el =
document.getElementById(id);



if(el){

el.src=url;

}


}









// =====================================================
// SAVE PROFILE
// =====================================================


const saveProfile =
document.getElementById(
"save-profile"
);



if(saveProfile){



saveProfile.onclick =
async()=>{



const update =
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





if(update.error){


console.error(
update.error
);


return;


}



loadProfile();



};


}









// =====================================================
// NEWS
// =====================================================


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






if(result.error){


console.log(
"NEWS ERROR",
result.error
);


return;


}





box.innerHTML="";






if(
!result.data ||
result.data.length===0
){


box.innerHTML =
"Новостей пока нет";


return;


}







result.data.forEach(item=>{


box.innerHTML += `

<div class="news-item">

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









// =====================================================
// CHAT
// =====================================================


function initChat(){



const button =
document.getElementById(
"send-message"
);



if(!button){


console.log(
"SEND BUTTON NOT FOUND"
);


return;


}





button.onclick =
sendMessage;



}









async function sendMessage(){



if(!currentUser){


alert(
"Нет авторизации"
);


return;


}






const input =
document.getElementById(
"message-text"
);



if(!input){

return;

}





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





if(profile.error){


console.error(
"profile chat error",
profile.error
);


return;


}







const result =
await supabaseClient
.from("messages")
.insert({

user_id:
currentUser.id,


nickname:
profile.data.nickname,


text:text


});








if(result.error){


console.error(
"MESSAGE INSERT ERROR",
result.error
);



alert(
"Ошибка отправки сообщения"
);



return;


}






input.value="";



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






if(result.error){


console.error(
"MESSAGES LOAD ERROR",
result.error
);


return;


}






box.innerHTML="";





result.data.forEach(message=>{



box.innerHTML += `

<div class="chat-message">

<b>
${message.nickname}
</b>

<br>

${message.text}

<small>
${new Date(message.created_at)
.toLocaleTimeString()}
</small>


</div>

`;



});



box.scrollTop =
box.scrollHeight;



}









function startChatRealtime(){



supabaseClient

.channel(
"public-messages"
)


.on(

"postgres_changes",

{

event:"INSERT",

schema:"public",

table:"messages"

},


(payload)=>{


console.log(
"NEW MESSAGE",
payload
);



loadMessages();



}


)


.subscribe();



}
     // =====================================================
// PART 3 / 3
// CONFERENCE + WEBRTC + LOGOUT
// =====================================================



let localStream = null;

let screenStream = null;

let peers = {};

let microphoneEnabled = false;








// =====================================================
// CONFERENCE INIT
// =====================================================


function initConference(){



const mic =
document.getElementById(
"mic-button"
);



if(mic){


mic.onclick =
toggleMicrophone;


}





const screen =
document.getElementById(
"screen-button"
);



if(screen){


screen.onclick =
shareScreen;


}





const leave =
document.getElementById(
"leave-room"
);



if(leave){


leave.onclick =
leaveRoom;


}



}









// =====================================================
// LOAD ROOMS
// =====================================================


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
"id"
);






if(result.error){


console.log(
"ROOM ERROR",
result.error
);



box.innerHTML =
"Нет комнат";


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





let count =
0;



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
onclick="joinRoom('${room.id}')"
>

Войти

</button>


</div>


`;



}



}









// =====================================================
// JOIN ROOM
// =====================================================


async function joinRoom(id){



if(!currentUser){

return;

}



currentRoom=id;







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





await startMedia();



loadRooms();



}









// =====================================================
// MEDIA
// =====================================================


async function startMedia(){



try{



localStream =
await navigator
.mediaDevices
.getUserMedia({

audio:true,

video:false

});





microphoneEnabled=true;



updateMicButton();



console.log(
"MIC START"
);



}

catch(error){


console.error(
"MIC ERROR",
error
);



alert(
"Нет доступа к микрофону"
);



}



}









// =====================================================
// MICROPHONE
// =====================================================


function toggleMicrophone(){



if(!localStream){

return;

}





const audio =
localStream
.getAudioTracks()[0];





if(audio){



audio.enabled =
!audio.enabled;



microphoneEnabled =
audio.enabled;



updateMicButton();



}



}









function updateMicButton(){



const button =
document.getElementById(
"mic-button"
);



if(!button){

return;

}





if(microphoneEnabled){


button.textContent =
"🎤 Микрофон выключить";


}

else{


button.textContent =
"🔇 Микрофон включить";


}



}









// =====================================================
// SCREEN SHARE
// =====================================================


async function shareScreen(){



try{



screenStream =
await navigator
.mediaDevices
.getDisplayMedia({

video:true

});





console.log(
"SCREEN START"
);





screenStream
.getTracks()[0]
.onended=()=>{


screenStream=null;


};





}

catch(error){


console.log(
"SCREEN CANCEL",
error
);


}



}









// =====================================================
// LEAVE ROOM
// =====================================================


async function leaveRoom(){



if(!currentRoom){

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






if(localStream){


localStream
.getTracks()
.forEach(
track=>track.stop()
);


}



if(screenStream){


screenStream
.getTracks()
.forEach(
track=>track.stop()
);


}






localStream=null;

screenStream=null;



currentRoom=null;



loadRooms();



}









// =====================================================
// CONFERENCE REALTIME
// =====================================================


function startConferenceRealtime(){



supabaseClient

.channel(
"conference-users"
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









// =====================================================
// LOGOUT
// =====================================================


const logout =
document.getElementById(
"logout"
);



if(logout){


logout.onclick =
async()=>{



await leaveRoom();



await supabaseClient
.auth
.signOut();



location.reload();



};


}






// =====================================================
// END APP.JS
// =====================================================
