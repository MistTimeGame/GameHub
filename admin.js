/*
=================================================
GAME GUILD PLATFORM
ADMIN PANEL v2.0.0
=================================================
*/


let adminUser = null;







document.addEventListener(
"DOMContentLoaded",
async()=>{


await checkAdmin();



});









/*
=================================================
CHECK ADMIN
=================================================
*/


async function checkAdmin(){



const {

data,

error

}=await supabaseClient.auth.getSession();






if(error || !data.session){


showDenied();


return;


}





adminUser =
data.session.user;







const {

data:profile,

error:profileError

}=await supabaseClient

.from("profiles")

.select("*")

.eq(
"id",
adminUser.id
)

.single();








console.log(
"PROFILE",
profile,
profileError
);







if(

profileError ||

!profile ||

profile.platform_role !== "owner"

){



showDenied();



return;



}








document
.getElementById(
"adminPanel"
)
.hidden=false;





loadGamesAdmin();



}









function showDenied(){



document
.getElementById(
"accessDenied"
)
.hidden=false;



}









/*
=================================================
GAMES
=================================================
*/


async function loadGamesAdmin(){



const {

data,

error

}=await supabaseClient

.from("games")

.select("*")

.order(

"created_at",

{

ascending:false

}

);







const box =

document
.getElementById(
"gamesAdmin"
);






if(error){


box.innerHTML =
error.message;


return;


}







box.innerHTML="";







data.forEach(game=>{





box.innerHTML += `


<div class="admin-item">



${

game.logo_url

?

`

<img src="${game.logo_url}">

`

:

""

}




<div class="admin-info">


<h3>

${game.name}

</h3>



<p>

${game.description || ""}

</p>




<p>

Статус:

<span class="${

game.status==="published"

?

"status-public"

:

"status-hidden"

}">


${game.status}


</span>

</p>



</div>







<div class="admin-actions">



<button onclick="toggleGame('${game.id}','${game.status}')">


${

game.status==="published"

?

"Скрыть"

:

"Опубликовать"

}



</button>




<button onclick="deleteGame('${game.id}')">


Удалить

</button>




</div>




</div>


`;



});



}









async function toggleGame(id,status){



let newStatus =


status==="published"

?

"hidden"

:

"published";







const {

error

}=await supabaseClient

.from("games")

.update({

status:newStatus

})

.eq(
"id",
id
);







if(error){


alert(error.message);


return;


}



loadGamesAdmin();



}









async function deleteGame(id){



if(!confirm(
"Удалить игру?"
))


return;






const {

error

}=await supabaseClient

.from("games")

.delete()

.eq(
"id",
id
);








if(error){


alert(error.message);


return;


}





loadGamesAdmin();



}









/*
=================================================
USERS
=================================================
*/


async function loadUsers(){



const {

data,

error

}=await supabaseClient

.from("profiles")

.select("*")

.order(
"created_at",
{
ascending:false
}
);






const box =

document
.getElementById(
"usersAdmin"
);







if(error){


box.innerHTML =
error.message;


return;


}






box.innerHTML="";







data.forEach(user=>{



box.innerHTML += `


<div class="admin-item">


<div class="admin-info">


<h3>

${user.display_name || user.username || "Без имени"}

</h3>


<p>

Роль:
${user.platform_role}

</p>


</div>



</div>


`;



});



}









/*
=================================================
GUILDS
=================================================
*/


async function loadGuilds(){



const {

data,

error

}=await supabaseClient

.from("guilds")

.select("*")

.order(

"created_at",

{

ascending:false

}

);







const box =

document
.getElementById(
"guildsAdmin"
);







if(error){


box.innerHTML =
error.message;


return;


}







box.innerHTML="";






data.forEach(guild=>{



box.innerHTML += `


<div class="admin-item">



<div class="admin-info">


<h3>

${guild.name}

[${guild.tag || ""}]

</h3>



<p>

${guild.description || ""}

</p>



</div>



</div>


`;



});



}
