const loginForm =
document.getElementById(
"loginForm"
);


const registerForm =
document.getElementById(
"registerForm"
);



document
.getElementById(
"showLogin"
)
.onclick=()=>{


loginForm.style.display="block";

registerForm.style.display="none";


};



document
.getElementById(
"showRegister"
)
.onclick=()=>{


loginForm.style.display="none";

registerForm.style.display="block";


};





document
.getElementById(
"registerSubmit"
)
.onclick=
async()=>{


const nickname =
document.getElementById(
"regNickname"
).value;


const email =
document.getElementById(
"regEmail"
).value;


const password =
document.getElementById(
"regPassword"
).value;



const {
data,
error
}=await supabaseClient.auth.signUp({

email,

password

});



if(error){

showMessage(
error.message
);

return;

}



await supabaseClient
.from("profiles")
.insert({

id:data.user.id,

nickname:nickname


});



showMessage(
"Аккаунт создан"
);



};





document
.getElementById(
"loginSubmit"
)
.onclick=
async()=>{


const email =
document.getElementById(
"loginEmail"
).value;


const password =
document.getElementById(
"loginPassword"
).value;



const {

data,

error

}=await supabaseClient.auth.signInWithPassword({

email,

password

});



if(error){

showMessage(
error.message
);

return;

}



showMessage(
"Вход выполнен"
);



setTimeout(()=>{

location.reload();

},1000);



};






function showMessage(text){

document.getElementById(
"authMessage"
).innerText=text;

}
