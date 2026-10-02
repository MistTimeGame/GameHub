let currentUser = null;

let guildId = null;



document.addEventListener(
"DOMContentLoaded",
async()=>{


console.log(
"Проверяем авторизацию..."
);



currentUser =
await requireAuth();



if(!currentUser){

return;

}



console.log(
"Пользователь:",
currentUser.id
);



const params =
new URLSearchParams(
window.location.search
);



guildId =
params.get("id");



console.log(
"Guild ID:",
guildId
);



if(!guildId){

alert(
"Нет ID гильдии"
);

return;

}



await loadGuild();



});





async function loadGuild(){


const {
data,
error
}=await supabaseClient
.from("guilds")
.select("*")
.eq("id",guildId)
.single();



if(error){

console.error(error);


document.body.innerHTML =
`
<h2>
Не удалось открыть гильдию
</h2>

<p>
${error.message}
</p>
`;


return;

}



document
.getElementById(
"guildName"
)
.innerText=data.name;



document
.getElementById(
"guildDescription"
)
.innerText=data.description || "";



document
.getElementById(
"aboutText"
)
.innerText=data.description || "";



loadMembers();

loadNews();

loadGallery();

loadDocuments();

loadRelations();

loadApplications();


}






async function loadMembers(){


const {
data,
error
}=await supabaseClient
.from("guild_members")
.select("*")
.eq("guild_id",guildId);



if(error){

console.log(error);
return;

}



let html="";



data.forEach(m=>{


html +=
`
<div>

<b>
${m.nickname}
</b>

<br>

Роль:
${m.role}

</div>
<hr>

`;

});



document
.getElementById(
"membersList"
)
.innerHTML=html;


}







async function loadNews(){


const {
data
}=await supabaseClient
.from("guild_news")
.select("*")
.eq("guild_id",guildId)
.order(
"created_at",
{
ascending:false
}
);



let html="";



(data||[])
.forEach(n=>{


html+=
`
<h3>
${n.title}
</h3>

<p>
${n.content}
</p>

<hr>
`;

});



document
.getElementById(
"newsList"
)
.innerHTML=html;


}








async function loadGallery(){


const {
data
}=await supabaseClient
.from("guild_gallery")
.select("*")
.eq("guild_id",guildId);



let html="";



(data||[])
.forEach(g=>{


html+=
`
<img 
src="${g.image_url}"
width="200">

`;

});


document
.getElementById(
"galleryList"
)
.innerHTML=html;


}








async function loadDocuments(){


const {
data
}=await supabaseClient
.from("guild_documents")
.select("*")
.eq("guild_id",guildId);



let html="";



(data||[])
.forEach(d=>{


html+=
`
<p>
${d.name}
</p>
`;

});


document
.getElementById(
"documentsList"
)
.innerHTML=html;


}








async function loadRelations(){


const {
data
}=await supabaseClient
.from("guild_relations")
.select("*")
.or(
`guild_a_id.eq.${guildId},guild_b_id.eq.${guildId}`
);



let html="";


(data||[])
.forEach(r=>{


html+=
`
<p>
${r.relation_type}
:
${r.status}
</p>
`;

});



document
.getElementById(
"relationsList"
)
.innerHTML=html;


}








async function loadApplications(){


const {
data
}=await supabaseClient
.from("guild_applications")
.select("*")
.eq("guild_id",guildId);



let html="";



(data||[])
.forEach(a=>{


html+=
`
<p>
${a.nickname}
-
${a.status}
</p>
`;

});



document
.getElementById(
"applicationsList"
)
.innerHTML=html;


}








function showSection(id){


document
.querySelectorAll(
"main section"
)
.forEach(s=>{


s.hidden=true;


});



document
.getElementById(id)
.hidden=false;


}
