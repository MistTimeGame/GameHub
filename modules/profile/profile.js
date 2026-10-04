import { supabase } from "../../supabase/config.js";


const avatarDefault =
"https://cdn-icons-png.flaticon.com/512/4712/4712109.png";



async function loadProfile(){


    const {
        data:{
            user
        }
    } = await supabase.auth.getUser();



    if(!user){

        console.log("Пользователь не вошел");

        return;

    }



    const {
        data,
        error
    } = await supabase
        .from("profiles")
        .select("*")
        .eq("id",user.id)
        .single();



    if(error){

        console.log(error);

        return;

    }



    document.getElementById("nickname").value =
        data.nickname || "";


    document.getElementById("age").value =
        data.age || "";


    document.getElementById("city").value =
        data.city || "";


    document.getElementById("avatar").value =
        data.avatar_url || "";



    updateView(data);


}





function updateView(data){


    document.getElementById("profile-nickname")
    .innerText =
    data.nickname || "Игрок";



    document.getElementById("profile-avatar")
    .src =
    data.avatar_url || avatarDefault;



    let vip =
    data.vip_level || 1;



    const roman = [

        "",
        "I",
        "II",
        "III",
        "IV",
        "V",
        "VI",
        "VII",
        "VIII",
        "IX",
        "X",
        "XI",
        "XII"

    ];



    document.getElementById("profile-vip")
    .innerText =
    "VIP " + roman[vip];

}





document
.getElementById("save-profile")
.addEventListener(
"click",
async()=>{


    const {
        data:{
            user
        }
    } = await supabase.auth.getUser();



    if(!user){

        alert(
        "Сначала войдите"
        );

        return;

    }



    const profile = {


        id:user.id,


        nickname:
        document.getElementById("nickname").value,


        age:
        Number(
        document.getElementById("age").value
        ),


        city:
        document.getElementById("city").value,


        avatar_url:
        document.getElementById("avatar").value || avatarDefault



    };




    const {
        error
    } = await supabase
    .from("profiles")
    .upsert(profile);



    if(error){

        alert(error.message);

        console.log(error);

        return;

    }



    alert(
    "Профиль сохранен"
    );


    loadProfile();


});





loadProfile();
