/*
==================================
GAME PLATFORM CORE
VERSION 1.1.0
==================================
*/


let games=[];


let user=null;







document.addEventListener(
"DOMContentLoaded",
()=>{


loadGames();


});









function openAuth(){


document
.getElementById("authWindow")
.hidden=false;


}









function openAddGame(){


document
.getElementById("addGame")
.hidden=false;


}









function register(){



let name=

document
.getElementById("nickname")
.value;



let email=

document
.getElementById("regEmail")
.value;



alert(

"Регистрация пользователя: "

+

name

+

"\n"

+

email

);



}









function login(){



let email=

document
.getElementById("email")
.value;




user={

email:email

};




document
.getElementById("userPanel")
.innerHTML=

`

<button>

${email}

</button>

`;




document
.getElementById("authWindow")
.hidden=true;



}









function createGame(){



let game={



id:Date.now(),



name:

document
.getElementById("gameName")
.value,



description:

document
.getElementById("gameDescription")
.value,



image:

document
.getElementById("gameImage")
.value



};





games.push(game);



renderGames();



}









function loadGames(){


renderGames();


}









function renderGames(list=games){



let box=

document
.getElementById("gamesList");




box.innerHTML="";





list.forEach(game=>{



box.innerHTML+=`


<div class="game-card">


${

game.image

?

`<img src="${game.image}">`

:

""

}



<h3>

${game.name}

</h3>


<p>

${game.description}

</p>


</div>


`;



});



}









function searchGames(){



let text=

document
.getElementById("search")
.value
.toLowerCase();





let result=

games.filter(

game=>

game.name
.toLowerCase()
.includes(text)

);



renderGames(result);



}
