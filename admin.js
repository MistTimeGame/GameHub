/*
=================================================
ADMIN PANEL SYSTEM v2.0.0
=================================================
*/


let adminUser = null;







document.addEventListener(
"DOMContentLoaded",
async()=>{


const {

data

}=await supabaseClient.auth.getSession();



if(!data.session){


alert(
"Необходимо войти"
);


location.href="index.html";


return;


}



adminUser =
data.session.user;



await checkAdmin();



});









/*
=========================
CHECK ADMIN
=========================
*/


async function checkAdmin(){



const {

data,

error

}=await supabaseClient

.from("profiles")

.select("platform_role")

.eq(
"id",
adminUser.id
)

.single();





if(error || !data){


alert(
"Профиль не найден"
);


return;


}





if(

data.platform_role !== "owner"

){


alert(
"Нет доступа"
);


location.href="index.html";


return;


}




loadGamesAdmin();

loadUsersAdmin();

loadGuildsAdmin();



}









/*
=========================
GAMES
=========================
*/


async function loadGamesAdmin(){



const {

data

}=await supabaseClient

.from("games")

.select("*")

.order(
"created_at",
{
ascending:false
}
);




let html="";




(data||[])

.forEach(g=>{


html+=`

<div class="admin-item">


<div>


<b>

${g.name}

</b>


<br>


<span class="status-${g.status}">

${g.status}

</span>


</div>





<div>


<button onclick="toggleGame('${g.id}','${g.status}')">

Изменить статус

</button>



<button onclick="deleteGame('${g.id}')">

Удалить

</button>



</div>


</div>

`;



});





gamesAdminList.innerHTML=html;



}





async function toggleGame(id,status){



let newStatus =

status==="published"

?

"hidden"

:

"published";





await supabaseClient

.from("games")

.update({

status:newStatus

})

.eq(
"id",
id
);





loadGamesAdmin();



}







async function deleteGame(id){



if(!confirm(
"Удалить игру?"
))

return;




await supabaseClient

.from("games")

.delete()

.eq(
"id",
id
);



loadGamesAdmin();


}









/*
=========================
USERS
=========================
*/


async function loadUsersAdmin(){



const {

data

}=await supabaseClient

.from("profiles")

.select("*")

.order(
"created_at",
{
ascending:false
}
);




let html="";





(data||[])

.forEach(u=>{



html+=`

<div class="admin-item">


<div>


<b>

${u.display_name || u.username}

</b>


<br>


Роль:
${u.platform_role}


</div>


</div>

`;



});




usersAdminList.innerHTML=html;


}









/*
=========================
GUILDS
=========================
*/


async function loadGuildsAdmin(){



const {

data

}=await supabaseClient

.from("guilds")

.select("*")

.order(
"created_at",
{
ascending:false
}
);




let html="";





(data||[])

.forEach(g=>{


html+=`

<div class="admin-item">


<div>


<b>

${g.name}

</b>


<br>


${g.tag || ""}


</div>




<button onclick="deleteGuild('${g.id}')">

Удалить

</button>



</div>

`;



});




guildsAdminList.innerHTML=html;


}





async function deleteGuild(id){



if(!confirm(
"Удалить гильдию?"
))

return;



await supabaseClient

.from("guilds")

.delete()

.eq(
"id",
id
);



loadGuildsAdmin();


}









/*
=========================
MODULES
=========================
*/


async function loadModuleGames(){



const {

data

}=await supabaseClient

.from("games")

.select("id,name");





moduleGame.innerHTML="";





(data||[])

.forEach(g=>{


moduleGame.innerHTML +=`

<option value="${g.id}">

${g.name}

</option>


`;



});


}




async function addModule(){



const game =
moduleGame.value;



const name =
moduleName.value;



const description =
moduleDescription.value;



const json =
moduleJson.value;





const {

error

}=await supabaseClient

.from("game_modules")

.insert({


game_id:game,


name:name,


description:description,


module_data:{

json:json

}


});





if(error){


alert(error.message);


return;


}




alert(
"Модуль добавлен"
);



}



loadModuleGames();